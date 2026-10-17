import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Operations from "./operations";
const state = vi.hoisted(() => ({
  old: false,
  units: vi.fn(async () => [{ id: 7, objectId: 2, name: "Apartment", code: "A" }]),
  stays: vi.fn(async () => []),
  availabilityLocks: vi.fn(async () => []),
  inventory: vi.fn(async () => [{ id: 1, idobookingId: 7, name: "Apartment", address: "Test 1", archived: false, reservationsDisabled: false, reservationsDisabledFrom: null, reservationsDisabledTo: null }]),
}));
vi.mock("next/cache", () => ({ unstable_cache: (fn: (...args: string[]) => Promise<unknown>, keys: string[]) => async (...args: string[]) => {
  const result = await fn(...args);
  return state.old && keys[0]?.includes("snapshot") ? { ...(result as object), fetchedAt: new Date(Date.now() - 600000).toISOString() } : result;
} }));
vi.mock("@/server/db", () => ({ db: { apartment: { findMany: state.inventory } } }));
vi.mock("./operations", async importOriginal => {
  const actual = await importOriginal<typeof Operations>();
  return { ...actual, configFromEnv: () => ({ timeZone: "Europe/Warsaw" }), readClient: () => ({ units: state.units, stays: state.stays, availabilityLocks: state.availabilityLocks }) };
});
import { GET } from "@/app/api/operations/reservations/route";
const token = "test-token-".repeat(5);
const req = (query = "from=2026-10-16&to=2026-10-17", extra: Record<string, string> = {}) => new Request("https://app.test/api/operations/reservations?" + query, { headers: { Authorization: "Bearer " + token, ...extra } });
beforeEach(() => { state.old = false; vi.clearAllMocks(); vi.stubEnv("OPERATIONS_API_TOKEN", token); });
afterEach(() => vi.unstubAllEnvs());
describe("read-only operations endpoint", () => {
  it("rejects missing credentials before any API/database read", async () => {
    expect((await GET(new Request("https://app.test/api/operations/reservations"))).status).toBe(401);
    expect(state.units).not.toHaveBeenCalled();
    expect(state.inventory).not.toHaveBeenCalled();
  });
  it("validates dates and durations before reading upstream", async () => {
    expect((await GET(req("from=2026-10-16&to=2027-01-01"))).status).toBe(400);
    expect((await GET(req("from=2026-10-16&to=2026-10-17&cleaningMinutes=-1"))).status).toBe(400);
    expect(state.stays).not.toHaveBeenCalled();
  });
  it("returns an ETag and 304 when the operational data did not change", async () => {
    const first = await GET(req());
    expect(first.status).toBe(200);
    const etag = first.headers.get("etag")!;
    const body = await first.json() as { units: { address: string; reservations?: unknown }[] };
    expect(body.units[0]?.address).toBe("Test 1");
    expect(body.units[0]?.reservations).toBeUndefined();
    const again = await GET(req(undefined, { "If-None-Match": etag }));
    expect(again.status).toBe(304);
    expect(await again.text()).toBe("");
    expect(again.headers.get("x-snapshot-fetched-at")).toBeTruthy();
  });
  it("rejects stale cached snapshots rather than offering empty apartments", async () => {
    state.old = true;
    expect((await GET(req())).status).toBe(503);
  });
  it("does not publish availability after a failed upstream read", async () => {
    state.stays.mockRejectedValueOnce(new Error("secret detail"));
    const response = await GET(req());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret detail");
  });
  it("does not publish availability when the lock read fails", async () => {
    state.availabilityLocks.mockRejectedValueOnce(new Error("private lock read failure"));
    expect((await GET(req())).status).toBe(502);
  });
});
