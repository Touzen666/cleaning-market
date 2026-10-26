import {
  localDate,
  revision,
  validateRange,
} from "@/server/idobooking/operations";
import type { CleaningSnapshot } from "./types";

export const CLEANING_POLICY = {
  version: "cleaning-candidates-v3-pending-60min",
  timeZone: "Europe/Warsaw",
  workingHours: { start: "10:00", end: "15:00" },
  defaultCleaningMinutes: 60,
  arrivalBufferMinutes: 0,
  preferredMaxJobsPerCleanerPerDay: 3,
  hardMaxJobsPerCleanerPerDay: 4,
} as const;

type Certainty = "accepted" | "provisional";
export type ReviewReason =
  | "UNKNOWN_STATUS"
  | "UNVERIFIED_UNIT_MAPPING"
  | "PROPERTY_DISABLED"
  | "RELOCATION_REVIEW"
  | "OUTSIDE_WORK_HOURS"
  | "INSUFFICIENT_WINDOW"
  | "OCCUPANCY_OVERLAP"
  | "AVAILABILITY_LOCK";
type Interval = { start: number; end: number };
type Context = {
  accountId: string;
  transferredReservationKeys?: ReadonlySet<string>;
};

/** Payment alone is not a cancellation. Unknown statuses remain blocking. */
export function reservationClass(
  status: string,
): Certainty | "inactive" | "review" {
  switch (status.trim().toLocaleLowerCase("pl")) {
    case "accepted":
    case "confirmed":
    case "przyjęta":
    case "inprogress":
    case "trwa":
    case "completed":
    case "zakończona":
      return "accepted";
    case "unconfirmed":
    case "paymentinprogress":
    case "waitingforpayment":
    case "pending":
    // Verified against the panel: #4717–4720 are shown as "Oczekująca".
    case "toclarify":
    case "oczekująca":
    case "oczekuje na wpłatę":
    case "nieopłacona":
      return "provisional";
    case "canceled":
    case "cancelled":
    case "withdrawn":
    case "anulowana":
    case "odrzucona przez obsługę":
      return "inactive";
    default:
      return "review";
  }
}

// Arithmetic uses local calendar minutes; these numbers are never serialized as UTC instants.
const wallMinutes = (local: string) =>
  Date.parse(localDate(local) + ":00Z") / 60000;
const wallText = (minutes: number) =>
  new Date(minutes * 60000).toISOString().slice(0, 16);

