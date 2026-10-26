import { Prisma, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { buildCleaningOverview } from "./overview";
import { cleaningAccountId, getCleaningSnapshot } from "./snapshot";
import { readGuestCounts } from "./guest-counts";
import { revision } from "@/server/idobooking/operations";
import {
  activeTask,
  effectiveStays,
  emptyState,
  localNow,
  offerNext,
  rulesSchema,
  type Task,
  type Worker,
  type WorkforceState,
  type Adjustment,
} from "./workforce-domain";

export function decodeState(value: unknown): WorkforceState {
  if (
    !value ||
    typeof value !== "object" ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("tasks" in value) ||
    !Array.isArray(value.tasks) ||
    !("adjustments" in value) ||
    !Array.isArray(value.adjustments) ||
    !("ledger" in value) ||
    !Array.isArray(value.ledger)
  )
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nieobsługiwana wersja danych cleaning",
    });
  const state = value as WorkforceState;
  state.credentialVersions ??= {};
  state.profileRequests ??= [];
  state.passwordHelp ??= [];
  state.sourceCoverage ??= {};
  return state;
}
export async function readWorkforce(db: PrismaClient) {
  const accountId = cleaningAccountId();
  const workspace = await db.cleaningWorkspace.findUnique({
    where: { id: accountId },
  });
  return {
    accountId,
    revision: workspace?.revision ?? 0,
    state: workspace ? decodeState(workspace.state) : emptyState(),
  };
}
export const asJson = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export async function workersIn(
  tx: Prisma.TransactionClient,
): Promise<Worker[]> {
  const users = await tx.cleaningUser.findMany({
    where: { role: "CLEANER" },
    select: { id: true, cleaningProfile: true },
  });
  return users.flatMap((u) =>
    u.cleaningProfile
      ? [
          {
            id: u.id,
            name: u.cleaningProfile.displayName,
            active: u.cleaningProfile.active,
            dailyLimit: u.cleaningProfile.dailyLimit,
            rules: rulesSchema.parse(u.cleaningProfile.rules),
          },
        ]
      : [],
  );
}
/** All assignment, profile-rule and ledger writes serialize on the same workspace row.
 * A transaction retry recomputes availability and balance; no lost updates or double offers. */
