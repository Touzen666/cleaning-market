import { describe, expect, it } from "vitest";
import type { BookingSnapshot, Stay } from "./operations";
import { planOperations } from "./planning";
const unit = { id: 7, objectId: 2, name: "Apartment", code: "A" };
const stay = (id: number, from: string, to: string, status = "accepted"): Stay => ({ id, unitId: 7, from, to, status });
const snapshot = (stays: Stay[]): BookingSnapshot => ({ fetchedAt: "2026-10-15T12:00:00Z", timeZone: "Europe/Warsaw", from: "2026-10-16", to: "2026-10-17", units: [unit], stays });
describe("operational planning", () => {
  it("reserves cleaning and an arrival buffer on same-day turnovers", () => {
    const p = planOperations(snapshot([stay(1, "2026-10-15T15:00", "2026-10-16T10:00"), stay(2, "2026-10-16T15:00", "2026-10-18T10:00")]));
    expect(p.units[0]?.maintenanceWindows).toEqual([{ from: "2026-10-16T11:30", to: "2026-10-16T14:30", minutes: 180 }]);
    expect(p.units[0]?.cleaningProposals[0]?.nextArrival).toBe("2026-10-16T15:00");
  });
  it("removes canceled stays but treats tentative/unknown status as blocking", () => {
    expect(planOperations(snapshot([stay(1, "2026-10-15T15:00", "2026-10-18T10:00", "canceled")])).units[0]?.maintenanceWindows).toHaveLength(1);
    for (const status of ["unconfirmed", "futureStatus"]) {
      const plan = planOperations(snapshot([stay(1, "2026-10-15T15:00", "2026-10-18T10:00", status)]));
      expect(plan.units[0]?.maintenanceWindows).toEqual([]);
      expect(plan.units[0]?.warnings.length).toBeGreaterThan(0);
    }
  });
  it("rejects unmapped units and flags insufficient turnover time", () => {
    expect(() => planOperations(snapshot([{ ...stay(1, "2026-10-15T15:00", "2026-10-18T10:00"), unitId: 99 }]))).toThrow("missing");
    const p = planOperations(snapshot([stay(1, "2026-10-15T15:00", "2026-10-16T10:00"), stay(2, "2026-10-16T11:00", "2026-10-18T10:00")]));
    expect(p.units[0]?.cleaningProposals[0]?.conflict).toBe(true);
    expect(p.units[0]?.maintenanceWindows).toEqual([]);
  });
  it("retains checkout cleaning on the first day and local hours over a DST weekend", () => {
    const p = planOperations({ ...snapshot([stay(1, "2026-10-23T15:00", "2026-10-25T10:00")]), from: "2026-10-25", to: "2026-10-26" });
    expect(p.units[0]?.maintenanceWindows[0]?.from).toBe("2026-10-25T11:30");
    expect(p.units[0]?.cleaningProposals).toHaveLength(1);
  });
});
