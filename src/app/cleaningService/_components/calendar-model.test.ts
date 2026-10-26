import { describe, expect, it } from "vitest";
import {
  calendarDays,
  calendarGeometry,
  reservationLanes,
} from "./calendar-model";

describe("reservation calendar geometry", () => {
  it("clips stays to the viewport while preserving the five-hour turnaround gap", () => {
    const range = { from: "2026-10-25", to: "2026-10-26" };
    const departing = calendarGeometry(
      "2026-10-23T15:00",
      "2026-10-25T10:00",
      range,
    )!;
    const arriving = calendarGeometry(
      "2026-10-25T15:00",
      "2026-10-27T10:00",
      range,
    )!;
    expect(departing.left).toBe(0);
    expect(departing.width).toBeCloseTo((100 * 10) / 24);
    expect(arriving.left - departing.width).toBeCloseTo((100 * 5) / 24);
    expect(
      calendarGeometry("2026-10-26T15:00", "2026-10-27T10:00", range),
    ).toBeNull();
  });
  it("uses local calendar days through the Warsaw DST boundary", () => {
    expect(calendarDays({ from: "2026-10-24", to: "2026-10-27" })).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ]);
    expect(
      calendarGeometry("2026-10-25", "2026-10-26", {
        from: "2026-10-24",
        to: "2026-10-27",
      })?.width,
    ).toBeCloseTo(100 / 3);
  });
  it("puts overlaps in separate lanes and reuses a lane for a non-overlapping stay", () => {
    const base = {
      unitId: 50,
      status: "accepted",
      certainty: "accepted" as const,
    };
    const result = reservationLanes([
      { ...base, id: 1, from: "2026-10-25T15:00", to: "2026-10-27T10:00" },
      { ...base, id: 2, from: "2026-10-26T15:00", to: "2026-10-28T10:00" },
      { ...base, id: 3, from: "2026-10-27T15:00", to: "2026-10-29T10:00" },
    ]);
    expect(result.map((item) => item.lane)).toEqual([0, 1, 0]);
  });
});
