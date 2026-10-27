import { afterEach, describe, expect, it, vi } from "vitest";
import {
  adjustmentMinutes,
  balance,
  checklistKeys,
  completeTask,
  effectiveStays,
  emptyState,
  offerNext,
  photoSchema,
  respond,
  rulesSchema,
  slotFor,
  type Task,
  type Worker,
} from "./workforce-domain";
vi.mock("./snapshot", () => ({
  cleaningAccountId: () => "test-account",
  getCleaningSnapshot: vi.fn(),
}));
vi.mock("./guest-counts", () => ({ readGuestCounts: vi.fn(async () => ({})) }));
vi.mock("@/env", () => ({ env: { CLEANING_JWT_SECRET: "test-only-secret" } }));
vi.mock("@/server/api/trpc", async () => {
  const { initTRPC } = await import("@trpc/server");
  const t = initTRPC.create();
  return { publicProcedure: t.procedure, createTRPCRouter: t.router };
});
import {
  reconcileState,
  refreshTaskBeforeDecision,
  type WorkforceSource,
} from "./workforce-store";
import { getCleaningSnapshot } from "./snapshot";
import { cleaningWorkforceRouter } from "@/server/api/routers/cleaning-workforce";
afterEach(() => vi.useRealTimers());

export function worker(id = 1, overrides: Partial<Worker> = {}): Worker {
  return {
    id,
    name: `Osoba ${id}`,
    active: true,
    dailyLimit: 4,
    rules: rulesSchema.parse({}),
    ...overrides,
  };
}
export function task(id = "a", overrides: Partial<Task> = {}): Task {
  return {
    id,
    unitId: 50,
    reservationId: 4720,
    serviceDate: "2026-10-26",
    name: "Apartament testowy",
    address: "Adres",
    imageUrl: null,
    stayFrom: "2026-10-24T15:00",
    stayTo: "2026-10-26T10:00",
    nextFrom: "2026-10-26T15:00",
    nextReservationId: 4721,
    nextTo: "2026-10-28T10:00",
    guests: 2,
    nextGuests: 3,
    provisional: true,
    windows: [
      { start: "2026-10-26T10:00:00+01:00", end: "2026-10-26T15:00:00+01:00" },
    ],
    sourceRevision: "initial",
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
    rewardCents: 5000,
    rewardPoints: 50,
    startedAt: null,
    completedAt: null,
    entryApproved: false,
    ...overrides,
  };
}
const now = "2026-10-26T09:00";
describe("workforce assignment safety", () => {
  it("fits four full hour cleanings, rejects fifth even when forced", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => task(String(i)));
    for (const t of tasks.slice(0, 4))
      expect(offerNext(t, [worker()], tasks, now)).toBe(true);
    expect(tasks.slice(0, 4).map((t) => t.start?.slice(11, 16))).toEqual([
      "10:00",
      "11:00",
      "12:00",
      "13:00",
    ]);
    expect(offerNext(tasks[4]!, [worker()], tasks, now)).toBe(false);
    expect(tasks[4]?.alert).toMatch(/Brak dostępnej/);
    expect(() => offerNext(tasks[4]!, [worker()], tasks, now, 1, true)).toThrow(
      /limit 4/,
    );
  });
  it("counts offered, forced, accepted, ongoing and finished work toward daily cap", () => {
    for (const status of [
      "OFFERED",
      "ACCEPTED",
      "FORCED",
      "IN_PROGRESS",
      "DONE",
    ] as const) {
      const assigned = Array.from({ length: 4 }, (_, i) =>
        task(`old${i}`, {
          status,
          userId: 1,
          start: `2026-10-26T${10 + i}:00:00+01:00`,
          end: `2026-10-26T${11 + i}:00:00+01:00`,
        }),
      );
      expect(slotFor(task("new"), worker(), assigned, now)).toBeNull();
    }
  });
  it("balances workload before choosing a fourth assignment", () => {
    const tasks = Array.from({ length: 7 }, (_, i) => task(String(i)));
    for (const t of tasks) offerNext(t, [worker(1), worker(2)], tasks, now);
    expect(tasks.filter((t) => t.userId === 1)).toHaveLength(4);
    expect(tasks.filter((t) => t.userId === 2)).toHaveLength(3);
  });
  it("remembers rejections, offers the next person, and alerts when everyone declines", () => {
    const t = task(),
      workers = [worker(1), worker(2)];
    offerNext(t, workers, [t], now);
    respond(t, 1, t.version, false, workers, [t], now);
    expect(t.userId).toBe(2);
    expect(t.declined).toEqual([1]);
    respond(t, 2, t.version, false, workers, [t], now);
    expect(t.status).toBe("UNASSIGNED");
    expect(t.userId).toBeNull();
    expect(t.declined).toEqual([1, 2]);
    expect(offerNext(t, workers, [t], now)).toBe(false);
    offerNext(t, workers, [t], now, 1, true);
    expect(t.status).toBe("FORCED");
    expect(t.userId).toBe(1);
    expect(t.offerSequence).toBe(3);
  });
  it("rejects stale and foreign acceptance and supports giving back accepted work", () => {
    const t = task(),
      workers = [worker(1), worker(2)];
    offerNext(t, workers, [t], now);
    expect(() => respond(t, 2, t.version, true, workers, [t], now)).toThrow();
    expect(() =>
      respond(t, 1, t.version - 1, true, workers, [t], now),
    ).toThrow();
    respond(t, 1, t.version, true, workers, [t], now);
    expect(t.status).toBe("ACCEPTED");
    respond(t, 1, t.version, false, workers, [t], now);
    expect(t.userId).toBe(2);
  });
  it("never bypasses unavailable dates, weekdays, excluded units or inactive status", () => {
    const rules = [
      rulesSchema.parse({ unavailableDates: ["2026-10-26"] }),
      rulesSchema.parse({ unavailableWeekdays: [1] }),
      rulesSchema.parse({ excludedUnitIds: [50] }),
    ];
    for (const r of rules)
      expect(
        slotFor(task(), worker(1, { rules: r }), [], now, true),
      ).toBeNull();
    expect(
      slotFor(task(), worker(1, { active: false }), [], now, true),
    ).toBeNull();
    expect(
      slotFor(task(), worker(1, { dailyLimit: 5 }), [], now, true),
    ).toBeNull();
  });
  it("does not start before 10, end after 15, use past slots, or shorten sixty minutes", () => {
    expect(
      slotFor(
        task("late", {
          windows: [
            {
              start: "2026-10-26T14:30:00+01:00",
              end: "2026-10-26T15:00:00+01:00",
            },
          ],
        }),
        worker(),
        [],
        now,
      ),
    ).toBeNull();
    expect(slotFor(task(), worker(), [], "2026-10-26T14:01")).toBeNull();
    expect(slotFor(task(), worker(), [], "2026-10-26T11:01")?.start).toContain(
      "11:30",
    );
    expect(
      slotFor(
        task("odd", {
          windows: [
            {
              start: "2026-10-26T10:05:00+01:00",
              end: "2026-10-26T11:30:00+01:00",
            },
          ],
        }),
        worker(),
        [],
        now,
      )?.start,
    ).toContain("10:30");
  });
  it("honors a lower employee-specific cap", () => {
    const w = worker(1, { dailyLimit: 1 }),
      a = task("a"),
      b = task("b");
    offerNext(a, [w], [a, b], now);
    expect(offerNext(b, [w], [a, b], now)).toBe(false);
  });
  it("requires a new entry approval when work is offered to another person or becomes unassigned", () => {
    const t = task("approved", {
      userId: 1,
      status: "ACCEPTED",
      entryApproved: true,
      forcedReason: "Old reason",
    });
    offerNext(t, [worker(2)], [t], now, 2);
    expect(t.userId).toBe(2);
    expect(t.entryApproved).toBe(false);
    expect(t.forcedReason).toBeNull();
    t.entryApproved = true;
    offerNext(t, [], [t], now);
    expect(t.status).toBe("UNASSIGNED");
    expect(t.entryApproved).toBe(false);
  });
  it("does not change an exhausted proposal version merely because no worker became available", () => {
    const t = task("exhausted", { declined: [1, 2] });
    const workers = [worker(1), worker(2)];
    offerNext(t, workers, [t], now);
    const version = t.version;
    offerNext(t, workers, [t], now);
    expect(t.version).toBe(version);
    offerNext(t, workers, [t], now, 1, true);
    expect(t.status).toBe("FORCED");
    expect(t.version).toBeGreaterThan(version);
  });
});

