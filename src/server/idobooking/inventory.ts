import type { Unit } from "./operations";
export type ApartmentInventory = { id: number; idobookingId: number | null; name: string; address: string; archived: boolean; reservationsDisabled: boolean; reservationsDisabledFrom: Date | string | null; reservationsDisabledTo: Date | string | null };
const normalize = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase("pl").replace(/\s+/g, " ");
const date = (d: Date | string | null) => d ? (typeof d === "string" ? d : d.toISOString()).slice(0, 10) : null;

/** Exact ID, then unique name only. Never write guessed identifiers back to the database. */
export function mapInventory(units: Unit[], apartments: ApartmentInventory[]): Unit[] {
  return units.map(unit => {
    let candidates = apartments.filter(a => a.idobookingId === unit.id);
    let mapping: Unit["mapping"] = "id";
    if (!candidates.length) {
      mapping = "unique-name";
      candidates = apartments.filter(a => a.idobookingId === null && normalize(a.name) === normalize(unit.name));
      if (units.filter(u => normalize(u.name) === normalize(unit.name)).length !== 1) candidates = [];
    }
    const a = candidates[0];
    if (!a || candidates.length !== 1) return { ...unit, mapping: candidates.length > 1 ? "ambiguous" : "unmapped" };
    return { ...unit, apartmentId: a.id, address: a.address, mapping, archived: a.archived, disabled: a.reservationsDisabled, disabledFrom: date(a.reservationsDisabledFrom), disabledTo: date(a.reservationsDisabledTo) };
  });
}
