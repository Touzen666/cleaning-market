import { describe, expect, it } from "vitest";
import { mapInventory, type ApartmentInventory } from "./inventory";
import { planOperations } from "./planning";
const unit = { id: 51, objectId: 28, name: "Piaskowy Klif ", code: "225" };
const apt: ApartmentInventory = { id: 35, idobookingId: null, name: "Piaskowy Klif", address: "Kopisto 11/225", archived: false, reservationsDisabled: false, reservationsDisabledFrom: null, reservationsDisabledTo: null };
describe("operational property mapping", () => {
  it("maps a unique normalized name and preserves address and exclusion ranges", () => {
    const units = mapInventory([unit], [{ ...apt, reservationsDisabled: true, reservationsDisabledFrom: "2026-10-16", reservationsDisabledTo: "2026-10-16" }]);
    expect(units[0]).toMatchObject({ apartmentId: 35, mapping: "unique-name", address: "Kopisto 11/225" });
    const p = planOperations({ units, stays: [], fetchedAt: "", timeZone: "Europe/Warsaw", from: "2026-10-16", to: "2026-10-18" });
    expect(p.units[0]?.maintenanceWindows).toHaveLength(1);
    expect(p.units[0]?.maintenanceWindows[0]?.from).toBe("2026-10-17T10:00");
  });
  it("does not infer free access from ambiguous or archived inventory", () => {
    for (const apartments of [[apt, { ...apt, id: 36 }], [{ ...apt, archived: true }]]) {
      const units = mapInventory([unit], apartments);
      expect(planOperations({ units, stays: [], fetchedAt: "", timeZone: "Europe/Warsaw", from: "2026-10-16", to: "2026-10-17" }).units[0]?.maintenanceWindows).toEqual([]);
    }
  });
});
