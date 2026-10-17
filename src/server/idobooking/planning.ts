import type { BookingSnapshot } from "./operations";

const inactive = new Set(["canceled", "cancelled", "withdrawn"]);
const occupied = new Set(["accepted", "confirmed", "inProgress", "completed"]);
const known = new Set([...inactive, ...occupied, "unconfirmed", "paymentInProgress", "waitingForPayment", "invalidCardNumber", "toClarify"]);
export type PlanningOptions = { cleaningMinutes: number; arrivalBufferMinutes: number };
const minutes = (s: string) => Date.parse(s + ":00Z") / 60000;
const wallTime = (n: number) => new Date(n * 60000).toISOString().slice(0, 16);

/** Local wall-clock working hours (10–15), not UTC instants. All output carries panel timeZone. */
export function planOperations(snapshot: BookingSnapshot, options: PlanningOptions = { cleaningMinutes: 90, arrivalBufferMinutes: 30 }) {
  if (!Number.isInteger(options.cleaningMinutes) || options.cleaningMinutes < 15 || options.cleaningMinutes > 480 || !Number.isInteger(options.arrivalBufferMinutes) || options.arrivalBufferMinutes < 0 || options.arrivalBufferMinutes > 180) {
    throw new Error("Invalid planning durations");
  }
  const ids = new Set(snapshot.units.map(u => u.id));
  const unmapped = snapshot.stays.filter(s => !ids.has(s.unitId));
  if (unmapped.length) throw new Error("Reservations reference units missing from the object catalog; no availability published");
  const units = snapshot.units.map(unit => {
    const stays = snapshot.stays.filter(s => s.unitId === unit.id);
    const blocking = stays.filter(s => !inactive.has(s.status));
    const locks = (snapshot.locks ?? []).filter(l => l.unitId === unit.id || (l.unitId === null && l.objectId === unit.objectId));
    const warnings: string[] = [];
    if (blocking.some(s => !known.has(s.status))) warnings.push("Unknown status: held as occupied; verify in panel");
    if (blocking.some(s => !occupied.has(s.status))) warnings.push("Tentative reservations also block maintenance windows");
    const intervals = blocking.map(s => ({ from: minutes(s.from) - options.arrivalBufferMinutes, to: minutes(s.to) }));
    // Lock API provides days without check-in/out hours. Hold the entire final day
    // conservatively until the end-day semantics or access time is confirmed.
    const lockIntervals = locks.map(l => ({ from: minutes(l.from + "T00:00"), to: minutes(l.to + "T00:00") + 1440 }));
    intervals.push(...lockIntervals);
    if (snapshot.locks === undefined) warnings.push("Availability locks not read; calendar covers reservations only");
    if (locks.length) warnings.push("Availability lock end day held in full; verify access time before work");
    if (unit.mapping === "unique-name") warnings.push("App mapping uses a unique name; persist verified unit IDs before automatic scheduling");
    if (unit.mapping === "unmapped" || unit.mapping === "ambiguous") {
      warnings.push("App property mapping unresolved: maintenance windows suppressed");
      intervals.push({ from: -Infinity, to: Infinity });
    }
    if (unit.archived) intervals.push({ from: -Infinity, to: Infinity });
    if (unit.disabled) intervals.push({ from: unit.disabledFrom ? minutes(unit.disabledFrom + "T00:00") : -Infinity, to: unit.disabledTo ? minutes(unit.disabledTo + "T00:00") + 1440 : Infinity });
    const cleanings = blocking.filter(s => occupied.has(s.status) && s.to >= snapshot.from + "T00:00" && s.to < snapshot.to + "T00:00").map(s => {
      const next = blocking.filter(n => n !== s && n.from >= s.to).sort((a, b) => a.from.localeCompare(b.from))[0];
      const deadline = next?.from ?? null;
      const end = minutes(s.to) + options.cleaningMinutes;
      const conflict = blocking.some(n => n !== s && minutes(n.from) < end && minutes(n.to) > minutes(s.to)) || lockIntervals.some(l => l.from < end && l.to > minutes(s.to));
      if (conflict) warnings.push(`Cleaning conflict after reservation ${s.id}`);
      intervals.push({ from: minutes(s.to), to: end });
      return { reservationId: s.id, earliest: s.to, suggestedEnd: wallTime(end), nextArrival: deadline, conflict };
    });
    const windows: { from: string; to: string; minutes: number }[] = [];
    for (let day = minutes(snapshot.from + "T00:00"); day < minutes(snapshot.to + "T00:00"); day += 1440) {
      let gaps = [{ from: day + 10 * 60, to: day + 15 * 60 }];
      for (const block of intervals) gaps = gaps.flatMap(gap => {
        if (block.from >= gap.to || block.to <= gap.from) return [gap];
        return [{ from: gap.from, to: Math.min(gap.to, block.from) }, { from: Math.max(gap.from, block.to), to: gap.to }].filter(g => g.to > g.from);
      });
      windows.push(...gaps.filter(g => g.to - g.from >= 30).map(g => ({ from: wallTime(g.from), to: wallTime(g.to), minutes: g.to - g.from })));
    }
    const relocationPattern = /przen|przesu|prze[łl]o[zż]|zamian|zamiast|\bz\s+(?:miodow|husarsk|mi[łl]|zaciszn|kopist|podwis[łl]ocz|langiewicz)|relocat|transfer|moved/iu;
    return { ...unit, reservations: stays, availabilityLocks: locks, lockOccupancyReviews: locks.filter(l => relocationPattern.test(l.note)).map(l => ({ lockId: l.id, from: l.from, to: l.to, note: l.note, action: "Verify relocated stay and checkout cleaning; do not count as a second reservation" })), maintenanceWindows: windows, cleaningProposals: cleanings, warnings: [...new Set(warnings)] };
  });
  return {
    timeZone: snapshot.timeZone, from: snapshot.from, to: snapshot.to,
    basis: snapshot.locks === undefined ? "reservations-only" : "reservations-and-availability-locks", entryRequiresConfirmation: true,
    lockCoverage: snapshot.locks === undefined ? "not-read" : "complete-read", lockEndBoundary: "conservative-inclusive-day",
    assumptions: { workHours: "10:00–15:00", cleaningMinutes: options.cleaningMinutes, arrivalBufferMinutes: options.arrivalBufferMinutes },
    units,
  };
}