export async function changeWorkforce<T>(
  db: PrismaClient,
  actor: string,
  kind: string,
  action: (
    state: WorkforceState,
    tx: Prisma.TransactionClient,
    workers: Worker[],
  ) => Promise<T> | T,
  taskId?: string,
) {
  const accountId = cleaningAccountId();
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const row = await tx.cleaningWorkspace.upsert({
            where: { id: accountId },
            create: { id: accountId, state: asJson(emptyState()) },
            update: { revision: { increment: 1 } },
          });
          const state = decodeState(row.state),
            workers = await workersIn(tx);
          const result = await action(state, tx, workers);
          await tx.cleaningWorkspace.update({
            where: { id: accountId },
            data: { state: asJson(state) },
          });
          await tx.cleaningAuditEvent.create({
            data: {
              workspaceId: accountId,
              actor,
              kind,
              taskId,
              data: {
                taskVersion: taskId
                  ? (state.tasks.find((t) => t.id === taskId)?.version ?? null)
                  : null,
              },
            },
          });
          await maintainOutbox(tx, accountId, state);
          return result;
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 10000,
          timeout: 30000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 3
      )
        continue;
      if (error instanceof TRPCError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "Dane zmieniły się podczas zapisu. Odśwież i spróbuj ponownie.",
        });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          error instanceof Error
            ? error.message
            : "Nie udało się zapisać zmiany",
      });
    }
  }
  throw new TRPCError({ code: "CONFLICT" });
}
async function maintainOutbox(
  tx: Prisma.TransactionClient,
  accountId: string,
  state: WorkforceState,
) {
  const now = localNow(),
    today = now.slice(0, 10),
    end = new Date(Date.parse(today + "T00:00Z") + 5 * 86400000)
      .toISOString()
      .slice(0, 10);
  const current = state.tasks.filter(
    (t) =>
      t.userId &&
      ["OFFERED", "ACCEPTED", "FORCED"].includes(t.status) &&
      t.serviceDate >= today &&
      t.serviceDate < end &&
      t.start &&
      t.start.slice(0, 16) >= now,
  );
  const keys = current.map((t) => `${t.id}:offer:${t.offerSequence ?? 0}`);
  await tx.cleaningNotification.updateMany({
    where: {
      workspaceId: accountId,
      status: { in: ["QUEUED", "MISSING_PHONE"] },
      dedupeKey: { notIn: keys },
    },
    data: { status: "SUPERSEDED" },
  });
  if (!current.length) return;
  const [profiles, existing] = await Promise.all([
    tx.cleaningProfile.findMany({
      where: {
        userId: { in: [...new Set(current.map((task) => task.userId!))] },
      },
      select: { userId: true, phone: true },
    }),
    tx.cleaningNotification.findMany({
      where: { workspaceId: accountId, dedupeKey: { in: keys } },
      select: { dedupeKey: true, phone: true, status: true },
    }),
  ]);
  const phones = new Map(
    profiles.map((profile) => [profile.userId, profile.phone]),
  );
  const byKey = new Map(
    existing.map((notification) => [notification.dedupeKey, notification]),
  );
  const creates: Prisma.CleaningNotificationCreateManyInput[] = [];
  const changes = new Map<
    string,
    { phone: string | null; status: "QUEUED" | "MISSING_PHONE"; keys: string[] }
  >();
  for (let i = 0; i < current.length; i++) {
    const task = current[i]!,
      key = keys[i]!,
      phone = phones.get(task.userId!) ?? null;
    const status = phone ? ("QUEUED" as const) : ("MISSING_PHONE" as const);
    const notification = byKey.get(key);
    if (!notification) {
      creates.push({
        workspaceId: accountId,
        taskId: task.id,
        userId: task.userId!,
        dedupeKey: key,
        phone,
        status,
        payload: {
          apartment: task.name,
          date: task.serviceDate,
          start: task.start,
          end: task.end,
          transport: "whatsapp-mcp",
          deliveryEnabled: false,
        },
      });
    } else if (
      ["QUEUED", "MISSING_PHONE"].includes(notification.status) &&
      (notification.phone !== phone || notification.status !== status)
    ) {
      const groupKey = JSON.stringify([phone, status]);
      const group = changes.get(groupKey) ?? { phone, status, keys: [] };
      group.keys.push(key);
      changes.set(groupKey, group);
    }
  }
  if (creates.length)
    await tx.cleaningNotification.createMany({
      data: creates,
      skipDuplicates: true,
    });
  for (const change of changes.values()) {
    await tx.cleaningNotification.updateMany({
      where: {
        workspaceId: accountId,
        dedupeKey: { in: change.keys },
        status: { in: ["QUEUED", "MISSING_PHONE"] },
      },
      data: {
        phone: change.phone,
        status: change.status,
      },
    });
  }
}
export async function sourceForWorkforce(
  db: PrismaClient,
  from: string,
  to: string,
  forceRefresh = false,
) {
  const local = await readWorkforce(db);
  const snapshot = await operationalSnapshot(
    from,
    to,
    forceRefresh,
    local.state.adjustments,
  );
  if (Date.now() - Date.parse(snapshot.fetchedAt) > 300000)
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "Odczyt rezerwacji jest nieaktualny",
    });
  const [apartments, archived, counts] = await Promise.all([
    db.apartment.findMany({
      where: { archived: false },
      select: {
        id: true,
        name: true,
        idobookingId: true,
        address: true,
        images: { select: { url: true, isPrimary: true, order: true } },
        rooms: { select: { code: true } },
      },
    }),
    db.apartment.findMany({
      where: {
        archived: true,
        idobookingId: { in: snapshot.units.map((u) => u.id) },
      },
      select: { idobookingId: true },
    }),
    readGuestCounts([...new Set(snapshot.stays.map((s) => s.id))]),
  ]);
  return {
    snapshot,
    counts,
    context: {
      accountId: snapshot.accountId,
      apartments,
      archivedUnitIds: new Set(
        archived.flatMap((a) =>
          a.idobookingId === null ? [] : [a.idobookingId],
        ),
      ),
    },
  };
}
export type WorkforceSource = Awaited<ReturnType<typeof sourceForWorkforce>>;
/** A late checkout can cross midnight. Include the previous source day before
 * applying local adjustments, even when it is outside the displayed range. */
