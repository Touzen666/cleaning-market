import { describe, expect, it, vi, afterEach } from "vitest";
import { addFixtureDays, createCleaningPreviewFixture } from "./fixtures";

describe("cleaning UI preview fixtures", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds accepted and provisional candidates, three reviews and one inactive exclusion without network access", () => {
    const fetch = vi.fn(() => {
      throw new Error("Fixture must not access network");
    });
    vi.stubGlobal("fetch", fetch);
    const data = createCleaningPreviewFixture(new Date("2026-10-25T12:00:00Z"));
    expect(data.from).toBe("2026-10-25");
    expect(data.to).toBe("2026-11-01");
    expect(data.counts).toEqual({
      acceptedCandidates: 1,
      provisionalCandidates: 1,
      reviews: 3,
      excluded: 1,
    });
    expect(data.candidates.map((candidate) => candidate.certainty)).toEqual([
      "accepted",
      "provisional",
    ]);
    expect(
      data.reviews.flatMap((candidate) => candidate.reviewReasons),
    ).toEqual(
      expect.arrayContaining([
        "INSUFFICIENT_WINDOW",
        "UNKNOWN_STATUS",
        "AVAILABILITY_LOCK",
      ]),
    );
    expect(data.candidates[0]?.windows[0]).toEqual({
      start: "2026-10-25T10:00:00+01:00",
      end: "2026-10-25T15:00:00+01:00",
      availableMinutes: 300,
    });
    expect(
      data.candidates.every((candidate) =>
        candidate.id.startsWith("checkout:demo-only:"),
      ),
    ).toBe(true);
    expect(data.source).toEqual({
      apiVersion: "36",
      catalogSource: "active-admin-readonly",
      reservationsComplete: true,
      availabilityLocksComplete: true,
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses native source IDs without an admin apartment association, even when the address is missing", () => {
    const data = createCleaningPreviewFixture(new Date("2026-10-25T12:00:00Z"));
    for (const candidate of [...data.candidates, ...data.reviews]) {
      expect(candidate.unit.mapping).toBe("source-id");
      expect(candidate.unit.identitySource).toBe("idobooking");
      expect(candidate.unit.apartmentId).toBe(candidate.unit.unitId + 100000);
      expect(candidate.reviewReasons).not.toContain("UNVERIFIED_UNIT_MAPPING");
    }
    const awaiting = data.candidates.find(
      (candidate) => candidate.certainty === "provisional",
    );
    expect(awaiting?.eligibleForPlanning).toBe(true);
    expect(awaiting?.unit).toMatchObject({
      unitId: 91002,
      objectId: 9902,
      address: null,
      locationStatus: "missing",
      locationId: null,
    });
    expect(awaiting?.windows).toHaveLength(1);
    const known = data.candidates.find(
      (candidate) => candidate.certainty === "accepted",
    );
    expect(known?.unit).toMatchObject({
      locationStatus: "known",
      locationId: 94001,
      address: "Testowa 1, Warszawa",
    });
    const unknownStatus = data.reviews.find(
      (candidate) => candidate.afterReservation.id === 92007,
    );
    expect(unknownStatus?.afterReservation.sourceStatus).toBe(
      "newUnknownStatus",
    );
    expect(unknownStatus?.reviewReasons).toEqual(["UNKNOWN_STATUS"]);
  });

  it("anchors the calendar to the Warsaw date at a UTC day boundary", () => {
    const data = createCleaningPreviewFixture(new Date("2026-10-24T22:30:00Z"));
    expect(data.from).toBe("2026-10-25");
    expect(addFixtureDays("2026-12-29", 7)).toBe("2027-01-05");
  });
});
