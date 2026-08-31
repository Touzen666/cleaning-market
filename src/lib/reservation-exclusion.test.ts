import { describe, expect, it } from "vitest";
import {
  exclusionRangeFromApartment,
  filterReportItemsOutsideExclusion,
  filterReservationsOutsideExclusion,
  formatReservationExclusionNotice,
  reservationOverlapsExclusion,
} from "./reservation-exclusion";

const exclusionFromSep = {
  from: new Date("2026-09-01T00:00:00.000Z"),
  to: null,
};

describe("reservationOverlapsExclusion", () => {
  it("nie wyklucza pobytu kończącego się w dniu startu wykluczenia", () => {
    expect(
      reservationOverlapsExclusion(
        new Date("2026-08-31T00:00:00.000Z"),
        new Date("2026-09-01T00:00:00.000Z"),
        exclusionFromSep,
      ),
    ).toBe(false);
  });

  it("wyklucza pobyt zaczynający się w dniu startu wykluczenia", () => {
    expect(
      reservationOverlapsExclusion(
        new Date("2026-09-01T00:00:00.000Z"),
        new Date("2026-09-03T00:00:00.000Z"),
        exclusionFromSep,
      ),
    ).toBe(true);
  });

  it("wyklucza pobyt nachodzący na początek wykluczenia", () => {
    expect(
      reservationOverlapsExclusion(
        new Date("2026-08-28T00:00:00.000Z"),
        new Date("2026-09-03T00:00:00.000Z"),
        exclusionFromSep,
      ),
    ).toBe(true);
  });

  it("nie wyklucza pobytu sprzed zakresu", () => {
    expect(
      reservationOverlapsExclusion(
        new Date("2026-08-01T00:00:00.000Z"),
        new Date("2026-08-05T00:00:00.000Z"),
        exclusionFromSep,
      ),
    ).toBe(false);
  });

  it("respektuje datę końcową włącznie", () => {
    const range = {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-30T00:00:00.000Z"),
    };
    expect(
      reservationOverlapsExclusion(
        new Date("2026-09-30T00:00:00.000Z"),
        new Date("2026-10-02T00:00:00.000Z"),
        range,
      ),
    ).toBe(true);
    expect(
      reservationOverlapsExclusion(
        new Date("2026-10-01T00:00:00.000Z"),
        new Date("2026-10-03T00:00:00.000Z"),
        range,
      ),
    ).toBe(false);
  });
});

describe("filterReservationsOutsideExclusion", () => {
  it("zostawia tylko rezerwacje poza wykluczeniem", () => {
    const kept = filterReservationsOutsideExclusion(
      [
        {
          id: 1,
          start: new Date("2026-08-01T00:00:00.000Z"),
          end: new Date("2026-08-05T00:00:00.000Z"),
        },
        {
          id: 2,
          start: new Date("2026-09-10T00:00:00.000Z"),
          end: new Date("2026-09-12T00:00:00.000Z"),
        },
      ],
      exclusionFromSep,
    );
    expect(kept.map((r) => r.id)).toEqual([1]);
  });
});

describe("filterReportItemsOutsideExclusion", () => {
  it("zostawia pozycje bez rezerwacji oraz poza zakresem", () => {
    const items = filterReportItemsOutsideExclusion(
      [
        { id: "a", reservation: null },
        {
          id: "b",
          reservation: {
            start: new Date("2026-09-10T00:00:00.000Z"),
            end: new Date("2026-09-12T00:00:00.000Z"),
          },
        },
        {
          id: "c",
          reservation: {
            start: new Date("2026-08-01T00:00:00.000Z"),
            end: new Date("2026-08-03T00:00:00.000Z"),
          },
        },
      ],
      exclusionFromSep,
    );
    expect(items.map((i) => i.id)).toEqual(["a", "c"]);
  });
});

describe("exclusionRangeFromApartment", () => {
  it("bez flagi nie wyklucza nic", () => {
    expect(
      exclusionRangeFromApartment({
        reservationsDisabled: false,
        reservationsDisabledFrom: new Date("2026-09-01T00:00:00.000Z"),
        reservationsDisabledTo: null,
      }),
    ).toEqual({ from: null, to: null });
  });

  it("przy włączonej fladze bez daty od wyklucza wszystko", () => {
    const range = exclusionRangeFromApartment({
      reservationsDisabled: true,
      reservationsDisabledFrom: null,
      reservationsDisabledTo: null,
    });
    expect(range.from).toEqual(new Date(0));
    expect(range.to).toBeNull();
  });
});

describe("formatReservationExclusionNotice", () => {
  it("buduje komunikat z datą od", () => {
    const notice = formatReservationExclusionNotice(exclusionFromSep);
    expect(notice).toContain("Ten obiekt nie przyjmuje już rezerwacji od");
    expect(notice).toMatch(/2026/);
  });
});