export async function operationalSnapshot(
  from: string,
  to: string,
  forceRefresh: boolean,
  adjustments: Adjustment[],
) {
  if (!adjustments.some((a) => a.lateMinutes > 0))
    return getCleaningSnapshot(from, to, { forceRefresh });
  const previous = new Date(Date.parse(from + "T00:00Z") - 86400000)
    .toISOString()
    .slice(0, 10);
  const days =
    (Date.parse(to + "T00:00Z") - Date.parse(from + "T00:00Z")) / 86400000;
  if (days <= 30)
    return {
      ...(await getCleaningSnapshot(previous, to, { forceRefresh })),
      from,
    };
  const current = await getCleaningSnapshot(from, to, { forceRefresh });
  const back = await getCleaningSnapshot(previous, from, { forceRefresh });
  if (
    current.accountId !== back.accountId ||
    JSON.stringify(current.units) !== JSON.stringify(back.units)
  )
    throw new Error("Katalog zmienił się podczas odczytu");
  const stays = new Map(back.stays.map((s) => [`${s.id}:${s.unitId}`, s]));
  current.stays.forEach((s) => stays.set(`${s.id}:${s.unitId}`, s));
  const locks = new Map((back.locks ?? []).map((l) => [l.id, l]));
  (current.locks ?? []).forEach((l) => locks.set(l.id, l));
  return {
    ...current,
    stays: [...stays.values()],
    locks: [...locks.values()],
    fetchedAt:
      current.fetchedAt < back.fetchedAt ? current.fetchedAt : back.fetchedAt,
  };
}
export function reconcileState(
  state: WorkforceState,
  source: WorkforceSource,
  workers: Worker[],
  now: string,
  options: { autoOffer?: boolean } = {},
) {
  const fetchedAt = Date.parse(source.snapshot.fetchedAt);
  if (!Number.isFinite(fetchedAt))
    throw new Error("Nieprawidłowy czas odczytu źródła");
  const coveredDates: string[] = [];
  for (
    let day = source.snapshot.from;
    day < source.snapshot.to;
    day = new Date(Date.parse(day + "T00:00Z") + 86400000)
      .toISOString()
      .slice(0, 10)
  )
    coveredDates.push(day);
  const coverage = state.sourceCoverage ?? {};
  if (
    coveredDates.some(
      (day) => coverage[day] && fetchedAt < Date.parse(coverage[day]),
    )
  )
    throw new Error("Nowszy odczyt został już zapisany. Odśwież rezerwacje.");
  const snapshot = {
    ...source.snapshot,
    stays: effectiveStays(source.snapshot.stays, state.adjustments),
  };
  const all = buildCleaningOverview(snapshot, source.context);
  const seen = new Set<string>();
  for (const candidate of [...all.candidates, ...all.reviews]) {
    seen.add(candidate.id);
    const old = state.tasks.find((t) => t.id === candidate.id);
    if (old?.status === "DONE") continue;
    const stay = snapshot.stays.find(
      (s) =>
        s.id === candidate.afterReservation.id &&
        s.unitId === candidate.unit.unitId,
    )!;
    const next = candidate.beforeReservation
      ? snapshot.stays.find(
          (s) =>
            s.id === candidate.beforeReservation!.id &&
            s.unitId === candidate.unit.unitId,
        )
      : undefined;
    const metadata = {
      id: candidate.id,
      unitId: candidate.unit.unitId,
      reservationId: candidate.afterReservation.id,
      serviceDate: candidate.serviceDate,
      name: candidate.unit.label,
      address: candidate.unit.address,
      imageUrl: candidate.unit.imageUrl,
      stayFrom: stay.from,
      stayTo: stay.to,
      nextFrom: next?.from ?? null,
      nextReservationId: next?.id ?? null,
      nextTo: next?.to ?? null,
      guests: source.counts[`${stay.id}:${stay.unitId}`] ?? null,
      nextGuests: next
        ? (source.counts[`${next.id}:${next.unitId}`] ?? null)
        : null,
      provisional: candidate.certainty === "provisional",
      windows: candidate.windows.map((w) => ({ start: w.start, end: w.end })),
      sourceRevision: revision({
        unitId: candidate.unit.unitId,
        reservationId: stay.id,
        serviceDate: candidate.serviceDate,
        stayFrom: stay.from,
        stayTo: stay.to,
        nextReservationId: next?.id ?? null,
        nextFrom: next?.from ?? null,
        nextTo: next?.to ?? null,
        guests: source.counts[`${stay.id}:${stay.unitId}`] ?? null,
        nextGuests: next
          ? (source.counts[`${next.id}:${next.unitId}`] ?? null)
          : null,
        provisional: candidate.certainty === "provisional",
        windows: candidate.windows.map((w) => ({ start: w.start, end: w.end })),
        eligible: candidate.eligibleForPlanning,
        reviewReasons: candidate.reviewReasons,
      }),
    };
    const task: Task = old ?? {
      ...metadata,
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
    };
    const previousRevision = task.sourceRevision;
    const executionDate = task.serviceDate;
    const ongoing = task.status === "IN_PROGRESS";
    const scheduleChanged =
      old &&
      revision({ day: task.serviceDate, windows: task.windows }) !==
        revision({ day: metadata.serviceDate, windows: metadata.windows });
    Object.assign(task, metadata);
    if (
      old &&
      !ongoing &&
      previousRevision !== task.sourceRevision &&
      !activeTask(task)
    )
      task.version++;
    if (ongoing) task.serviceDate = executionDate;
    else if (scheduleChanged) task.declined = [];
    if (!old) state.tasks.push(task);
    if (!candidate.eligibleForPlanning) {
      if (ongoing) {
        flagOngoingChange(
          task,
          `Zmiana rezerwacji podczas pracy — sprawdź z koordynatorem: ${candidate.reviewReasons.join(", ")}`,
          previousRevision !== task.sourceRevision,
        );
        continue;
      }
      if (task.status !== "REVIEW" || task.userId !== null) task.version++;
      Object.assign(task, {
        status: "REVIEW",
        userId: null,
        start: null,
        end: null,
        entryApproved: false,
        alert: candidate.reviewReasons.join(", "),
      });
      continue;
    }
    if (["REVIEW", "CANCELLED"].includes(task.status)) {
      task.status = "UNASSIGNED";
      task.alert = null;
      task.version++;
    }
    if (task.userId && activeTask(task)) {
      const worker = workers.find((w) => w.id === task.userId);
      const start = task.start?.slice(0, 16),
        end = task.end?.slice(0, 16);
      const valid =
        worker &&
        start &&
        end &&
        worker.active &&
        task.windows.some(
          (w) => start >= w.start.slice(0, 16) && end <= w.end.slice(0, 16),
        ) &&
        !worker.rules.unavailableDates.includes(task.serviceDate) &&
        !worker.rules.unavailableWeekdays.includes(
          new Date(task.serviceDate + "T12:00Z").getUTCDay(),
        ) &&
        !worker.rules.excludedUnitIds.includes(task.unitId) &&
        state.tasks.filter(
          (t) =>
            t.id !== task.id &&
            t.userId === task.userId &&
            t.serviceDate === task.serviceDate &&
            activeTask(t),
        ).length < worker.dailyLimit &&
        !state.tasks.some(
          (t) =>
            t.id !== task.id &&
            t.userId === task.userId &&
            activeTask(t) &&
            t.start &&
            t.end &&
            start < t.end.slice(0, 16) &&
            end > t.start.slice(0, 16),
        );
      if (!valid) {
        if (task.status === "IN_PROGRESS") {
          flagOngoingChange(
            task,
            "Zmiana rezerwacji lub dostępności podczas pracy — skontaktuj się z koordynatorem",
            previousRevision !== task.sourceRevision,
          );
        } else offerNext(task, workers, state.tasks, now);
      } else if (
        previousRevision !== task.sourceRevision &&
        task.status === "IN_PROGRESS"
      ) {
        flagOngoingChange(
          task,
          "Dane rezerwacji zmieniły się podczas pracy — skontaktuj się z koordynatorem",
          true,
        );
      } else if (
        previousRevision !== task.sourceRevision &&
        task.status !== "IN_PROGRESS"
      ) {
        task.status = "OFFERED";
        task.offerSequence = (task.offerSequence ?? 0) + 1;
        task.entryApproved = false;
        task.version++;
        task.alert = "Godziny rezerwacji zmieniły się. Potwierdź ponownie.";
      }
    }
  }
  for (const task of state.tasks) {
    if (
      task.status === "DONE" ||
      seen.has(task.id) ||
      task.serviceDate < snapshot.from ||
      task.serviceDate >= snapshot.to
    )
      continue;
    const stay = snapshot.stays.find(
      (s) => s.id === task.reservationId && s.unitId === task.unitId,
    );
    if (task.status === "IN_PROGRESS") {
      const changedRevision = revision({
        reservationId: task.reservationId,
        unitId: task.unitId,
        stay: stay ?? null,
        excluded: all.excluded.some((e) => e.id === task.id),
      });
      flagOngoingChange(
        task,
        "Rezerwacja zniknęła, została anulowana lub zmieniła termin podczas pracy — skontaktuj się z koordynatorem",
        changedRevision !== task.sourceRevision,
      );
      task.sourceRevision = changedRevision;
      continue;
    }
    // Missing or moved records cannot be called a cancellation. Withdraw from planning for coordinator review.
    task.status = all.excluded.some((e) => e.id === task.id)
      ? "CANCELLED"
      : "REVIEW";
    task.alert = stay
      ? "Rezerwacja zmieniła termin lub kwalifikację"
      : "Rezerwacja nie występuje w aktualnym odczycie — sprawdź źródło";
    task.userId = null;
    task.start = null;
    task.end = null;
    task.entryApproved = false;
    task.version++;
  }
  const horizon = new Date(
    Date.parse(now.slice(0, 10) + "T00:00Z") + 5 * 86400000,
  )
    .toISOString()
    .slice(0, 10);
  for (const task of state.tasks
    .filter(
      (t) =>
        options.autoOffer !== false &&
        t.status === "UNASSIGNED" &&
        t.serviceDate >= now.slice(0, 10) &&
        t.serviceDate < horizon,
    )
    .sort(
      (a, b) =>
        a.serviceDate.localeCompare(b.serviceDate) || a.id.localeCompare(b.id),
    ))
    offerNext(task, workers, state.tasks, now);
  for (const day of coveredDates)
    coverage[day] = new Date(fetchedAt).toISOString();
  state.sourceCoverage = coverage;
  if (!state.lastSync || fetchedAt > Date.parse(state.lastSync))
    state.lastSync = new Date(fetchedAt).toISOString();
  return {
    ready: all.candidates.length,
    review: all.reviews.length,
    lastSync: state.lastSync,
  };
}

