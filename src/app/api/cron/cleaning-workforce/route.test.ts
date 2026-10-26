import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  db: Object.freeze({ testOnlyDatabase: true }),
  localNow: vi.fn<() => string>(),
  synchronize:
    vi.fn<(...args: unknown[]) => Promise<Record<string, unknown>>>(),
}));
vi.mock("@/server/db", () => ({ db: state.db }));
vi.mock("@/server/cleaning/workforce-domain", () => ({
  localNow: state.localNow,
}));
vi.mock("@/server/cleaning/workforce-store", () => ({
  synchronizeWorkforce: state.synchronize,
}));

import { GET } from "./route";

const secret = "abcdefghijklmnop";
const request = (authorization?: string) =>
  new Request("https://bookmarket.test/api/cron/cleaning-workforce", {
    headers: authorization === undefined ? undefined : { authorization },
  });

describe("cleaning workforce cron authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", secret);
    state.localNow.mockReturnValue("2026-10-26T00:15");
    state.synchronize.mockResolvedValue({ offered: 2 });
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, ""])(
    "fails closed without a configured secret (%s), even when the caller sends a bearer",
    async (missing) => {
      vi.stubEnv("CRON_SECRET", missing);
      for (const header of [
        undefined,
        "Bearer undefined",
        "Bearer ",
        `Bearer ${secret}`,
      ]) {
        const response = await GET(request(header));
        expect(response.status).toBe(401);
        const body: unknown = await response.json();
        expect(body).toEqual({ error: "Unauthorized" });
      }
      expect(state.localNow).not.toHaveBeenCalled();
      expect(state.synchronize).not.toHaveBeenCalled();
    },
  );

  it.each([
    { label: "missing header", header: undefined },
    { label: "empty header", header: "" },
    { label: "wrong scheme", header: `Basic ${secret}` },
    {
      label: "wrong token of equal length",
      header: `Bearer ${"x".repeat(secret.length)}`,
    },
    { label: "longer token", header: `Bearer ${secret}x` },
    { label: "shorter token", header: `Bearer ${secret.slice(0, -1)}` },
    {
      label: "Unicode token with equal character count but more UTF-8 bytes",
      header: `Bearer ${secret.slice(0, -1)}é`,
    },
    {
      label: "Unicode token with equal UTF-8 byte count but different contents",
      header: `Bearer ${"é".repeat(secret.length / 2)}`,
    },
  ])("rejects $label before any reconciliation", async ({ header }) => {
    // Latin-1 header characters are accepted by the real Headers implementation,
    // while their UTF-8 byte length can differ from JavaScript string.length.
    const response = await GET(request(header));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('{"error":"Unauthorized"}');
    expect(state.localNow).not.toHaveBeenCalled();
    expect(state.synchronize).not.toHaveBeenCalled();
  });

  it("authorizes the exact bearer and reconciles thirty Warsaw calendar days with a fresh source", async () => {
    state.synchronize.mockResolvedValue({
      offered: 2,
      whatsappDeliveryEnabled: true,
    });
    const response = await GET(request(`Bearer ${secret}`));
    expect(response.status).toBe(200);
    expect(state.localNow).toHaveBeenCalledOnce();
    expect(state.synchronize).toHaveBeenCalledExactlyOnceWith(
      state.db,
      "cron:cleaning-workforce",
      "2026-10-26",
      "2026-11-25",
      true,
    );
    const body: unknown = await response.json();
    expect(body).toEqual({
      success: true,
      offered: 2,
      whatsappDeliveryEnabled: false,
    });
  });

  it("reports a failed reconciliation as unavailable without leaking upstream or database errors", async () => {
    state.synchronize.mockRejectedValueOnce(
      new Error("private-upstream-token-and-database-detail"),
    );
    const response = await GET(request(`Bearer ${secret}`));
    expect(response.status).toBe(503);
    const body: unknown = await response.json();
    expect(body).toEqual({
      error: "Cleaning reconciliation failed; previous state retained",
    });
    expect(state.synchronize).toHaveBeenCalledOnce();
  });
});
