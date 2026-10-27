import { z } from "zod";
import { localIso } from "./candidates";
import { CHECKLIST, PHOTO_GROUPS } from "@/lib/cleaning-workforce";
export { CHECKLIST, PHOTO_GROUPS, REWARDS } from "@/lib/cleaning-workforce";

export const rulesSchema = z.object({
  version: z.literal(1).default(1),
  unavailableDates: z.array(z.string().date()).max(366).default([]),
  unavailableWeekdays: z
    .array(z.number().int().min(0).max(6))
    .max(7)
    .default([]),
  excludedUnitIds: z.array(z.number().int().positive()).max(200).default([]),
  note: z.string().max(1000).default(""),
});
export type Rules = z.infer<typeof rulesSchema>;
export const photoSchema = z
  .string()
  .max(280000)
  .refine((s) => {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(s))
      return false;
    const b = Buffer.from(s.split(",")[1]!, "base64");
    return (
      b.length <= 200000 &&
      b.length > 12 &&
      ((s.startsWith("data:image/jpeg") &&
        b[0] === 255 &&
        b[1] === 216 &&
        b[2] === 255) ||
        (s.startsWith("data:image/png") &&
          b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") ||
        (s.startsWith("data:image/webp") &&
          b.subarray(0, 4).toString() === "RIFF" &&
          b.subarray(8, 12).toString() === "WEBP"))
    );
  }, "Wybierz zdjęcie JPG, PNG lub WebP do 200 kB.");
export const adjustmentMinutes = z
  .number()
  .int()
  .min(0)
  .max(210)
  .multipleOf(30);
export type Worker = {
  id: number;
  name: string;
  active: boolean;
  dailyLimit: number;
  rules: Rules;
};
export type TaskStatus =
  | "UNASSIGNED"
  | "OFFERED"
  | "ACCEPTED"
  | "FORCED"
  | "IN_PROGRESS"
  | "DONE"
  | "REVIEW"
  | "CANCELLED";
export type Task = {
  id: string;
  unitId: number;
  reservationId: number | null;
  serviceDate: string;
  name: string;
  address: string | null;
  imageUrl: string | null;
  stayFrom: string | null;
  stayTo: string | null;
  nextFrom: string | null;
  nextReservationId: number | null;
  nextTo: string | null;
  guests: number | null;
  nextGuests: number | null;
  provisional: boolean;
  windows: { start: string; end: string }[];
  sourceRevision: string;
  status: TaskStatus;
  userId: number | null;
  start: string | null;
  end: string | null;
  declined: number[];
  version: number;
  offerSequence: number;
  alert: string | null;
  forcedReason: string | null;
  checks: string[];
  extraItems: string[];
  photos: { id: string; category: string }[];
  rewardCents: number;
  rewardPoints: number;
  startedAt: string | null;
  completedAt: string | null;
  entryApproved: boolean;
  manual?: {
    reason: string;
    requestId: string;
    createdAt: string;
    sourceRevision: string;
    conflicts: {
      id: number;
      kind: "reservation" | "lock";
      from: string;
      to: string;
    }[];
  };
};
export type Adjustment = {
  reservationId: number;
  unitId: number;
  earlyMinutes: number;
  lateMinutes: number;
};
export type Ledger = {
  id: string;
  userId: number;
  kind: "EARN" | "PAYOUT" | "REDEEM";
  cents: number;
  points: number;
  stars: number;
  taskId: string | null;
  status: "REQUESTED" | "APPROVED" | "COMPLETED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  option: string | null;
};
export type WorkforceState = {
  schemaVersion: 1;
  tasks: Task[];
  adjustments: Adjustment[];
  ledger: Ledger[];
  lastSync: string | null;
  sourceCoverage?: Record<string, string>;
  credentialVersions: Record<string, number>;
  profileRequests: {
    id: string;
    userId: number;
    displayName: string;
    phone: string | null;
    email: string;
    reason: string;
    status: "REQUESTED" | "APPROVED" | "REJECTED";
    createdAt: string;
  }[];
  passwordHelp: { userId: number; createdAt: string; resolved: boolean }[];
};
export const emptyState = (): WorkforceState => ({
  schemaVersion: 1,
  tasks: [],
  adjustments: [],
  ledger: [],
  lastSync: null,
  sourceCoverage: {},
  credentialVersions: {},
  profileRequests: [],
  passwordHelp: [],
});
export const activeTask = (t: Task) =>
  ["OFFERED", "ACCEPTED", "FORCED", "IN_PROGRESS", "DONE"].includes(t.status);
export function localNow(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(now)
    .replace(" ", "T");
}
export function shiftLocal(value: string, minutes: number) {
  return new Date(Date.parse(value.slice(0, 16) + ":00Z") + minutes * 60000)
    .toISOString()
    .slice(0, 16);
}
export function effectiveStays<
  T extends { id: number; unitId: number; from: string; to: string },