function flagOngoingChange(
  task: Task,
  message: string,
  sourceChanged: boolean,
) {
  if (sourceChanged || task.alert !== message || task.entryApproved)
    task.version++;
  task.alert = message;
  task.entryApproved = false;
  // Keep IN_PROGRESS, owner, execution date and slot: physical work still reserves capacity.
}

/** Refresh from this task's day through the maximum supported source horizon.
 * This retains a later next reservation previously visible in a 31-day calendar. */
export async function refreshTaskBeforeDecision(
  db: PrismaClient,
  actor: string,
  taskId: string,
  dependencies = { read: readWorkforce, synchronize: synchronizeWorkforce },
) {
  const current = await dependencies.read(db);
  const task = current.state.tasks.find((item) => item.id === taskId);
  if (!task) throw new TRPCError({ code: "NOT_FOUND" });
  const from = task.serviceDate;
  const to = new Date(Date.parse(from + "T00:00Z") + 31 * 86400000)
    .toISOString()
    .slice(0, 10);
  return dependencies.synchronize(db, actor, from, to, true, {
    autoOffer: false,
  });
}
export async function synchronizeWorkforce(
  db: PrismaClient,
  actor: string,
  from: string,
  to: string,
  forceRefresh = false,
  options: { autoOffer?: boolean } = {},
) {
  const source = await sourceForWorkforce(db, from, to, forceRefresh);
  return changeWorkforce(
    db,
    actor,
    "SOURCE_RECONCILED",
    (state, _tx, workers) =>
      reconcileState(state, source, workers, localNow(), options),
  );
}
