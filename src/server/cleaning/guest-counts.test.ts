import { describe, expect, it, vi } from "vitest";
import type * as Operations from "@/server/idobooking/operations";
vi.mock("@/server/idobooking/operations", async importOriginal => ({ ...await importOriginal<typeof Operations>(), configFromEnv: () => ({ baseUrl: "https://source.test", version: "36", login: "qa-login", password: "qa-only", timeZone: "Europe/Warsaw" }) }));
import { readGuestCounts } from "./guest-counts";
const response = (rows: unknown[], total = rows.length) => new Response(JSON.stringify({ reservations: rows, result: { countAll: total }, errors: [] }), { status: 200 });
const row = (id = 1) => ({ id, client: { firstName: "Private", lastName: "Guest", email: "private@example.test" }, items: [{ objectItemId: 50, numberOfAdults: 2, numberOfBigChildren: 1, numberOfSmallChildren: 1 }] });
describe("cleaning guest counts", () => {
  it("counts adults and both child categories per native unit and strips all private fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([row()]));
    const result = await readGuestCounts([1], fetcher);
    expect(result).toEqual({ "1:50": 4 });
    expect(JSON.stringify(result)).not.toMatch(/Private|Guest|email|client/);
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string)).toMatchObject({ paramsSearch: { ids: [1] }, result: { returnElements: ["items"] } });
  });
  it("accepts documented optional child counts and numeric strings", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response([{ id: 2, items: [{ objectItemId: 51, numberOfAdults: "3" }] }]));
    expect(await readGuestCounts([2], fetcher)).toEqual({ "2:51": 3 });
  });
  it("rejects missing required adults, boolean values, negative and fractional counts", async () => {
    for (const value of [undefined, true, -1, 1.5, "two"]) {
      const r = row(); (r.items[0] as Record<string, unknown>).numberOfAdults = value;
      await expect(readGuestCounts([1], vi.fn<typeof fetch>().mockResolvedValue(response([r])))).rejects.toThrow();
    }
  });
  it("rejects disappearing reservations instead of silently inventing zero guests", async () => {
    await expect(readGuestCounts([1], vi.fn<typeof fetch>().mockResolvedValue(response([])))).rejects.toThrow(/zmieniły/);
  });
  it("rejects unexpected and duplicate reservation units", async () => {
    await expect(readGuestCounts([2], vi.fn<typeof fetch>().mockResolvedValue(response([row(1)])))).rejects.toThrow();
    const r = row(); r.items.push({ ...r.items[0]! });
    await expect(readGuestCounts([1], vi.fn<typeof fetch>().mockResolvedValue(response([r])))).rejects.toThrow();
  });
  it("rejects upstream errors even in otherwise populated responses", async () => {
    const bad = new Response(JSON.stringify({ errors: { faultCode: 1 }, reservations: [row()], result: { countAll: 1 } }));
    await expect(readGuestCounts([1], vi.fn<typeof fetch>().mockResolvedValue(bad))).rejects.toThrow();
    await expect(readGuestCounts([1], vi.fn<typeof fetch>().mockResolvedValue(new Response("No", { status: 503 })))).rejects.toThrow();
  });
  it("paginates a batch and refuses an incomplete terminal page", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response([row(1)], 2)).mockResolvedValueOnce(response([row(2)], 2));
    expect(await readGuestCounts([1, 2], fetcher)).toEqual({ "1:50": 4, "2:50": 4 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    const incomplete = vi.fn<typeof fetch>().mockResolvedValueOnce(response([row(1)], 2)).mockResolvedValueOnce(response([], 2));
    await expect(readGuestCounts([1, 2], incomplete)).rejects.toThrow();
  });
  it("does not contact the source for an empty list", async () => {
    const fetcher = vi.fn<typeof fetch>(); expect(await readGuestCounts([], fetcher)).toEqual({}); expect(fetcher).not.toHaveBeenCalled();
  });
});
