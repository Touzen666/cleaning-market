import { describe, expect, it, vi } from "vitest";
vi.mock("./snapshot", () => ({
  cleaningAccountId: () => "test-account",
  getCleaningSnapshot: vi.fn(),
}));
vi.mock("./guest-counts", () => ({ readGuestCounts: vi.fn(async () => ({})) }));
import { createManualTask, manualOptions } from "./manual-tasks";
import {
  emptyState,
  offerNext,
  rulesSchema,
  type Worker,
} from "./workforce-domain";
import { reconcileState, type WorkforceSource } from "./workforce-store";

const date = "2026-10-28",
  now = "2026-10-26T09:00";
const source = (): WorkforceSource => ({
  snapshot: {
    accountId: "test-account",
    apiVersion: "36",
    timeZone: "Europe/Warsaw",
    from: date,
    to: "2026-10-29",
    fetchedAt: "2026-10-26T08:00:00Z",
    units: [
      {
        id: 11,
        objectId: 1,
        name: "Brooklyn",
        code: "10",
        mapping: "source-id",
      },
    ],
    stays: [],
    locks: [],
  },
  counts: {},
  context: {
    accountId: "test-account",
    apartments: [
      {
        id: 1,
        idobookingId: 11,
        name: "Brooklyn",
        address: "Adres",
        images: [],
        rooms: [],
      },
    ],
    archivedUnitIds: new Set(),
  },
});
const input = (revision: string) => ({
  serviceDate: date,
  reason: "Dodatkowe sprzątanie z grafiku",
  requestId: "0f68fdda-dba3-4ff1-ac06-23fb5f0d5171",
  expectedSourceRevision: revision,
  acknowledgeOccupancy: false,
});
const worker: Worker = {
  id: 1,
  name: "Pracownik",
  active: true,
  dailyLimit: 4,
  rules: rulesSchema.parse({}),
};
describe("independent manual cleaning orders", () => {
  it("rejects duplicating a usable checkout even when it has not been synchronized to the board yet", () => {
    const src = source();
    src.snapshot.stays.push({
      id: 123,
      unitId: 11,
      from: "2026-10-27T15:00",
      to: date + "T10:00",
      status: "accepted",
    });
    const option = manualOptions(src, [], date)[0]!;
    expect(option.checkoutTaskId).toBeTruthy();
    expect(() =>
      createManualTask(
        emptyState(),
        option,
        input(option.sourceRevision),
        "test-account",
        now,
      ),
    ).toThrow("po wyjeździe");
  });
  it("has no fabricated reservation, and uses the existing 60-minute capacity rules", () => {
    const state = emptyState(),
      option = manualOptions(source(), [], date)[0]!;
    const task = createManualTask(
      state,
      option,
      input(option.sourceRevision),
      "test-account",
      now,
    );
    expect(task).toMatchObject({
      reservationId: null,
      stayFrom: null,
      stayTo: null,
      status: "UNASSIGNED",
    });
    offerNext(task, [worker], state.tasks, now, 1);
    expect(task.start?.slice(11, 16)).toBe("10:00");
    expect(task.end?.slice(11, 16)).toBe("11:00");
    expect(task.status).toBe("OFFERED");
  });
  it("retries the same request without adding a second job, rejects a different request for the same day", () => {
    const state = emptyState(),
      option = manualOptions(source(), [], date)[0]!,
      payload = input(option.sourceRevision);
    const first = createManualTask(state, option, payload, "test-account", now);
    expect(createManualTask(state, option, payload, "test-account", now)).toBe(
      first,
    );
    expect(state.tasks).toHaveLength(1);
    expect(() =>
      createManualTask(
        state,
        option,
        { ...payload, requestId: "other" },
        "test-account",
        now,
      ),
    ).toThrow("już istnieje");
  });
  it("cannot duplicate a usable checkout task; a source review remains separate", () => {
    const state = emptyState(),
      option = manualOptions(source(), [], date)[0]!,
      payload = input(option.sourceRevision);
    const existing = createManualTask(
      state,
      option,
      payload,
      "test-account",
      now,
    );
    existing.id = "checkout:example";
    delete existing.manual;
    expect(() =>
      createManualTask(state, option, payload, "test-account", now),
    ).toThrow("już istnieje");
    existing.status = "REVIEW";
    expect(
      createManualTask(state, option, payload, "test-account", now).manual,
    ).toBeDefined();
  });
  it("requires explicit acknowledgement of occupied apartments and does not approve entry", () => {
    const src = source();
    src.snapshot.stays.push({
      id: 123,
      unitId: 11,
      from: "2026-10-27T15:00",
      to: "2026-10-29T10:00",
      status: "accepted",
    });
    const option = manualOptions(src, [], date)[0]!,
      payload = input(option.sourceRevision),
      state = emptyState();
    expect(option.conflicts).toHaveLength(1);
    expect(() =>
      createManualTask(state, option, payload, "test-account", now),
    ).toThrow("Potwierdź");
    const task = createManualTask(
      state,
      option,
      { ...payload, acknowledgeOccupancy: true },
      "test-account",
      now,
    );
    expect(task.provisional).toBe(true);
    expect(task.entryApproved).toBe(false);
  });
  it("fails closed for changed source warnings, past dates and missing active mappings", () => {
    const src = source(),
      option = manualOptions(src, [], date)[0]!;
    expect(() =>
      createManualTask(
        emptyState(),
        option,
        input("stale"),
        "test-account",
        now,
      ),
    ).toThrow("zmieniły");
    expect(() =>
      createManualTask(
        emptyState(),
        option,
        input(option.sourceRevision),
        "test-account",
        date + "T14:01",
      ),
    ).toThrow("minął");
    src.context.archivedUnitIds.add(11);
    expect(manualOptions(src, [], date)).toEqual([]);
  });
  it("survives source synchronization and revokes entry approval when occupancy changes", () => {
    const src = source(),
      state = emptyState(),
      option = manualOptions(src, [], date)[0]!;
    const task = createManualTask(
      state,
      option,
      input(option.sourceRevision),
      "test-account",
      now,
    );
    offerNext(task, [worker], state.tasks, now, 1);
    task.status = "ACCEPTED";
    task.entryApproved = true;
    const before = task.version;
    reconcileState(state, src, [worker], now, { autoOffer: false });
    expect(task.status).toBe("ACCEPTED");
    expect(task.version).toBe(before);
    src.snapshot.stays.push({
      id: 123,
      unitId: 11,
      from: "2026-10-27T15:00",
      to: "2026-10-29T10:00",
      status: "accepted",
    });
    reconcileState(state, src, [worker], now, { autoOffer: false });
    expect(task).toMatchObject({
      status: "OFFERED",
      entryApproved: false,
      provisional: true,
      userId: 1,
    });
    expect(task.manual?.conflicts).toHaveLength(1);
  });
  it("preserves capacity and ownership during ongoing work when source mapping disappears", () => {
    const src = source(),
      state = emptyState(),
      option = manualOptions(src, [], date)[0]!;
    const task = createManualTask(
      state,
      option,
      input(option.sourceRevision),
      "test-account",
      now,
    );
    offerNext(task, [worker], state.tasks, now, 1);
    task.status = "IN_PROGRESS";
    src.context.apartments = [];
    reconcileState(state, src, [worker], now, { autoOffer: false });
    expect(task).toMatchObject({
      status: "IN_PROGRESS",
      userId: 1,
      entryApproved: false,
    });
    expect(task.alert).toContain("mapowania");
  });
  it("rechecks worker exclusions after a rules change", () => {
    const src = source(),
      state = emptyState(),
      option = manualOptions(src, [], date)[0]!;
    const task = createManualTask(
      state,
      option,
      input(option.sourceRevision),
      "test-account",
      now,
    );
    offerNext(task, [worker], state.tasks, now, 1);
    reconcileState(
      state,
      src,
      [{ ...worker, rules: rulesSchema.parse({ unavailableDates: [date] }) }],
      now,
      { autoOffer: false },
    );
    expect(task.userId).toBeNull();
    expect(task.status).toBe("UNASSIGNED");
  });
});