const dateFormatter = new Intl.DateTimeFormat("sv-SE", {
  timeZone: CLEANING_POLICY.timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function formattedLocal(instant: number) {
  const parts = dateFormatter.formatToParts(new Date(instant));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

/** Convert a panel-local time to ISO with its Warsaw offset, including DST changes. */
export function localIso(local: string) {
  const normalized = localDate(local);
  const naive = wallMinutes(normalized) * 60000;
  let instant = naive;
  for (let i = 0; i < 3; i++) {
    const correction = naive - wallMinutes(formattedLocal(instant)) * 60000;
    if (!correction) break;
    instant += correction;
  }
  if (formattedLocal(instant) !== normalized)
    throw new Error("Nonexistent local calendar time");
  const offset = (naive - instant) / 60000;
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return `${normalized}:00${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

function subtract(gaps: Interval[], block: Interval): Interval[] {
  return gaps.flatMap((gap) =>
    block.start >= gap.end || block.end <= gap.start
      ? [gap]
      : [
          { start: gap.start, end: Math.min(gap.end, block.start) },
          { start: Math.max(gap.start, block.end), end: gap.end },
        ].filter((g) => g.end > g.start),
  );
}

/** Candidate identities do not contain dates, status or the next reservation ID. No assignments or writes. */
export function buildCleaningCandidates(
  snapshot: CleaningSnapshot,
  context: Context,
) {
  validateRange(snapshot.from, snapshot.to);
  if (snapshot.timeZone !== CLEANING_POLICY.timeZone)
    throw new Error("The panel timezone must match Europe/Warsaw");
  if (snapshot.locks === undefined)
    throw new Error("Complete availability lock coverage is required");
  if (!context.accountId) throw new Error("Account identity is required");
  const validId = (id: number) => Number.isSafeInteger(id) && id > 0;
  if (
    snapshot.units.some((unit) => !validId(unit.id) || !validId(unit.objectId))
  )
    throw new Error("Invalid unit or object identifier");
  if (snapshot.stays.some((stay) => !validId(stay.id) || !validId(stay.unitId)))
    throw new Error("Invalid reservation or unit identifier");
  const unitIds = new Set(snapshot.units.map((u) => u.id));
  if (
    unitIds.size !== snapshot.units.length ||
    snapshot.stays.some((s) => !unitIds.has(s.unitId))
  )
    throw new Error("Incomplete or duplicated unit catalog");
  const seen = new Set<string>();
  const stays = snapshot.stays.map((stay) => ({
    ...stay,
    from: localDate(stay.from),
    to: localDate(stay.to),
  }));
  for (const stay of stays) {
    const key = `${stay.id}:${stay.unitId}`;
    if (seen.has(key) || wallMinutes(stay.to) <= wallMinutes(stay.from))
      throw new Error("Invalid or duplicate reservation interval");
    seen.add(key);
  }
  const lockIntervals = snapshot.locks.map((lock) => {
    const start = wallMinutes(lock.from + "T00:00");
    const end = wallMinutes(lock.to + "T00:00") + 1440;
    if (end <= start || (lock.unitId === null && lock.objectId === null))
      throw new Error("Invalid availability lock");
    return { ...lock, start, end };
  });
  const candidateResults = stays
    .filter(
      (s) =>
        s.to.slice(0, 10) >= snapshot.from && s.to.slice(0, 10) < snapshot.to,
    )
    .map((stay) => {
      const unit = snapshot.units.find((u) => u.id === stay.unitId)!;
      const status = reservationClass(stay.status);
      const id = `checkout:${context.accountId}:${stay.id}:${stay.unitId}`;
      if (status === "inactive")
        return {
          kind: "excluded" as const,
          value: {
            id,
            reservationId: stay.id,
            unitId: stay.unitId,
            sourceStatus: stay.status,
            reason: "RESERVATION_INACTIVE" as const,
          },
        };
      const reasons = new Set<ReviewReason>();
      if (status === "review") reasons.add("UNKNOWN_STATUS");
      const nativeIdentity = unit.mapping === "source-id";
      // Native objectItemId is already verified by the complete source catalog. It
      // does not need an unrelated admin Apartment row or a guess based on names.
      if (!nativeIdentity && (unit.mapping !== "id" || !unit.apartmentId))
        reasons.add("UNVERIFIED_UNIT_MAPPING");
      const day = stay.to.slice(0, 10);
      // Retained only for explicitly legacy snapshots; the native cleaning source
      // neither imports nor relies on admin availability/archival flags.
      if (
        !nativeIdentity &&
        (unit.archived ||
          (unit.disabled &&
            (!unit.disabledFrom || unit.disabledFrom <= day) &&
            (!unit.disabledTo || unit.disabledTo >= day)))
      )
        reasons.add("PROPERTY_DISABLED");
      if (
        context.transferredReservationKeys?.has(`${stay.id}:${stay.unitId}`) ||
        context.transferredReservationKeys?.has(`${stay.id}:0`)
      )
        reasons.add("RELOCATION_REVIEW");
      const other = stays.filter(
        (n) =>
          n.unitId === stay.unitId &&
          n !== stay &&
          reservationClass(n.status) !== "inactive",
      );
      const checkout = wallMinutes(stay.to);
      const dayStart = wallMinutes(day + "T10:00");
      const dayEnd = wallMinutes(day + "T15:00");
      const next = other
        .filter((n) => wallMinutes(n.from) >= checkout)
        .sort((a, b) => a.from.localeCompare(b.from) || a.id - b.id)[0];
      const start = Math.max(dayStart, checkout);
      const end = Math.min(
        dayEnd,
        next
          ? wallMinutes(next.from) - CLEANING_POLICY.arrivalBufferMinutes
          : Infinity,
      );
      let gaps: Interval[] = end > start ? [{ start, end }] : [];
      if (start >= dayEnd || end <= dayStart) reasons.add("OUTSIDE_WORK_HOURS");
      for (const blocking of other) {
        const interval = {
          start: wallMinutes(blocking.from),
          end: wallMinutes(blocking.to),
        };
        // Two reservations ending at the same checkout still overlap physically. Do not publish two ready cleanings.
        if (interval.start < checkout && interval.end > wallMinutes(stay.from))
          reasons.add("OCCUPANCY_OVERLAP");
        gaps = subtract(gaps, interval);
      }
      const applicableLocks = lockIntervals.filter(
        (l) =>
          l.unitId === unit.id ||
          (l.unitId === null && l.objectId === unit.objectId),
      );
      for (const lock of applicableLocks) {
        if (lock.start < end && lock.end > start)
          reasons.add("AVAILABILITY_LOCK");
        gaps = subtract(gaps, lock);
      }
      const windows = gaps
        .filter(
          (g) => g.end - g.start >= CLEANING_POLICY.defaultCleaningMinutes,
        )
        .map((g) => ({
          start: localIso(wallText(g.start)),
          end: localIso(wallText(g.end)),
          availableMinutes: g.end - g.start,
        }));
      if (!windows.length) reasons.add("INSUFFICIENT_WINDOW");
      const value = {
        id,
        kind: "checkout_cleaning" as const,
        taskState: "candidate" as const,
        certainty: status === "review" ? ("unknown" as const) : status,
        eligibleForPlanning: reasons.size === 0,
        serviceDate: day,
        unit: {
          unitId: unit.id,
          objectId: unit.objectId,
          apartmentId: nativeIdentity ? null : (unit.apartmentId ?? null),
          code: unit.code,
          label: unit.name,
          address: unit.address ?? null,
          mapping: unit.mapping ?? "unmapped",
          identitySource: nativeIdentity
            ? ("idobooking" as const)
            : ("legacy-mapping" as const),
          locationStatus:
            unit.locationStatus ??
            (unit.address?.trim() ? ("known" as const) : ("missing" as const)),
          locationId: unit.locationId ?? null,
        },
        afterReservation: {
          id: stay.id,
          sourceStatus: stay.status,
          checkoutLocal: stay.to,
        },
        beforeReservation: next
          ? { id: next.id, sourceStatus: next.status, checkinLocal: next.from }
          : null,
        nextArrivalKnownThrough: localIso(snapshot.to + "T00:00"),
        windows,
        duration: {
          estimatedMinutes: CLEANING_POLICY.defaultCleaningMinutes,
          estimateSource: "policy_default" as const,
        },
        reviewReasons: [...reasons].sort(),
        entryRequiresConfirmation: true,
      };
      return {
        kind: "candidate" as const,
        value: {
          ...value,
          candidateRevision: revision({
            ...value,
            policy: CLEANING_POLICY.version,
          }),
        },
      };
    });
  const items = candidateResults
    .filter((r) => r.kind === "candidate")
    .map((r) => r.value)
    .sort(
      (a, b) =>
        a.serviceDate.localeCompare(b.serviceDate) ||
        a.unit.unitId - b.unit.unitId ||
        a.id.localeCompare(b.id),
    );
  const candidates = items.filter((c) => c.eligibleForPlanning);
  const reviews = items.filter((c) => !c.eligibleForPlanning);
  const excluded = candidateResults
    .filter((r) => r.kind === "excluded")
    .map((r) => r.value)
    .sort((a, b) => a.id.localeCompare(b.id));
  const data = {
    schemaVersion: 1,
    from: snapshot.from,
    to: snapshot.to,
    timeZone: CLEANING_POLICY.timeZone,
    policy: CLEANING_POLICY,
    candidates,
    reviews,
    excluded,
    counts: {
      acceptedCandidates: candidates.filter((c) => c.certainty === "accepted")
        .length,
      provisionalCandidates: candidates.filter(
        (c) => c.certainty === "provisional",
      ).length,
      reviews: reviews.length,
      excluded: excluded.length,
    },
  };
  return { ...data, revision: revision(data) };
}

export type CleaningCandidate = ReturnType<
  typeof buildCleaningCandidates
>["candidates"][number];
