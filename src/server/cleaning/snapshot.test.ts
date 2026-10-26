import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Operations from "@/server/idobooking/operations";
import type {
  AvailabilityLock,
  Stay,
  Unit,
} from "@/server/idobooking/operations";

const state = vi.hoisted(() => ({
  config: {
    baseUrl: "https://test.example",
    version: "36",
    login: "private-login",
    password: "private-password",
    timeZone: "Europe/Warsaw",
  },
  cache: new Map<string, unknown>(),
  cacheTags: new Map<string, string[]>(),
  revalidatedTags: [] as string[],
  definitions: [] as { keys: string[]; revalidate: number; tags: string[] }[],
  units: vi.fn(
    async (): Promise<Unit[]> => [
      { id: 7, objectId: 2, name: "Apartment", code: "A" },
    ],
  ),
  stays: vi.fn(
    async (): Promise<Stay[]> => [
      {
        id: 1,
        unitId: 7,
        from: "2026-10-20T15:00",
        to: "2026-10-26T10:00",
        status: "waitingForPayment",
      },
    ],
  ),
  locks: vi.fn(async (): Promise<AvailabilityLock[]> => []),
  locations: vi.fn(async (_config: unknown, units: Unit[]) =>
    units.map((unit) => ({
      ...unit,
      mapping: "source-id" as const,
      locationStatus: "missing" as const,
    })),
  ),
}));

vi.mock("next/cache", () => ({
  unstable_cache: <T>(
    fn: (...args: string[]) => Promise<T>,
    keys: string[],
    options: { revalidate: number; tags: string[] },
  ) => {
    state.definitions.push({
      keys,
      revalidate: options.revalidate,
      tags: options.tags,
    });
    return async (...args: string[]) => {
      const key = JSON.stringify([keys, args]);
      if (state.cache.has(key)) return state.cache.get(key) as T;
      const result = await fn(...args);
      state.cache.set(key, result);
      state.cacheTags.set(key, options.tags);
      return result;
    };
  },
  revalidateTag: (tag: string) => {
    state.revalidatedTags.push(tag);
    for (const [key, tags] of state.cacheTags) {
      if (tags.includes(tag)) {
        state.cache.delete(key);
        state.cacheTags.delete(key);
      }
    }
  },
}));
vi.mock("@/server/idobooking/operations", async (importOriginal) => {
  const actual = await importOriginal<typeof Operations>();
  return {
    ...actual,
    configFromEnv: () => state.config,
    readClient: () => ({
      units: state.units,
      stays: state.stays,
      availabilityLocks: state.locks,
    }),
  };
});
vi.mock("./locations", () => ({ enrichCleaningLocations: state.locations }));
import { getCleaningSnapshot } from "./snapshot";

beforeEach(() => {
  vi.clearAllMocks();
  state.cache.clear();
  state.cacheTags.clear();
  state.revalidatedTags = [];
  state.config = {
    baseUrl: "https://test.example",
    version: "36",
    login: "private-login",
    password: "private-password",
    timeZone: "Europe/Warsaw",
  };
});
afterEach(() => vi.useRealTimers());

