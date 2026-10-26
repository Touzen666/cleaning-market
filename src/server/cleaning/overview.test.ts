import { describe, expect, it } from "vitest";
import {
  buildCleaningOverview,
  type ActiveCleaningApartment,
} from "./overview";
import type { CleaningSnapshot } from "./types";

const apartment = (
  overrides: Partial<ActiveCleaningApartment> = {},
): ActiveCleaningApartment => ({
  id: 37,
  idobookingId: null,
  name: "Lazurowe",
  address: "Adres lokalny",
  rooms: [{ code: "49" }],
  images: [
    { url: "https://example.com/secondary.jpg", isPrimary: false, order: 0 },
    { url: "https://example.com/primary.jpg", isPrimary: true, order: 2 },
  ],
  ...overrides,
});
const snapshot = (): CleaningSnapshot => ({
  from: "2026-10-26",
  to: "2026-11-02",
  fetchedAt: new Date().toISOString(),
  timeZone: "Europe/Warsaw",
  units: [
    {
      id: 50,
      objectId: 38,
      name: "Lazurowe",
      code: "49",
      mapping: "source-id",
    },
  ],
  stays: [
    {
      id: 4720,
      unitId: 50,
      from: "2026-10-25T15:00",
      to: "2026-10-30T10:00",
      status: "toClarify",
    },
  ],
  locks: [],
});
function build(
  source = snapshot(),
  apartments = [apartment()],
  archivedUnitIds = new Set<number>(),
) {
  return buildCleaningOverview(source, {
    accountId: "test",
    apartments,
    archivedUnitIds,
  });
}

describe("cleaning calendar catalog projection", () => {
  it("maps a unique source name to an active local apartment without confusing unit, object, code or local IDs", () => {
    const result = build();
    expect(result.overview.units[0]).toMatchObject({
      unitId: 50,
      objectId: 38,
      apartmentId: 37,
      code: "49",
      mapping: "unique-name",
      imageUrl: "https://example.com/primary.jpg",
    });
    expect(result.overview.reservations[0]).toMatchObject({
      id: 4720,
      unitId: 50,
      certainty: "provisional",
    });
    expect(result.candidates[0]?.unit).toMatchObject({
      unitId: 50,
      apartmentId: 37,
      identitySource: "idobooking",
    });
    expect(result.candidates[0]?.windows[0]?.availableMinutes).toBe(300);
  });
  it("prefers an explicit source unit ID even when the local label differs", () => {
    expect(
      build(snapshot(), [apartment({ idobookingId: 50, name: "Inna nazwa" })])
        .overview.units[0]?.mapping,
    ).toBe("id");
    expect(
      build(snapshot(), [apartment({ idobookingId: 38 })]).overview.units,
    ).toEqual([]);
    expect(
      build(snapshot(), [apartment({ idobookingId: 49 })]).overview.units,
    ).toEqual([]);
  });
  it("does not resurrect an archived exact ID through an active name match", () => {
    const result = build(snapshot(), [apartment()], new Set([50]));
    expect(result.overview.units).toEqual([]);
    expect(result.overview.reservations).toEqual([]);
    expect(result.candidates).toEqual([]);
    expect(result.reviews).toEqual([]);
    expect(result.overview.mappingIssues[0]?.reason).toBe("archived");
  });
  it("quarantines ambiguous and unmatched names and reports active apartments without native units", () => {
    const result = build(snapshot(), [
      apartment(),
      apartment({ id: 51 }),
      apartment({ id: 52, name: "Przyjazna Przystań" }),
    ]);
    expect(result.candidates).toHaveLength(0);
    expect(result.reviews[0]?.reviewReasons).toContain(
      "UNVERIFIED_UNIT_MAPPING",
    );
    expect(result.overview.mappingIssues[0]?.reason).toBe("ambiguous");
    expect(
      result.overview.unmappedApartments.map((item) => item.apartmentId),
    ).toEqual([37, 51, 52]);
    expect(build(snapshot(), []).overview.mappingIssues[0]?.reason).toBe(
      "unmapped",
    );
  });
  it("normalizes only Unicode, casing and whitespace rather than guessing fuzzy names", () => {
    expect(
      build(snapshot(), [apartment({ name: "  LAZUROWE  " })]).overview.units,
    ).toHaveLength(1);
    expect(
      build(snapshot(), [apartment({ name: "Lazurowe Centrum" })]).overview
        .units,
    ).toHaveLength(0);
  });
  it("keeps separate native item rows for multi-unit objects and requires matching room codes", () => {
    const source = snapshot();
    source.units.push({ ...source.units[0]!, id: 51, code: "50" });
    const result = build(source, [
      apartment({ rooms: [{ code: "49" }, { code: "50" }] }),
    ]);
    expect(result.overview.units.map((unit) => unit.unitId)).toEqual([50, 51]);
    expect(
      build(source, [apartment({ rooms: [] })]).overview.units,
    ).toHaveLength(0);
    source.units[1]!.code = "49";
    expect(build(source).overview.units).toHaveLength(0);
  });
  it("retains full stays and actual irregular times, including arrivals before the default 15:00", () => {
    const source = snapshot();
    source.stays[0]!.to = "2026-10-30T10:00";
    source.stays.push({
      id: 4721,
      unitId: 50,
      from: "2026-10-30T10:30",
      to: "2026-11-03T21:00",
      status: "accepted",
    });
    const result = build(source);
    expect(result.overview.reservations).toHaveLength(2);
    expect(result.overview.reservations[1]?.to).toBe("2026-11-03T21:00");
    expect(result.candidates).toHaveLength(0);
    expect(result.reviews[0]?.reviewReasons).toContain("INSUFFICIENT_WINDOW");
  });
  it("whitelists output and keeps cancellation plus object-wide locks without private notes", () => {
    const source = snapshot();
    source.stays[0]!.status = "canceled";
    source.locks!.push({
      id: 4,
      unitId: null,
      objectId: 38,
      from: "2026-10-30",
      to: "2026-10-30",
      note: "PRIVATE_NOTE",
    });
    const result = build(source);
    expect(result.candidates).toHaveLength(0);
    expect(result.overview.reservations[0]?.certainty).toBe("inactive");
    expect(result.overview.locks).toHaveLength(1);
    expect(JSON.stringify(result)).not.toContain("PRIVATE_NOTE");
  });
  it("uses source address when known and rejects non-HTTPS catalog images", () => {
    const source = snapshot();
    source.units[0]!.address = "Adres źródłowy";
    expect(build(source).overview.units[0]?.address).toBe("Adres źródłowy");
    expect(
      build(source, [
        apartment({
          images: [{ url: "javascript:alert(1)", isPrimary: true, order: 0 }],
        }),
      ]).overview.units[0]?.imageUrl,
    ).toBeNull();
  });
});
