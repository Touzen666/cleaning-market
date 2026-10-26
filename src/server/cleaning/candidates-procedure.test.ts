import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTRPC } from "@trpc/server";
import type { CleaningSnapshot } from "./types";

const state = vi.hoisted(() => ({
  source: vi.fn(),
  apartments: vi.fn(),
  transferred: vi.fn(),
}));
type TestContext = {
  session?: { user: { type: string } };
  cleaningAuth?: { userId: string; role: string };
  db: {
    apartment: { findMany: typeof state.apartments };
    reservation: { findMany: typeof state.transferred };
    cleaningWorkspace: { findUnique: () => Promise<null> };
  };
};
vi.mock("@/server/api/trpc", () => {
  const t = initTRPC.context<TestContext>().create();
  return { publicProcedure: t.procedure };
});
vi.mock("@/server/cleaning/snapshot", () => ({
  getCleaningSnapshot: state.source,
}));
import {
  cleaningAccess,
  listCleaningCandidates,
} from "@/server/api/routers/cleaning-candidates";
import { listCleaningOverview } from "@/server/api/routers/cleaning-overview";

const t = initTRPC.context<TestContext>().create();
const router = t.router({
  listCandidates: listCleaningCandidates,
  access: cleaningAccess,
  listOverview: listCleaningOverview,
});
const db = {
  apartment: { findMany: state.apartments },
  reservation: { findMany: state.transferred },
  cleaningWorkspace: { findUnique: async () => null },
};
const admin = { session: { user: { type: "ADMIN" } }, db };
const input = { from: "2026-10-26", to: "2026-10-27" };
const source = (): CleaningSnapshot & {
  accountId: string;
  apiVersion: string;
} => ({
  ...input,
  timeZone: "Europe/Warsaw",
  fetchedAt: new Date().toISOString(),
  accountId: "test-account",
  apiVersion: "36",
  units: [
    {
      id: 7,
      objectId: 2,
      name: "Test apartment",
      code: "A",
      mapping: "source-id",
    },
  ],
  stays: [
    {
      id: 1,
      unitId: 7,
      from: "2026-10-20T15:00",
      to: "2026-10-26T10:00",
      status: "waitingForPayment",
    },
  ],
  locks: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  state.source.mockImplementation(async () => source());
  state.apartments.mockRejectedValue(
    new Error("Cleaning must not read admin inventory"),
  );
  state.transferred.mockResolvedValue([]);
});
afterEach(() => vi.restoreAllMocks());