>(stays: T[], adjustments: Adjustment[]): T[] {
  return stays.map((s) => {
    const a = adjustments.find(
      (a) => a.reservationId === s.id && a.unitId === s.unitId,
    );
    return a
      ? {
          ...s,
          from: shiftLocal(s.from, -a.earlyMinutes),
          to: shiftLocal(s.to, a.lateMinutes),
        }
      : s;
  });
}
export function slotFor(
  task: Task,
  worker: Worker,
  tasks: Task[],
  now: string,
  force = false,
): { start: string; end: string } | null {
  if (
    !worker.active ||
    worker.dailyLimit < 1 ||
    worker.dailyLimit > 4 ||
    (!force && task.declined.includes(worker.id))
  )
    return null;
  if (
    worker.rules.unavailableDates.includes(task.serviceDate) ||
    worker.rules.unavailableWeekdays.includes(
      new Date(task.serviceDate + "T12:00Z").getUTCDay(),
    ) ||
    worker.rules.excludedUnitIds.includes(task.unitId)
  )
    return null;
  const assigned = tasks.filter(
    (t) =>
      t.id !== task.id &&
      t.userId === worker.id &&
      t.serviceDate === task.serviceDate &&
      activeTask(t),
  );
  if (assigned.length >= worker.dailyLimit) return null;
  for (const window of task.windows) {
    let start = window.start.slice(0, 16);
    // Round up, never shorten the required sixty minutes.
    const minutes = Number(start.slice(14));
    if (minutes % 30) start = shiftLocal(start, 30 - (minutes % 30));
    for (
      ;
      shiftLocal(start, 60) <= window.end.slice(0, 16);
      start = shiftLocal(start, 30)
    ) {
      const end = shiftLocal(start, 60);
      if (
        start < now ||
        start.slice(0, 10) !== task.serviceDate ||
        start.slice(11) < "10:00" ||
        end.slice(11) > "15:00"
      )
        continue;
      if (
        assigned.some(
          (t) =>
            t.start &&
            t.end &&
            start < t.end.slice(0, 16) &&
            end > t.start.slice(0, 16),
        )
      )
        continue;
      return { start: localIso(start), end: localIso(end) };
    }
  }
  return null;
}
export function offerNext(
  task: Task,
  workers: Worker[],
  tasks: Task[],
  now: string,
  selectedId?: number,
  force = false,
) {
  const sorted = workers
    .filter((w) => selectedId === undefined || w.id === selectedId)
    .sort((a, b) => {
      const load = (id: number) =>
        tasks.filter(
          (t) =>
            t.id !== task.id &&
            t.userId === id &&
            t.serviceDate === task.serviceDate &&
            activeTask(t),
        ).length;
      return load(a.id) - load(b.id) || a.id - b.id;
    });
  for (const worker of sorted) {
    const slot = slotFor(task, worker, tasks, now, force);
    if (!slot) continue;
    Object.assign(task, slot, {
      userId: worker.id,
      status: force ? "FORCED" : "OFFERED",
      alert: null,
      version: task.version + 1,
      offerSequence: (task.offerSequence ?? 0) + 1,
      checks: [],
      photos: [],
      startedAt: null,
      entryApproved: false,
      forcedReason: null,
    });
    return true;
  }
  if (selectedId !== undefined)
    throw new Error(
      "Wybrana osoba nie ma bezpiecznego terminu: sprawdź limit 4, dostępność i kolizje.",
    );
  const alert =
    "Brak dostępnej osoby lub wszyscy odmówili. Wymagany przydział koordynatora.";
  const changed =
    task.status !== "UNASSIGNED" ||
    task.userId !== null ||
    task.start !== null ||
    task.end !== null ||
    task.entryApproved ||
    task.forcedReason !== null ||
    task.alert !== alert;
  Object.assign(task, {
    status: "UNASSIGNED",
    userId: null,
    start: null,
    end: null,
    entryApproved: false,
    forcedReason: null,
    alert,
    version: task.version + Number(changed),
  });
  return false;
}
export function respond(
  task: Task,
  userId: number,
  version: number,
  accept: boolean,
  workers: Worker[],
  tasks: Task[],
  now: string,
) {
  if (
    task.userId !== userId ||
    task.version !== version ||
    !["OFFERED", "ACCEPTED"].includes(task.status)
  )
    throw new Error("Przydział zmienił się. Odśwież listę.");
  if (!task.start || task.start.slice(0, 16) < now)
    throw new Error("Termin minął. Skontaktuj się z koordynatorem.");
  if (accept) {
    task.status = "ACCEPTED";
    task.version++;
  } else {
    task.declined = [...new Set([...task.declined, userId])];
    offerNext(task, workers, tasks, now);
  }
}
export const checklistKeys = (task: Task) => [
  ...CHECKLIST.flatMap((g) => g.items.map((_, i) => `${g.id}:${i}`)),
  ...task.extraItems.map((_, i) => `extra:${i}`),
];
export function completeTask(
  task: Task,
  userId: number,
  now: string,
  instant: string,
) {
  if (task.userId !== userId || task.status !== "IN_PROGRESS")
    throw new Error("Najpierw rozpocznij swoje sprzątanie.");
  if (
    now.slice(0, 10) !== task.serviceDate ||
    now.slice(11) < "10:00" ||
    now.slice(11) > "15:00"
  )
    throw new Error(
      "Zakończenie wymaga potwierdzenia w dniu sprzątania, 10:00–15:00.",
    );
  if (
    !checklistKeys(task).every((k) => task.checks.includes(k)) ||
    !PHOTO_GROUPS.every((c) => task.photos.some((p) => p.category === c))
  )
    throw new Error(
      "Wykonaj całą checklistę i dodaj zdjęcie kuchni, pokoju oraz łazienki.",
    );
  task.status = "DONE";
  task.completedAt = instant;
  task.version++;
}
export function balance(ledger: Ledger[], userId: number) {
  return ledger
    .filter((l) => l.userId === userId && l.status !== "REJECTED")
    .reduce(
      (a, l) => ({
        cents: a.cents + l.cents,
        points: a.points + l.points,
        stars: a.stars + l.stars,
      }),
      { cents: 0, points: 0, stars: 0 },
    );
}
