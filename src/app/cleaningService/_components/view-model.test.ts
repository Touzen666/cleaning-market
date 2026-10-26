import { describe, expect, it } from "vitest";
import {
  dayLabel,
  planningError,
  rangeFrom,
  readAtLabel,
  shiftDate,
  timeLabel,
  todayInWarsaw,
} from "./view-model";

describe("cleaning display dates", () => {
  it("uses Warsaw calendar days even across UTC midnight and the winter offset change", () => {
    expect(todayInWarsaw(new Date("2026-10-24T22:30:00Z"))).toBe("2026-10-25");
    expect(todayInWarsaw(new Date("2026-10-25T23:30:00Z"))).toBe("2026-10-26");
    expect(readAtLabel("2026-10-25T23:30:00Z")).toContain("26 października");
    expect(timeLabel("2026-10-25T09:00:00Z")).toBe("10:00");
  });
  it("creates an exclusive calendar range without losing a day at DST/month changes", () => {
    expect(rangeFrom("2026-10-25", 7)).toEqual({
      from: "2026-10-25",
      to: "2026-11-01",
    });
    expect(shiftDate("2027-03-28", 1)).toBe("2027-03-29");
    expect(shiftDate("2026-02-30", 0)).toBeNull();
    expect(() => rangeFrom("2026-10-25", 32)).toThrow();
    expect(dayLabel("2026-10-25")).toContain("25 października");
  });
  it("shows an explicit retry message instead of treating an upstream failure as no cleaning", () => {
    expect(planningError("BAD_GATEWAY")).toContain(
      "Nie udało się pobrać pełnych danych",
    );
    expect(planningError("SERVICE_UNAVAILABLE")).toContain("zbyt stare");
    expect(planningError("FORBIDDEN")).toContain("nie ma dostępu");
  });
});