describe("cleaning.listOverview", () => {
  beforeEach(() => {
    state.apartments.mockImplementation(
      async (args: { where: { archived: boolean } }) =>
        args.where.archived
          ? []
          : [
              {
                id: 91,
                idobookingId: null,
                name: "Test apartment",
                address: "Local address",
                images: [
                  {
                    url: "https://example.com/photo.jpg",
                    isPrimary: true,
                    order: 0,
                  },
                ],
                rooms: [{ code: "A" }],
              },
            ],
    );
  });
  it("checks authorization before all source and database reads", async () => {
    for (const context of [
      { db },
      { cleaningAuth: { userId: "worker", role: "CLEANER" }, db },
      { session: { user: { type: "OWNER" } }, db },
    ]) {
      await expect(
        router.createCaller(context).listOverview(input),
      ).rejects.toBeInstanceOf(Error);
    }
    expect(state.source).not.toHaveBeenCalled();
    expect(state.apartments).not.toHaveBeenCalled();
  });
  it("reads only the active presentation catalog and archived IDs, while retaining native reservation identity", async () => {
    const result = await router.createCaller(admin).listOverview(input);
    expect(result.overview.units[0]).toMatchObject({
      unitId: 7,
      apartmentId: 91,
      imageUrl: "https://example.com/photo.jpg",
    });
    expect(result.overview.reservations[0]).toMatchObject({
      id: 1,
      unitId: 7,
      certainty: "provisional",
    });
    const queries = state.apartments.mock.calls.map(
      ([args]) => args as unknown,
    );
    expect(queries[0]).toMatchObject({
      where: { archived: false },
      select: { id: true, name: true, images: { select: { url: true } } },
    });
    expect(queries[1]).toEqual({
      where: { archived: true, idobookingId: { in: [7] } },
      select: { idobookingId: true },
    });
    expect(JSON.stringify(queries)).not.toMatch(
      /ownership|rentAmount|payment|balance|reservation/,
    );
    expect(state.transferred).not.toHaveBeenCalled();
    expect(result.source.catalogSource).toBe("active-admin-readonly");
    expect(JSON.stringify(result)).not.toMatch(
      /guest|systemKey|password|cleanerId/,
    );
  });
  it("validates date and unit filters and fails closed on stale snapshots or a catalog failure", async () => {
    const caller = router.createCaller(admin);
    await expect(
      caller.listOverview({ ...input, from: "2026-02-30" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.source).not.toHaveBeenCalled();
    await expect(
      caller.listOverview({ ...input, unitId: 999 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(state.apartments).not.toHaveBeenCalled();
    state.source.mockResolvedValueOnce({
      ...source(),
      fetchedAt: "2020-01-01T00:00:00Z",
    });
    await expect(caller.listOverview(input)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
    });
    state.apartments.mockRejectedValue(new Error("secret backend detail"));
    await expect(caller.listOverview(input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message: "Could not obtain complete cleaning overview",
    });
  });
  it("refreshes only the cleaning source, filters after occupancy and keeps hidden review counts", async () => {
    const changed = source();
    changed.stays.push({
      id: 2,
      unitId: 7,
      from: "2026-10-26T10:30",
      to: "2026-10-29T10:00",
      status: "accepted",
    });
    state.source.mockResolvedValue(changed);
    const result = await router
      .createCaller({
        cleaningAuth: { userId: "manager", role: "MANAGER" },
        db,
      })
      .listOverview({
        ...input,
        unitId: 7,
        forceRefresh: true,
        includeReviews: false,
      });
    expect(state.source).toHaveBeenCalledWith(input.from, input.to, {
      forceRefresh: true,
    });
    expect(result.candidates).toEqual([]);
    expect(result.reviews).toEqual([]);
    expect(result.counts.reviews).toBe(1);
    expect(result.overview.reservations).toHaveLength(2);
    expect(state.transferred).not.toHaveBeenCalled();
  });
});

describe("cleaning.listCandidates", () => {
  it("requires planning access before any upstream or database reads", async () => {
    await expect(
      router.createCaller({ db }).listCandidates(input),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const context of [
      { session: { user: { type: "OWNER" } }, db },
      { cleaningAuth: { userId: "cleaner", role: "CLEANER" }, db },
    ]) {
      await expect(
        router.createCaller(context).listCandidates(input),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(state.source).not.toHaveBeenCalled();
    expect(state.apartments).not.toHaveBeenCalled();
  });
  it.each(["CLEANING_ADMIN", "MANAGER", "ADMIN"])(
    "permits a verified cleaning coordinator with role %s",
    async (role) => {
      const result = await router
        .createCaller({ cleaningAuth: { userId: "coordinator", role }, db })
        .listCandidates(input);
      expect(result.candidates[0]?.certainty).toBe("provisional");
    },
  );
  it("validates ranges, unit IDs and unsupported policy overrides before reads", async () => {
    const caller = router.createCaller(admin);
    for (const invalid of [
      { ...input, from: "2026-02-30" },
      { ...input, to: "2026-12-01" },
      { ...input, unitId: -1 },
      { ...input, cleaningMinutes: 1 },
    ]) {
      await expect(caller.listCandidates(invalid)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
    }
    expect(state.source).not.toHaveBeenCalled();
  });
  it("returns ready, provisional candidates with stable semantic revisions and no guest data", async () => {
    const caller = router.createCaller(admin);
    const first = await caller.listCandidates(input);
    const again = await caller.listCandidates(input);
    expect(first.candidates).toHaveLength(1);
    expect(first.candidates[0]?.duration.estimatedMinutes).toBe(60);
    expect(first.revision).toBe(again.revision);
    expect(first.source.availabilityLocksComplete).toBe(true);
    expect(state.source).toHaveBeenCalledWith(input.from, input.to, {
      forceRefresh: false,
    });
    expect(state.apartments).not.toHaveBeenCalled();
    expect(first.candidates[0]?.unit).toMatchObject({
      identitySource: "idobooking",
      apartmentId: null,
      locationStatus: "missing",
    });
    expect(state.transferred).not.toHaveBeenCalled();
    expect(JSON.stringify(first)).not.toMatch(
      /guest|systemKey|password|cleanerId/,
    );
  });
  it("permits an explicit fresh cleaning read after access and input validation", async () => {
    await router
      .createCaller(admin)
      .listCandidates({ ...input, forceRefresh: true });
    expect(state.source).toHaveBeenCalledExactlyOnceWith(input.from, input.to, {
      forceRefresh: true,
    });
    expect(state.transferred).not.toHaveBeenCalled();
  });
  it("rejects an unknown unit and validates freshness before database reads", async () => {
    await expect(
      router.createCaller(admin).listCandidates({ ...input, unitId: 99 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    state.source.mockResolvedValue({
      ...source(),
      fetchedAt: new Date(Date.now() - 600000).toISOString(),
    });
    await expect(
      router.createCaller(admin).listCandidates(input),
    ).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    expect(state.apartments).not.toHaveBeenCalled();
  });
  it("does not publish a partial or failed snapshot and never exposes raw failures", async () => {
    const caller = router.createCaller(admin);
    state.source.mockRejectedValueOnce(
      new Error("PRIVATE UPSTREAM CREDENTIALS"),
    );
    await expect(caller.listCandidates(input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
      message:
        "Could not obtain complete reservation data; no cleaning candidates published",
    });
    state.source.mockResolvedValue({ ...source(), locks: undefined });
    await expect(caller.listCandidates(input)).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    });
  });
  it("retains legacy review counts without inferring native identity or reading any admin tables", async () => {
    state.source.mockResolvedValue({
      ...source(),
      units: [
        {
          id: 7,
          objectId: 2,
          name: "Test apartment",
          code: "A",
          mapping: "unique-name",
          apartmentId: 1,
        },
      ],
    });
    const result = await router
      .createCaller(admin)
      .listCandidates({ ...input, unitId: 7, includeReviews: false });
    expect(result.candidates).toEqual([]);
    expect(result.reviews).toEqual([]);
    expect(result.counts.reviews).toBe(1);
    const detailed = await router.createCaller(admin).listCandidates(input);
    expect(detailed.reviews[0]?.reviewReasons).toContain(
      "UNVERIFIED_UNIT_MAPPING",
    );
    expect(state.apartments).not.toHaveBeenCalled();
    expect(state.transferred).not.toHaveBeenCalled();
  });
});

describe("cleaning.access", () => {
  it("requires authentication without reading database or upstream data", async () => {
    await expect(router.createCaller({ db }).access()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(state.source).not.toHaveBeenCalled();
    expect(state.apartments).not.toHaveBeenCalled();
    expect(state.transferred).not.toHaveBeenCalled();
  });
  it.each(["CLEANING_ADMIN", "MANAGER", "ADMIN"])(
    "identifies coordinator role %s",
    async (role) => {
      await expect(
        router
          .createCaller({ cleaningAuth: { userId: "coordinator", role }, db })
          .access(),
      ).resolves.toEqual({ canPlan: true, role, authSource: "cleaning" });
      expect(state.source).not.toHaveBeenCalled();
      expect(state.apartments).not.toHaveBeenCalled();
    },
  );
  it.each(["CLEANER", "UNKNOWN", "OWNER"])(
    "does not grant planning to role %s",
    async (role) => {
      await expect(
        router
          .createCaller({ cleaningAuth: { userId: "worker", role }, db })
          .access(),
      ).resolves.toEqual({ canPlan: false, role, authSource: "cleaning" });
      await expect(
        router
          .createCaller({ cleaningAuth: { userId: "worker", role }, db })
          .listCandidates(input),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(state.source).not.toHaveBeenCalled();
      expect(state.apartments).not.toHaveBeenCalled();
    },
  );
  it("gives the explicit cleaning identity priority over an unrelated administrator session", async () => {
    const cleanerInAdminBrowser = router.createCaller({
      ...admin,
      cleaningAuth: { userId: "worker", role: "CLEANER" },
    });
    await expect(cleanerInAdminBrowser.access()).resolves.toEqual({
      canPlan: false,
      role: "CLEANER",
      authSource: "cleaning",
    });
    await expect(
      cleanerInAdminBrowser.listCandidates(input),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(state.source).not.toHaveBeenCalled();
    expect(state.apartments).not.toHaveBeenCalled();
  });
  it("allows an app administrator session when there is no explicit cleaning login", async () => {
    await expect(router.createCaller(admin).access()).resolves.toEqual({
      canPlan: true,
      role: "ADMIN",
      authSource: "session",
    });
    await expect(
      router
        .createCaller({ session: { user: { type: "OWNER" } }, db })
        .access(),
    ).resolves.toEqual({
      canPlan: false,
      role: "OWNER",
      authSource: "session",
    });
    expect(state.source).not.toHaveBeenCalled();
    expect(state.apartments).not.toHaveBeenCalled();
  });
});