/** An in-memory transaction harness; no Prisma connection or external writes are used. */
function transactionHarness(
  initial = emptyState(),
  notifications: {
    dedupeKey: string;
    phone: string | null;
    status: "QUEUED" | "MISSING_PHONE" | "DELIVERED";
  }[] = [],
) {
  let stored = structuredClone(initial);
  const photoUpdate = vi.fn(async () => ({}));
  const audit = vi.fn(async () => ({}));
  const profiles = vi.fn(async () => [
    { userId: 1, phone: "+48123456789" },
    { userId: 2, phone: null },
  ]);
  const notificationFind = vi.fn(async () => notifications);
  const notificationCreate = vi.fn(async (_args: unknown) => ({}));
  const notificationUpdate = vi.fn(async (_args: unknown) => ({}));
  const db = {
    cleaningWorkspace: {
      findUnique: vi.fn(async () => ({
        state: structuredClone(stored),
        revision: 1,
      })),
    },
    cleaningUser: {
      findUnique: vi.fn(async () => ({
        id: 1,
        role: "CLEANER",
        cleaningProfile: { active: true },
      })),
    },
    apartment: {
      findMany: vi.fn(async (args: { where: { archived: boolean } }) =>
        args.where.archived ? [] : source().context.apartments,
      ),
    },
    $transaction: async (action: (tx: unknown) => Promise<unknown>) => {
      let pending = structuredClone(stored);
      const tx = {
        cleaningWorkspace: {
          upsert: vi.fn(async () => ({ state: structuredClone(stored) })),
          update: vi.fn(async (args: { data: { state: unknown } }) => {
            pending = structuredClone(args.data.state) as typeof stored;
          }),
        },
        cleaningUser: { findMany: vi.fn(async () => []) },
        cleaningProfile: { update: photoUpdate, findMany: profiles },
        cleaningAuditEvent: { create: audit },
        cleaningNotification: {
          updateMany: notificationUpdate,
          findMany: notificationFind,
          createMany: notificationCreate,
        },
      };
      const result = await action(tx);
      stored = pending;
      return result;
    },
  };
  const caller = (manager = false) =>
    cleaningWorkforceRouter.createCaller({
      db,
      session: null,
      headers: new Headers(),
      cleaningAuth: {
        userId: manager ? "test-admin" : "1",
        role: manager ? "CLEANING_ADMIN" : "CLEANER",
        credentialVersion: 0,
      },
    } as unknown as Parameters<typeof cleaningWorkforceRouter.createCaller>[0]);
  return {
    caller,
    state: () => stored,
    photoUpdate,
    audit,
    profiles,
    notificationFind,
    notificationCreate,
    notificationUpdate,
  };
}

