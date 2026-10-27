import { revision } from "@/server/idobooking/operations";
import { localIso, reservationClass } from "./candidates";
import { buildCleaningOverview } from "./overview";
import {
  effectiveStays,
  type Adjustment,
  type Task,
  type WorkforceState,
} from "./workforce-domain";
import type { WorkforceSource } from "./workforce-store";

/** A coordinator's independent order never fabricates a reservation or rewrites checkout hours. */
export function manualOptions(
  source: WorkforceSource,
  adjustments: Adjustment[],
  date: string,
) {
  const snapshot = {
    ...source.snapshot,
    stays: effectiveStays(source.snapshot.stays, adjustments),
  };
  const overview = buildCleaningOverview(snapshot, source.context);
  const start = date + "T10:00",
    end = date + "T15:00";
  return overview.overview.units.map((unit) => {
    const checkoutTaskId =
      overview.candidates.find(
        (c) => c.unit.unitId === unit.unitId && c.serviceDate === date,
      )?.id ?? null;
    const conflicts: NonNullable<Task["manual"]>["conflicts"] = [
      ...snapshot.stays
        .filter(
          (s) =>
            s.unitId === unit.unitId &&
            reservationClass(s.status) !== "inactive" &&
            s.from.slice(0, 16) < end &&
            s.to.slice(0, 16) > start,
        )
        .map((s) => ({
          id: s.id,
          kind: "reservation" as const,
          from: s.from,
          to: s.to,
        })),
      ...(snapshot.locks ?? [])
        .filter(
          (l) =>
            (l.unitId === unit.unitId ||
              (l.unitId === null && l.objectId === unit.objectId)) &&
            l.from.slice(0, 16) < end &&
            l.to.slice(0, 16) > start,
        )
        .map((l) => ({
          id: l.id,
          kind: "lock" as const,
          from: l.from,
          to: l.to,
        })),
    ].sort((a, b) => a.kind.localeCompare(b.kind) || a.id - b.id);
    return {
      ...unit,
      checkoutTaskId,
      conflicts,
      sourceRevision: revision({ date, unit, conflicts, checkoutTaskId }),
    };
  });
}

export function createManualTask(
  state: WorkforceState,
  option: ReturnType<typeof manualOptions>[number],
  input: {
    serviceDate: string;
    reason: string;
    requestId: string;
    acknowledgeOccupancy: boolean;
    expectedSourceRevision: string;
  },
  accountId: string,
  now: string,
): Task {
  const id = `manual:${accountId}:${input.serviceDate}:${option.unitId}`;
  const existing = state.tasks.find((t) => t.id === id);
  if (existing?.manual?.requestId === input.requestId) return existing;
  if (existing)
    throw new Error(
      "Ręczne sprzątanie tego apartamentu w tym dniu już istnieje.",
    );
  if (
    input.serviceDate < now.slice(0, 10) ||
    input.serviceDate + "T14:00" < now
  )
    throw new Error("Termin sprzątania już minął.");
  if (option.sourceRevision !== input.expectedSourceRevision)
    throw new Error(
      "Rezerwacje zmieniły się. Odczytaj ponownie ostrzeżenia dla lokalu.",
    );
  if (option.checkoutTaskId)
    throw new Error(
      "W źródle jest już sprzątanie po wyjeździe. Pobierz rezerwacje i przydziel istniejące zlecenie.",
    );
  if (option.conflicts.length && !input.acknowledgeOccupancy)
    throw new Error(
      "Potwierdź ręczne zlecenie mimo rezerwacji lub blokady. Możliwość wejścia wymaga osobnego potwierdzenia.",
    );
  if (
    state.tasks.some(
      (t) =>
        t.unitId === option.unitId &&
        t.serviceDate === input.serviceDate &&
        !["REVIEW", "CANCELLED"].includes(t.status),
    )
  )
    throw new Error(
      "Sprzątanie tego apartamentu w tym dniu już istnieje. Otwórz istniejące zlecenie.",
    );
  const task: Task = {
    id,
    unitId: option.unitId,
    reservationId: null,
    serviceDate: input.serviceDate,
    name: option.label,
    address: option.address,
    imageUrl: option.imageUrl,
    stayFrom: null,
    stayTo: null,
    nextFrom: null,
    nextReservationId: null,
    nextTo: null,
    guests: null,
    nextGuests: null,
    provisional: option.conflicts.length > 0,
    windows: [
      {
        start: localIso(input.serviceDate + "T10:00"),
        end: localIso(input.serviceDate + "T15:00"),
      },
    ],
    sourceRevision: option.sourceRevision,
    status: "UNASSIGNED",
    userId: null,
    start: null,
    end: null,
    declined: [],
    version: 1,
    offerSequence: 0,
    alert: null,
    forcedReason: null,
    checks: [],
    extraItems: [],
    photos: [],
    rewardCents: 0,
    rewardPoints: 0,
    startedAt: null,
    completedAt: null,
    entryApproved: false,
    manual: {
      reason: input.reason,
      requestId: input.requestId,
      createdAt: now,
      sourceRevision: option.sourceRevision,
      conflicts: option.conflicts,
    },
  };
  state.tasks.push(task);
  return task;
}

/** Keep independent orders across imports; new occupancy always revokes an old entry approval. */
export function refreshManualTask(
  task: Task,
  option: ReturnType<typeof manualOptions>[number] | undefined,
) {
  if (!task.manual || task.status === "DONE" || task.status === "CANCELLED")
    return;
  if (!option) {
    const message =
      "Ręczne zlecenie: apartament nie ma już potwierdzonego aktywnego mapowania.";
    if (task.alert !== message) task.version++;
    task.alert = message;
    task.entryApproved = false;
    if (task.status !== "IN_PROGRESS") {
      task.status = "REVIEW";
      task.userId = null;
      task.start = null;
      task.end = null;
    }
    return;
  }
  if (task.manual.sourceRevision !== option.sourceRevision) {
    task.manual.conflicts = option.conflicts;
    task.manual.sourceRevision = option.sourceRevision;
    task.sourceRevision = option.sourceRevision;
    task.provisional = option.conflicts.length > 0;
    task.entryApproved = false;
    task.alert =
      "Zmiana rezerwacji przy ręcznym zleceniu — sprawdź możliwość wejścia.";
    if (["ACCEPTED", "FORCED"].includes(task.status)) {
      task.status = "OFFERED";
      task.offerSequence++;
    }
    task.version++;
  }
  task.name = option.label;
  task.address = option.address;
  task.imageUrl = option.imageUrl;
}