describe("cleaning-only reservation source", () => {
  it("uses separate cleaning cache namespaces with short reservation freshness", async () => {
    const first = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    const again = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(again).toEqual(first);
    expect(state.definitions).toEqual([
      {
        keys: ["cleaning-catalog-v2"],
        revalidate: 86400,
        tags: ["cleaning:catalog:v2"],
      },
      {
        keys: ["cleaning-snapshot-v2"],
        revalidate: 60,
        tags: ["cleaning:snapshot:v2"],
      },
    ]);
    expect(state.stays).toHaveBeenCalledExactlyOnceWith(
      "2026-10-26",
      "2026-10-27",
    );
    expect(state.locks).toHaveBeenCalledExactlyOnceWith(
      "2026-10-26",
      "2026-10-27",
    );
    expect(first.stays[0]?.status).toBe("waitingForPayment");
    expect(first.locks).toEqual([]);
    expect(first.units[0]?.mapping).toBe("source-id");
    expect(state.locations).toHaveBeenCalledTimes(1);
    expect(JSON.stringify([...state.cache.keys()])).not.toMatch(
      /private-login|private-password/,
    );
    expect(JSON.stringify(first)).not.toMatch(/private-login|private-password/);
  });
  it("isolates accounts, origins and API versions while reusing the catalog for another range", async () => {
    const first = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    await getCleaningSnapshot("2026-10-27", "2026-10-28");
    expect(state.units).toHaveBeenCalledTimes(1);
    expect(state.stays).toHaveBeenCalledTimes(2);
    state.config.login = "another-login";
    const account = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(account.accountId).not.toBe(first.accountId);
    state.config.baseUrl = "https://another.example";
    const origin = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(origin.accountId).not.toBe(account.accountId);
    state.config.version = "37";
    const version = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(version.accountId).toBe(origin.accountId);
    expect(version.apiVersion).toBe("37");
    expect(state.units).toHaveBeenCalledTimes(4);
    expect(state.stays).toHaveBeenCalledTimes(5);
  });
  it("refreshes the catalog when a reservation references a newly added unit", async () => {
    state.units.mockResolvedValueOnce([
      { id: 8, objectId: 2, name: "Old unit", code: "B" },
    ]);
    const result = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(state.units).toHaveBeenCalledTimes(2);
    expect(result.units[0]?.id).toBe(7);
  });
  it("does not cache a partial snapshot after a failed lock read", async () => {
    state.locks.mockRejectedValueOnce(new Error("Failed read"));
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-10-27"),
    ).rejects.toThrow("Failed read");
    expect(
      [...state.cache.keys()].some((key) =>
        key.includes("cleaning-snapshot-v2"),
      ),
    ).toBe(false);
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-10-27"),
    ).resolves.toHaveProperty("locks", []);
    expect(state.locks).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid ranges before reading upstream", async () => {
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-12-01"),
    ).rejects.toThrow();
    expect(state.units).not.toHaveBeenCalled();
    expect(state.stays).not.toHaveBeenCalled();
    expect(state.locks).not.toHaveBeenCalled();
  });
  it("bypasses both cleaning caches for an explicit fresh read", async () => {
    const first = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    state.stays.mockResolvedValueOnce([
      {
        id: 2,
        unitId: 7,
        from: "2026-10-20T15:00",
        to: "2026-10-26T10:00",
        status: "accepted",
      },
    ]);
    const fresh = await getCleaningSnapshot("2026-10-26", "2026-10-27", {
      forceRefresh: true,
    });
    expect(fresh.stays[0]?.id).toBe(2);
    expect(fresh.accountId).toBe(first.accountId);
    expect(state.units).toHaveBeenCalledTimes(2);
    expect(state.stays).toHaveBeenCalledTimes(2);
    expect(state.locks).toHaveBeenCalledTimes(2);
    expect(state.cache.size).toBe(0);
    expect(state.revalidatedTags).toEqual([
      "cleaning:catalog:v2",
      "cleaning:snapshot:v2",
    ]);
  });
  it("cannot resurrect cached older reservations after a fresh read and a range change", async () => {
    await getCleaningSnapshot("2026-10-26", "2026-10-27");
    await getCleaningSnapshot("2026-10-27", "2026-10-28");
    state.cache.set("unrelated-admin-entry", { retained: true });
    state.cacheTags.set("unrelated-admin-entry", ["admin:reservations"]);
    const updated = [
      {
        id: 2,
        unitId: 7,
        from: "2026-10-20T15:00",
        to: "2026-10-26T10:00",
        status: "accepted",
      },
    ];
    state.stays
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce(updated)
      .mockResolvedValueOnce(updated);
    await getCleaningSnapshot("2026-10-26", "2026-10-27", {
      forceRefresh: true,
    });
    expect(state.cache.get("unrelated-admin-entry")).toEqual({
      retained: true,
    });
    const rangeB = await getCleaningSnapshot("2026-10-27", "2026-10-28");
    const rangeA = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(rangeB.stays[0]?.id).toBe(2);
    expect(rangeA.stays[0]?.id).toBe(2);
    expect(state.stays).toHaveBeenCalledTimes(5);
    await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(state.stays).toHaveBeenCalledTimes(5);
  });
  it("does not purge existing caches when the explicit fresh read fails", async () => {
    await getCleaningSnapshot("2026-10-26", "2026-10-27");
    state.locks.mockRejectedValueOnce(new Error("Incomplete read"));
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-10-27", { forceRefresh: true }),
    ).rejects.toThrow("Incomplete read");
    expect(state.revalidatedTags).toEqual([]);
    expect(state.cache.size).toBe(2);
  });
  it("dates freshness from the start of the read, including network latency", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-26T07:00:00Z"));
    state.stays.mockImplementationOnce(async () => {
      vi.setSystemTime(new Date("2026-10-26T07:04:00Z"));
      return [];
    });
    const result = await getCleaningSnapshot("2026-10-26", "2026-10-27", {
      forceRefresh: true,
    });
    expect(result.fetchedAt).toBe("2026-10-26T07:00:00.000Z");
  });
  it("rejects an account configuration change during the read", async () => {
    state.stays.mockImplementationOnce(async () => {
      state.config = { ...state.config, login: "different-account" };
      return [];
    });
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-10-27", { forceRefresh: true }),
    ).rejects.toThrow("configuration changed");
  });
  it("does not publish a complete snapshot after the location read fails", async () => {
    state.locations.mockRejectedValueOnce(new Error("Location read failed"));
    await expect(
      getCleaningSnapshot("2026-10-26", "2026-10-27"),
    ).rejects.toThrow("Location read failed");
    expect(
      [...state.cache.keys()].some((key) =>
        key.includes("cleaning-snapshot-v2"),
      ),
    ).toBe(false);
  });
  it("does not retain private lock notes in the cleaning snapshot or cache", async () => {
    state.locks.mockResolvedValueOnce([
      {
        id: 1,
        unitId: 7,
        objectId: 2,
        from: "2026-10-26",
        to: "2026-10-26",
        note: "PRIVATE ACCESS INSTRUCTION",
      },
    ]);
    const result = await getCleaningSnapshot("2026-10-26", "2026-10-27");
    expect(result.locks?.[0]).toMatchObject({
      id: 1,
      note: "",
      from: "2026-10-26",
    });
    expect(JSON.stringify(result)).not.toContain("PRIVATE ACCESS INSTRUCTION");
    expect(JSON.stringify([...state.cache.values()])).not.toContain(
      "PRIVATE ACCESS INSTRUCTION",
    );
  });
});
