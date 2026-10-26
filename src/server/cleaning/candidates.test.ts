import { describe, expect, it } from "vitest";
import type { Stay } from "@/server/idobooking/operations";
import type { CleaningSnapshot, CleaningUnit } from "./types";
import { buildCleaningCandidates, localIso } from "./candidates";

const unit: CleaningUnit = {
  id: 7,
  objectId: 2,
  name: "Test apartment",
  code: "A",
  mapping: "id",
  apartmentId: 1,
  address: "Test address",
};
const stay = (
  id: number,
  from: string,
  to: string,
  status = "accepted",
  unitId = 7,
): Stay => ({ id, from, to, status, unitId });
const outgoing = stay(1, "2026-10-20T15:00", "2026-10-26T10:00");
const incoming = stay(2, "2026-10-26T15:00", "2026-10-28T10:00");
const snapshot = (
  stays: Stay[] = [outgoing, incoming],
  units = [unit],
): CleaningSnapshot => ({
  from: "2026-10-26",
  to: "2026-10-27",
  timeZone: "Europe/Warsaw",
  fetchedAt: "2026-10-26T07:00:00Z",
  units,
  stays,
  locks: [],
});
const build = (state = snapshot()) =>
  buildCleaningCandidates(state, { accountId: "test-account" });

describe("cleaning candidates", () => {
  it("includes a checkout from a stay started before the range, with a 60 minute estimate and a five hour window", () => {
    const c = build().candidates[0]!;
    expect(c.windows).toEqual([
      {
        start: "2026-10-26T10:00:00+01:00",
        end: "2026-10-26T15:00:00+01:00",
        availableMinutes: 300,
      },
    ]);
    expect(c.duration.estimatedMinutes).toBe(60);
    expect(c.beforeReservation?.id).toBe(2);
    expect(c).not.toHaveProperty("cleanerId");
    expect(c).not.toHaveProperty("scheduledStart");
  });
  it.each([
    "waitingForPayment",
    "paymentInProgress",
    "unconfirmed",
    "Oczekująca",
  ])("plans an awaiting reservation (%s) immediately", (status) => {
    const result = build(snapshot([{ ...outgoing, status }, incoming]));
    expect(result.candidates[0]?.certainty).toBe("provisional");
    expect(result.counts.provisionalCandidates).toBe(1);
  });
  it("keeps candidate identity across acceptance, date changes and the next guest changing", () => {
    const first = build(
      snapshot([{ ...outgoing, status: "waitingForPayment" }, incoming]),
    ).candidates[0]!;
    const accepted = build().candidates[0]!;
    const moved = build({
      ...snapshot([{ ...outgoing, to: "2026-10-27T10:00" }]),
      to: "2026-10-28",
    }).candidates[0]!;
    const nextChanged = build(snapshot([outgoing, { ...incoming, id: 999 }]))
      .candidates[0]!;
    expect([accepted.id, moved.id, nextChanged.id]).toEqual([
      first.id,
      first.id,
      first.id,
    ]);
    expect(accepted.candidateRevision).not.toBe(first.candidateRevision);
  });
  it("excludes a cancelled forecast and retains an explicit inactive reason", () => {
    const result = build(snapshot([{ ...outgoing, status: "canceled" }]));
    expect(result.candidates).toEqual([]);
    expect(result.excluded[0]?.reason).toBe("RESERVATION_INACTIVE");
  });
  it("does not invent daily cleaning during an empty gap, or require a next arrival", () => {
    expect(build(snapshot([])).candidates).toEqual([]);
    const result = build({ ...snapshot([outgoing]), to: "2026-10-30" });
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.beforeReservation).toBeNull();
    expect(result.candidates[0]?.nextArrivalKnownThrough).toBe(
      "2026-10-30T00:00:00+01:00",
    );
  });
  it("clamps an early checkout to 10 and reviews a checkout after 15", () => {
    expect(
      build(snapshot([{ ...outgoing, to: "2026-10-26T08:00" }])).candidates[0]
        ?.windows[0]?.start,
    ).toBe("2026-10-26T10:00:00+01:00");
    const late = build(snapshot([{ ...outgoing, to: "2026-10-26T16:00" }]));
    expect(late.candidates).toEqual([]);
    expect(late.reviews[0]?.reviewReasons).toContain("OUTSIDE_WORK_HOURS");
  });
  it("uses pending or unknown incoming stays as occupancy, and rejects a short window", () => {
    for (const status of ["unconfirmed", "futureStatus"]) {
      const result = build(
        snapshot([outgoing, { ...incoming, status, from: "2026-10-26T10:30" }]),
      );
      expect(result.candidates).toEqual([]);
      expect(result.reviews[0]?.reviewReasons).toContain("INSUFFICIENT_WINDOW");
    }
  });
  it("permits exactly 60 minutes before an early arrival and no extra arrival buffer", () => {
    expect(
      build(snapshot([outgoing, { ...incoming, from: "2026-10-26T11:00" }]))
        .candidates[0]?.windows[0]?.availableMinutes,
    ).toBe(60);
  });
  it("reviews unknown outgoing status and unresolved property IDs", () => {
    expect(
      build(snapshot([{ ...outgoing, status: "futureStatus" }])).reviews[0]
        ?.reviewReasons,
    ).toContain("UNKNOWN_STATUS");
    for (const mapping of ["unmapped", "unique-name", "ambiguous"] as const) {
      expect(
        build(snapshot([outgoing], [{ ...unit, mapping }])).reviews[0]
          ?.reviewReasons,
      ).toContain("UNVERIFIED_UNIT_MAPPING");
    }
  });
  it("uses the native source unit without requiring an admin apartment or an address", () => {
    const nativeUnit: CleaningUnit = {
      id: 7,
      objectId: 2,
      name: "Source property",
      code: "Room A",
      mapping: "source-id",
    };
    const candidate = build(snapshot([outgoing], [nativeUnit])).candidates[0]!;
    expect(candidate.eligibleForPlanning).toBe(true);
    expect(candidate.reviewReasons).toEqual([]);
    expect(candidate.unit).toMatchObject({
      unitId: 7,
      objectId: 2,
      apartmentId: null,
      identitySource: "idobooking",
      mapping: "source-id",
      address: null,
      locationStatus: "missing",
      locationId: null,
    });
    expect(candidate.entryRequiresConfirmation).toBe(true);
    expect(candidate.id).toBe(build().candidates[0]?.id);
  });
  it("preserves cleaning location metadata without making a missing or ambiguous address a planning conflict", () => {
    for (const locationStatus of ["missing", "ambiguous"] as const) {
      const result = build(
        snapshot(
          [outgoing],
          [
            {
              id: 7,
              objectId: 2,
              name: "Source property",
              code: "A",
              mapping: "source-id",
              locationStatus,
            },
          ],
        ),
      );
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]?.unit.locationStatus).toBe(locationStatus);
    }
    const known = build(
      snapshot(
        [outgoing],
        [
          {
            id: 7,
            objectId: 2,
            name: "Source property",
            code: "A",
            mapping: "source-id",
            address: "Source street 1",
            locationId: 12,
            locationStatus: "known",
          },
        ],
      ),
    ).candidates[0]!;
    expect(known.unit).toMatchObject({
      address: "Source street 1",
      locationId: 12,
      locationStatus: "known",
    });
  });
  it("does not gate native source units on legacy admin availability flags or expose their apartment ID", () => {
    const candidate = build(
      snapshot(
        [outgoing],
        [
          {
            ...unit,
            mapping: "source-id",
            apartmentId: 99,
            archived: true,
            disabled: true,
          },
        ],
      ),
    ).candidates[0]!;
    expect(candidate.eligibleForPlanning).toBe(true);
    expect(candidate.unit.apartmentId).toBeNull();
    expect(candidate.unit.identitySource).toBe("idobooking");
  });
  it("still requires review for genuine source status and occupancy conflicts with native identity", () => {
    const nativeUnit: CleaningUnit = {
      id: 7,
      objectId: 2,
      name: "Source property",
      code: "A",
      mapping: "source-id",
    };
    const unknown = build(
      snapshot([{ ...outgoing, status: "newUnknownStatus" }], [nativeUnit]),
    );
    expect(unknown.reviews[0]?.reviewReasons).toEqual(["UNKNOWN_STATUS"]);
    const overlap = build(
      snapshot(
        [outgoing, { ...incoming, from: "2026-10-25T15:00" }],
        [nativeUnit],
      ),
    );
    expect(overlap.candidates).toEqual([]);
    expect(overlap.reviews[0]?.reviewReasons).toContain("OCCUPANCY_OVERLAP");
  });
  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN])(
    "rejects invalid native identifiers (%s)",
    (invalid) => {
      expect(() =>
        build(
          snapshot(
            [outgoing],
            [{ ...unit, id: invalid, mapping: "source-id" }],
          ),
        ),
      ).toThrow("identifier");
      expect(() =>
        build(
          snapshot(
            [outgoing],
            [{ ...unit, objectId: invalid, mapping: "source-id" }],
          ),
        ),
      ).toThrow("identifier");
      expect(() => build(snapshot([{ ...outgoing, id: invalid }]))).toThrow(
        "identifier",
      );
      expect(() => build(snapshot([{ ...outgoing, unitId: invalid }]))).toThrow(
        "identifier",
      );
    },
  );
  it("reviews archived and disabled properties", () => {
    expect(
      build(snapshot([outgoing], [{ ...unit, archived: true }])).reviews[0]
        ?.reviewReasons,
    ).toContain("PROPERTY_DISABLED");
    expect(
      build(
        snapshot(
          [outgoing],
          [
            {
              ...unit,
              disabled: true,
              disabledFrom: "2026-10-26",
              disabledTo: "2026-10-26",
            },
          ],
        ),
      ).reviews[0]?.reviewReasons,
    ).toContain("PROPERTY_DISABLED");
    expect(
      build(
        snapshot(
          [outgoing],
          [{ ...unit, disabled: true, disabledFrom: "2026-10-27" }],
        ),
      ).candidates,
    ).toHaveLength(1);
  });
  it("subtracts object-wide availability locks through their last day without exposing notes", () => {
    const result = build({
      ...snapshot(),
      locks: [
        {
          id: 1,
          unitId: null,
          objectId: 2,
          from: "2026-10-25",
          to: "2026-10-26",
          note: "PRIVATE NOTE",
        },
      ],
    });
    expect(result.candidates).toEqual([]);
    expect(result.reviews[0]?.reviewReasons).toContain("AVAILABILITY_LOCK");
    expect(JSON.stringify(result)).not.toContain("PRIVATE NOTE");
  });
  it("reviews overlapping stays and locally flagged relocations", () => {
    expect(
      build(snapshot([outgoing, { ...incoming, from: "2026-10-25T15:00" }]))
        .reviews[0]?.reviewReasons,
    ).toContain("OCCUPANCY_OVERLAP");
    expect(
      buildCleaningCandidates(snapshot(), {
        accountId: "test-account",
        transferredReservationKeys: new Set(["1:7"]),
      }).reviews[0]?.reviewReasons,
    ).toContain("RELOCATION_REVIEW");
  });
  it("reviews both overlapping reservations even if they end at the same checkout", () => {
    const result = build(
      snapshot([outgoing, { ...outgoing, id: 3, from: "2026-10-25T15:00" }]),
    );
    expect(result.candidates).toEqual([]);
    expect(result.reviews).toHaveLength(2);
    for (const review of result.reviews)
      expect(review.reviewReasons).toContain("OCCUPANCY_OVERLAP");
  });
  it("reviews a past occupancy collision even if it ended before this checkout", () => {
    const result = build(
      snapshot([outgoing, stay(3, "2026-10-25T15:00", "2026-10-26T09:00")]),
    );
    expect(result.candidates).toEqual([]);
    expect(
      result.reviews.every((review) =>
        review.reviewReasons.includes("OCCUPANCY_OVERLAP"),
      ),
    ).toBe(true);
  });
  it("normalizes supported panel time formats before comparison and identity revision", () => {
    const canonical = build();
    const formatted = build(
      snapshot([
        { ...outgoing, from: "2026-10-20 15:00:00", to: "2026-10-26 10:00:00" },
        incoming,
      ]),
    );
    expect(formatted).toEqual(canonical);
  });
  it("creates separate candidates for each unit in a multi-unit reservation", () => {
    const result = build(
      snapshot(
        [outgoing, { ...outgoing, unitId: 8 }],
        [unit, { ...unit, id: 8, apartmentId: 2 }],
      ),
    );
    expect(result.candidates).toHaveLength(2);
    expect(new Set(result.candidates.map((c) => c.id)).size).toBe(2);
  });
  it("keeps revisions stable across fetch time and source ordering, but isolates accounts", () => {
    const state = snapshot([outgoing, incoming]);
    expect(build(state).revision).toBe(
      build({
        ...state,
        fetchedAt: "2026-10-26T07:01:00Z",
        stays: [...state.stays].reverse(),
      }).revision,
    );
    expect(
      buildCleaningCandidates(state, { accountId: "another-account" })
        .candidates[0]?.id,
    ).not.toBe(build(state).candidates[0]?.id);
  });
  it("uses local 10–15 on both sides of the Warsaw DST transition", () => {
    expect(localIso("2026-10-24T10:00")).toBe("2026-10-24T10:00:00+02:00");
    expect(localIso("2026-10-25T10:00")).toBe("2026-10-25T10:00:00+01:00");
    expect(localIso("2027-03-28T10:00")).toBe("2027-03-28T10:00:00+02:00");
  });
  it("rejects incomplete locks, absent units, duplicate lines and invalid coverage", () => {
    expect(() => build({ ...snapshot(), locks: undefined })).toThrow(
      "lock coverage",
    );
    expect(() => build(snapshot([outgoing], []))).toThrow("catalog");
    expect(() => build(snapshot([outgoing, outgoing]))).toThrow("duplicate");
    expect(() => build(snapshot([outgoing], [unit, unit]))).toThrow(
      "duplicated unit catalog",
    );
    expect(() => build({ ...snapshot(), timeZone: "UTC" })).toThrow("timezone");
    expect(() => build({ ...snapshot(), to: "2026-10-26" })).toThrow("range");
  });
});