describe("atomic workforce mutation regressions", () => {
  const contact = {
    displayName: "Nowe imię",
    phone: "+48123456789",
    email: "new@example.test",
    reason: "Nowe dane kontaktowe",
  };
  it("rejects a stale claim when the dedicated fresh read materially changes the cleaning window", async () => {
    const initial = emptyState(),
      src = source();
    reconcileState(initial, src, [], now);
    const target = initial.tasks[0]!;
    const harness = transactionHarness(initial);
    vi.mocked(getCleaningSnapshot).mockImplementation(async (from, to) => {
      const snapshot = structuredClone(src.snapshot);
      snapshot.stays[0]!.to = "2026-10-26T11:00";
      return { ...snapshot, from, to, fetchedAt: new Date().toISOString() };
    });
    await expect(
      harness.caller().claim({ taskId: target.id, version: target.version }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(harness.state().tasks[0]?.version).toBeGreaterThan(target.version);
    expect(harness.state().tasks[0]?.userId).toBeNull();
  });
  it("stores a profile photo and contact request in the same transaction without copying photo data into requests", async () => {
    const harness = transactionHarness();
    await harness.caller().requestProfileChange({ ...contact, photo: null });
    expect(harness.photoUpdate).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 1 },
      data: { photo: null },
    });
    expect(harness.state().profileRequests).toHaveLength(1);
    expect(harness.state().profileRequests[0]).not.toHaveProperty("photo");
    expect(harness.state().profileRequests[0]).toMatchObject({
      ...contact,
      status: "REQUESTED",
    });
    expect(harness.audit).toHaveBeenCalledOnce();
  });
  it("publishes neither a request nor an audit entry when the profile photo write fails", async () => {
    const harness = transactionHarness();
    harness.photoUpdate.mockRejectedValueOnce(new Error("Photo write failed"));
    await expect(
      harness.caller().requestProfileChange({ ...contact, photo: null }),
    ).rejects.toThrow("Photo write failed");
    expect(harness.state().profileRequests).toEqual([]);
    expect(harness.audit).not.toHaveBeenCalled();
  });
  it("rejects a second coordinator's stale expected adjustment without overwriting the first change", async () => {
    const harness = transactionHarness();
    vi.mocked(getCleaningSnapshot).mockImplementation(async (from, to) => ({
      ...source().snapshot,
      from,
      to,
      fetchedAt: new Date().toISOString(),
    }));
    const input = {
      reservationId: 4720,
      unitId: 50,
      from: "2026-10-26",
      to: "2026-10-27",
      earlyMinutes: 0,
      lateMinutes: 30,
      expectedAdjustment: { earlyMinutes: 0, lateMinutes: 0 },
    };
    await harness.caller(true).adjustStay(input);
    expect(harness.state().adjustments).toEqual([
      { reservationId: 4720, unitId: 50, earlyMinutes: 0, lateMinutes: 30 },
    ]);
    await expect(
      harness.caller(true).adjustStay({ ...input, lateMinutes: 60 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(harness.state().adjustments[0]?.lateMinutes).toBe(30);
    expect(harness.audit).toHaveBeenCalledOnce();
  });
  it("batches twenty unchanged pending offers without rewriting each notification", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T07:00:00Z"));
    const state = emptyState();
    state.tasks = Array.from({ length: 20 }, (_, i) =>
      task(`offer${i}`, {
        status: "OFFERED",
        userId: Math.floor(i / 4) + 1,
        offerSequence: 1,
        start: `2026-10-26T${10 + (i % 4)}:00:00+01:00`,
        end: `2026-10-26T${11 + (i % 4)}:00:00+01:00`,
      }),
    );
    const notifications = state.tasks.map((t) => ({
      dedupeKey: `${t.id}:offer:1`,
      phone: t.userId === 1 ? "+48123456789" : null,
      status: t.userId === 1 ? ("QUEUED" as const) : ("MISSING_PHONE" as const),
    }));
    const harness = transactionHarness(state, notifications);
    await harness.caller().requestProfileChange(contact);
    expect(harness.profiles).toHaveBeenCalledOnce();
    expect(harness.notificationFind).toHaveBeenCalledOnce();
    expect(harness.notificationCreate).not.toHaveBeenCalled();
    expect(harness.notificationUpdate).toHaveBeenCalledOnce();
    expect(harness.notificationUpdate.mock.calls[0]?.[0]).toMatchObject({
      data: { status: "SUPERSEDED" },
    });
  });
  it("creates new notifications in one batch, changes only pending phones and never touches delivered offers", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T07:00:00Z"));
    const state = emptyState();
    state.tasks = ["delivered", "changed", "new"].map((id, i) =>
      task(id, {
        status: "OFFERED",
        userId: 1,
        offerSequence: 1,
        start: `2026-10-26T${10 + i}:00:00+01:00`,
        end: `2026-10-26T${11 + i}:00:00+01:00`,
      }),
    );
    const harness = transactionHarness(state, [
      {
        dedupeKey: "delivered:offer:1",
        phone: "+48987654321",
        status: "DELIVERED",
      },
      { dedupeKey: "changed:offer:1", phone: null, status: "MISSING_PHONE" },
    ]);
    await harness.caller().requestProfileChange(contact);
    expect(harness.notificationCreate).toHaveBeenCalledOnce();
    expect(harness.notificationCreate.mock.calls[0]?.[0]).toMatchObject({
      skipDuplicates: true,
      data: [
        { dedupeKey: "new:offer:1", phone: "+48123456789", status: "QUEUED" },
      ],
    });
    expect(harness.notificationUpdate).toHaveBeenCalledTimes(2);
    expect(harness.notificationUpdate.mock.calls[1]?.[0]).toMatchObject({
      where: {
        dedupeKey: { in: ["changed:offer:1"] },
        status: { in: ["QUEUED", "MISSING_PHONE"] },
      },
      data: { phone: "+48123456789", status: "QUEUED" },
    });
  });
});
describe("local stay adjustments", () => {
  it("accepts only half-hour increments between zero and 210 minutes", () => {
    for (const n of [0, 30, 60, 210])
      expect(adjustmentMinutes.parse(n)).toBe(n);
    for (const n of [-30, 15, 45, 211, 240, 30.5])
      expect(adjustmentMinutes.safeParse(n).success).toBe(false);
  });
  it("moves only the matching native unit, across midnight when necessary", () => {
    const stays = [
      { id: 1, unitId: 50, from: "2026-10-25T02:00", to: "2026-10-26T23:00" },
      { id: 1, unitId: 51, from: "2026-10-25T15:00", to: "2026-10-26T10:00" },
    ];
    const effective = effectiveStays(stays, [
      { reservationId: 1, unitId: 50, earlyMinutes: 210, lateMinutes: 210 },
    ]);
    expect(effective[0]).toMatchObject({
      from: "2026-10-24T22:30",
      to: "2026-10-27T02:30",
    });
    expect(effective[1]).toEqual(stays[1]);
    expect(stays[0]?.to).toBe("2026-10-26T23:00");
  });
});
describe("completion proof and rewards", () => {
  it("requires ownership, active work, every check and a photo from each room", () => {
    const t = task("proof", {
      status: "IN_PROGRESS",
      userId: 1,
      extraItems: ["Dokup mydło"],
    });
    expect(() => completeTask(t, 2, "2026-10-26T11:00", "instant")).toThrow();
    expect(() => completeTask(t, 1, "2026-10-26T11:00", "instant")).toThrow(
      /checklistę/,
    );
    t.checks = checklistKeys(t);
    t.photos = [{ id: "a", category: "kitchen" }];
    expect(() => completeTask(t, 1, "2026-10-26T11:00", "instant")).toThrow(
      /zdjęcie/,
    );
    t.photos.push(
      { id: "b", category: "room" },
      { id: "c", category: "bathroom" },
    );
    completeTask(t, 1, "2026-10-26T11:00", "instant");
    expect(t.status).toBe("DONE");
    expect(() => completeTask(t, 1, "2026-10-26T11:00", "instant")).toThrow();
  });
  it("rejects SVG, invalid magic bytes, giant and non-image uploads", () => {
    for (const data of [
      "data:image/svg+xml;base64,PHN2Zz4=",
      "data:image/jpeg;base64,PHN2Zz4=",
      "https://example.test/photo.jpg",
      "data:image/png;base64," + "A".repeat(280001),
    ])
      expect(photoSchema.safeParse(data).success).toBe(false);
  });
  it("reserves pending payouts, restores rejected ones, keeps wallets separate", () => {
    const base = {
      id: "a",
      userId: 1,
      taskId: "task",
      stars: 0,
      createdAt: "2026-10-26T10:00Z",
      updatedAt: "2026-10-26T10:00Z",
      option: null,
    };
    const ledger = [
      {
        ...base,
        kind: "EARN" as const,
        cents: 5000,
        points: 50,
        status: "COMPLETED" as const,
      },
      {
        ...base,
        id: "b",
        kind: "PAYOUT" as const,
        cents: -3000,
        points: 0,
        status: "REQUESTED" as const,
      },
      {
        ...base,
        id: "c",
        kind: "PAYOUT" as const,
        cents: -1000,
        points: 0,
        status: "REJECTED" as const,
      },
    ];
    expect(balance(ledger, 1)).toEqual({ cents: 2000, points: 50, stars: 0 });
    expect(balance(ledger, 2).cents).toBe(0);
  });
});
function source(): WorkforceSource {
  return {
    snapshot: {
      accountId: "test-account",
      apiVersion: "36",
      from: "2026-10-26",
      to: "2026-11-25",
      fetchedAt: "2026-10-26T08:00:00.000Z",
      timeZone: "Europe/Warsaw",
      units: [
        {
          id: 50,
          objectId: 38,
          name: "Apartament testowy",
          code: "49",
          mapping: "source-id",
          address: "Adres",
        },
      ],
      stays: [
        {
          id: 4720,
          unitId: 50,
          from: "2026-10-24T15:00",
          to: "2026-10-26T10:00",
          status: "toClarify",
        },
        {
          id: 4721,
          unitId: 50,
          from: "2026-10-26T15:00",
          to: "2026-10-28T10:00",
          status: "accepted",
        },
      ],
      locks: [],
    },
    counts: { "4720:50": 2, "4721:50": 3 },
    context: {
      accountId: "test-account",
      apartments: [
        {
          id: 1,
          idobookingId: 50,
          name: "Apartament testowy",
          address: "Adres",
          images: [],
          rooms: [],
        },
      ],
      archivedUnitIds: new Set(),
    },
  };
}
describe("manual order endpoint authorization and persistence", () => {
  it("rejects employee access to creation and the catalog preview", async () => {
    const harness = transactionHarness();
    await expect(
      harness.caller().manualOptions({ date: "2026-10-26" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      harness
        .caller()
        .createManualTask({
          unitId: 50,
          serviceDate: "2026-10-26",
          reason: "Additional cleaning",
          requestId: "0f68fdda-dba3-4ff1-ac06-23fb5f0d5171",
          expectedSourceRevision: "stale",
          acknowledgeOccupancy: false,
        }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(harness.state().tasks).toEqual([]);
  });
  it("creates an auditable manager order, retries idempotently and survives a subsequent fresh import", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T08:00:00Z"));
    vi.mocked(getCleaningSnapshot).mockImplementation(async (from, to) => ({
      ...source().snapshot,
      from,
      to,
      fetchedAt: new Date().toISOString(),
    }));
    const harness = transactionHarness(),
      caller = harness.caller(true);
    const options = await caller.manualOptions({ date: "2026-10-27" }),
      option = options[0]!;
    const payload = {
      unitId: 50,
      serviceDate: "2026-10-27",
      reason: "Additional cleaning",
      requestId: "0f68fdda-dba3-4ff1-ac06-23fb5f0d5171",
      expectedSourceRevision: option.sourceRevision,
      acknowledgeOccupancy: true,
    };
    const result = await caller.createManualTask(payload);
    expect(await caller.createManualTask(payload)).toEqual(result);
    expect(harness.state().tasks.filter((t) => t.manual)).toHaveLength(1);
    expect(harness.audit).toHaveBeenCalled();
    await caller.synchronize({ from: "2026-10-27", to: "2026-10-28" });
    expect(harness.state().tasks.find((t) => t.id === result.id)).toMatchObject(
      {
        status: "UNASSIGNED",
        reservationId: null,
        manual: { reason: "Additional cleaning" },
      },
    );
  });
});
describe("reconciliation", () => {
  it("can refresh source qualification without automatically distributing available tasks before a decision", () => {
    const state = emptyState(),
      src = source();
    reconcileState(state, src, [], now);
    const target = state.tasks[0]!;
    const version = target.version;
    reconcileState(state, src, [worker()], now, { autoOffer: false });
    expect(target).toMatchObject({
      status: "UNASSIGNED",
      userId: null,
      version,
    });
    reconcileState(state, src, [worker()], now);
    expect(target).toMatchObject({ status: "OFFERED", userId: 1 });
  });
  it("keeps an unassigned task version stable on no-op refresh but changes it for material new windows", () => {
    const state = emptyState(),
      src = source();
    reconcileState(state, src, [], now);
    const t = state.tasks[0]!;
    const version = t.version;
    reconcileState(state, src, [], now);
    expect(t.version).toBe(version);
    src.snapshot.stays[0]!.to = "2026-10-26T11:00";
    reconcileState(state, src, [], now);
    expect(t.version).toBeGreaterThan(version);
    expect(t.status).toBe("UNASSIGNED");
  });
  it("creates pending-reservation work, keeps IDs stable and stores only privacy-safe metadata", () => {
    const s = emptyState();
    reconcileState(s, source(), [worker()], now);
    expect(s.tasks[0]).toMatchObject({
      userId: 1,
      status: "OFFERED",
      provisional: true,
      guests: 2,
      nextGuests: 3,
    });
    const id = s.tasks[0]!.id,
      version = s.tasks[0]!.version;
    reconcileState(s, source(), [worker()], now);
    expect(s.tasks[0]!.id).toBe(id);
    expect(s.tasks[0]!.version).toBe(version);
    expect(JSON.stringify(s.tasks)).not.toMatch(
      /firstName|lastName|clientId|internalNote|password|phone|email/,
    );
  });
  it("reslots and requests acceptance after local checkout extension", () => {
    const s = emptyState(),
      src = source();
    reconcileState(s, src, [worker()], now);
    const t = s.tasks[0]!;
    t.status = "ACCEPTED";
    t.entryApproved = true;
    s.adjustments.push({
      reservationId: 4720,
      unitId: 50,
      earlyMinutes: 0,
      lateMinutes: 210,
    });
    reconcileState(s, src, [worker()], now);
    expect(t.start).toContain("13:30");
    expect(t.end).toContain("14:30");
    expect(t.status).toBe("OFFERED");
    expect(t.entryApproved).toBe(false);
  });
  it("withdraws unsafe jobs when local early arrival leaves less than sixty minutes", () => {
    const s = emptyState(),
      src = source();
    src.snapshot.stays[1]!.from = "2026-10-26T12:00";
    reconcileState(s, src, [worker()], now);
    s.adjustments.push({
      reservationId: 4721,
      unitId: 50,
      earlyMinutes: 90,
      lateMinutes: 0,
    });
    reconcileState(s, src, [worker()], now);
    expect(s.tasks[0]).toMatchObject({ status: "REVIEW", userId: null });
  });
  it("preserves completed history and does not cancel jobs outside refreshed coverage", () => {
    const s = emptyState();
    s.tasks.push(
      task("done", { status: "DONE", userId: 1 }),
      task("future", {
        serviceDate: "2026-12-01",
        status: "ACCEPTED",
        userId: 1,
      }),
    );
    reconcileState(s, source(), [], now);
    expect(s.tasks.find((t) => t.id === "done")?.status).toBe("DONE");
    expect(s.tasks.find((t) => t.id === "future")?.status).toBe("ACCEPTED");
  });
  it("cancels actual inactive reservations but reviews disappeared or moved records", () => {
    const s = emptyState(),
      src = source();
    reconcileState(s, src, [worker()], now);
    src.snapshot.stays[0]!.status = "canceled";
    reconcileState(s, src, [worker()], now);
    expect(s.tasks[0]!.status).toBe("CANCELLED");
    src.snapshot.stays = src.snapshot.stays.slice(1);
    reconcileState(s, src, [worker()], now);
    expect(s.tasks[0]!.status).toBe("REVIEW");
  });
  it("rejects an older racing source read", () => {
    const s = emptyState();
    s.lastSync = "2026-10-26T09:00:00Z";
    s.sourceCoverage = { "2026-10-26": "2026-10-26T09:00:00Z" };
    expect(() => reconcileState(s, source(), [], now)).toThrow(/Nowszy odczyt/);
  });
  it("does not reopen accepted offers when only coverage, fetch time or presentation changes", () => {
    const s = emptyState(),
      src = source();
    reconcileState(s, src, [worker()], now);
    const t = s.tasks[0]!;
    t.status = "ACCEPTED";
    t.entryApproved = true;
    const previous = {
      version: t.version,
      offer: t.offerSequence,
      source: t.sourceRevision,
    };
    src.snapshot.to = "2026-10-27";
    src.snapshot.fetchedAt = "2026-10-26T08:01:00.000Z";
    src.context.apartments[0]!.name = "Nowa nazwa wyświetlana";
    reconcileState(s, src, [worker()], now);
    expect(t).toMatchObject({
      status: "ACCEPTED",
      entryApproved: true,
      version: previous.version,
      offerSequence: previous.offer,
      sourceRevision: previous.source,
    });
    expect(t.name).toBe("Nowa nazwa wyświetlana");
  });
  it("reopens an offer on a material guest change without erasing refusals for the same time", () => {
    const s = emptyState(),
      src = source();
    reconcileState(s, src, [worker()], now);
    const t = s.tasks[0]!;
    t.status = "ACCEPTED";
    t.declined = [2];
    t.entryApproved = true;
    src.counts["4720:50"] = 4;
    reconcileState(s, src, [worker()], now);
    expect(t).toMatchObject({
      status: "OFFERED",
      guests: 4,
      declined: [2],
      entryApproved: false,
    });
  });
  it("reconsiders refusals only after a new service date or cleaning window", () => {
    const s = emptyState(),
      src = source();
    reconcileState(s, src, [], now);
    const t = s.tasks[0]!;
    t.declined = [1];
    reconcileState(s, src, [worker()], now);
    expect(t).toMatchObject({ status: "UNASSIGNED", declined: [1] });
    s.adjustments.push({
      reservationId: 4720,
      unitId: 50,
      earlyMinutes: 0,
      lateMinutes: 60,
    });
    reconcileState(s, src, [worker()], now);
    expect(t).toMatchObject({ status: "OFFERED", userId: 1, declined: [] });
    expect(t.start).toContain("11:00");
  });
  it.each(["cancelled", "missing", "locked", "moved"] as const)(
    "preserves actual ongoing work and capacity when the source becomes %s",
    (change) => {
      const s = emptyState(),
        src = source();
      reconcileState(s, src, [worker()], now);
      const t = s.tasks[0]!;
      t.status = "IN_PROGRESS";
      t.checks = ["proof"];
      t.photos = [{ id: "proof", category: "room" }];
      t.startedAt = "2026-10-26T09:00:00Z";
      const slot = { start: t.start, end: t.end, serviceDate: t.serviceDate };
      if (change === "cancelled") src.snapshot.stays[0]!.status = "canceled";
      if (change === "missing")
        src.snapshot.stays = src.snapshot.stays.slice(1);
      if (change === "locked")
        src.snapshot.locks = [
          {
            id: 1,
            unitId: 50,
            objectId: 38,
            from: "2026-10-26",
            to: "2026-10-26",
            note: "",
          },
        ];
      if (change === "moved") src.snapshot.stays[0]!.to = "2026-10-27T10:00";
      reconcileState(s, src, [worker()], "2026-10-26T10:10");
      expect(t).toMatchObject({
        ...slot,
        status: "IN_PROGRESS",
        userId: 1,
        checks: ["proof"],
        photos: [{ id: "proof", category: "room" }],
      });
      expect(t.alert).toMatch(/koordynator/);
      expect(
        slotFor(
          task("another"),
          worker(1, { dailyLimit: 1 }),
          s.tasks,
          now,
          true,
        ),
      ).toBeNull();
      const version = t.version;
      reconcileState(s, src, [worker()], "2026-10-26T10:10");
      expect(t.version).toBe(version);
    },
  );
  it("allows a newer read of another coverage without rejecting an older independent day", () => {
    const s = emptyState(),
      src = source();
    src.snapshot.to = "2026-10-27";
    reconcileState(s, src, [], now);
    const other = source();
    other.snapshot.from = "2026-11-15";
    other.snapshot.to = "2026-11-16";
    other.snapshot.fetchedAt = "2026-10-26T09:00:00Z";
    reconcileState(s, other, [], now);
    src.snapshot.fetchedAt = "2026-10-26T08:30:00Z";
    expect(() => reconcileState(s, src, [], now)).not.toThrow();
    expect(s.lastSync).toBe("2026-10-26T09:00:00.000Z");
    expect(s.sourceCoverage?.["2026-10-26"]).toBe("2026-10-26T08:30:00.000Z");
    expect(() => reconcileState(s, source(), [], now)).toThrow(/Nowszy odczyt/);
  });
  it("forces a read of the actual task day even if an unrelated global sync just succeeded", async () => {
    const s = emptyState();
    s.tasks.push(task("future", { serviceDate: "2026-11-08" }));
    s.lastSync = new Date().toISOString();
    const read = vi.fn(async () => ({
      state: s,
      accountId: "test",
      revision: 0,
    }));
    const synchronize = vi.fn(async () => ({
      ready: 0,
      review: 0,
      lastSync: "fresh",
    }));
    const db = {} as Parameters<typeof refreshTaskBeforeDecision>[0];
    await refreshTaskBeforeDecision(db, "employee:1", "future", {
      read,
      synchronize,
    });
    await refreshTaskBeforeDecision(db, "employee:1", "future", {
      read,
      synchronize,
    });
    expect(synchronize).toHaveBeenCalledTimes(2);
    expect(synchronize).toHaveBeenLastCalledWith(
      db,
      "employee:1",
      "2026-11-08",
      "2026-12-09",
      true,
      { autoOffer: false },
    );
    await expect(
      refreshTaskBeforeDecision(db, "employee:1", "missing", {
        read,
        synchronize,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(synchronize).toHaveBeenCalledTimes(2);
  });
  it("retains a later next reservation during a mandatory task refresh", async () => {
    const s = emptyState(),
      src = source();
    src.snapshot.stays[1]!.from = "2026-10-28T15:00";
    src.snapshot.stays[1]!.to = "2026-10-30T10:00";
    reconcileState(s, src, [worker()], now);
    const t = s.tasks[0]!;
    t.status = "ACCEPTED";
    const version = t.version;
    const read = vi.fn(async () => ({
      state: s,
      accountId: "test",
      revision: 0,
    }));
    const synchronize = vi.fn(
      async (
        _db: Parameters<typeof refreshTaskBeforeDecision>[0],
        _actor: string,
        from: string,
        to: string,
      ) => {
        const fresh = structuredClone(src);
        fresh.snapshot.from = from;
        fresh.snapshot.to = to;
        fresh.snapshot.stays = fresh.snapshot.stays.filter(
          (stay) => stay.from < to + "T00:00" && stay.to >= from + "T00:00",
        );
        return reconcileState(s, fresh, [worker()], now);
      },
    );
    await refreshTaskBeforeDecision(
      {} as Parameters<typeof refreshTaskBeforeDecision>[0],
      "cleaner:1",
      t.id,
      { read, synchronize },
    );
    expect(t).toMatchObject({
      status: "ACCEPTED",
      version,
      nextFrom: "2026-10-28T15:00",
      nextGuests: 3,
    });
  });
});
