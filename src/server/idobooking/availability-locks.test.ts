import { describe, expect, it, vi } from "vitest";
import { readClient } from "./operations";
import { planOperations } from "./planning";
const config = { baseUrl: "https://example.test", version: "36", login: "test", password: "test", timeZone: "Europe/Warsaw" };
const lock = { id: "721", itemId: "20", objectId: null, userId: "3", note: "Gość z Miodowego", dateFrom: "2026-09-01", dateTo: "2026-10-20" };
describe("availability locks", () => {
  it("starts at page 1 and checks an empty terminal page even after a short page", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json({ availabilityLocks: [lock] })).mockResolvedValueOnce(Response.json({ availabilityLocks: [] }));
    const result = await readClient(config, fetcher).availabilityLocks("2026-10-15", "2026-10-22");
    expect(result).toEqual([{ id: 721, unitId: 20, objectId: null, from: "2026-09-01", to: "2026-10-20", note: "Gość z Miodowego" }]);
    expect(fetcher.mock.calls.map(c => (JSON.parse(c[1]?.body as string) as { result: { page: number } }).result.page)).toEqual([1, 2]);
    expect((JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string) as { paramsSearch?: unknown }).paramsSearch).toBeUndefined();
  });
  it("rejects repeated pages and singleton API errors instead of returning an empty calendar", async () => {
    const repeated = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ availabilityLocks: [lock] }));
    await expect(readClient(config, repeated).availabilityLocks("2026-10-15", "2026-10-22")).rejects.toThrow("pagination");
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(Response.json({ availabilityLocks: [], errors: { faultCode: 3, faultString: "PRIVATE" } }))).availabilityLocks("2026-10-15", "2026-10-22")).rejects.toThrow("returned errors");
  });
  it("suppresses work in locks, flags relocation reviews and never invents a confirmed cleaning", () => {
    const plan = planOperations({ fetchedAt: "", timeZone: "Europe/Warsaw", from: "2026-10-15", to: "2026-10-17", units: [{ id: 20, objectId: 20, name: "Zamkowy", code: "20" }], stays: [], locks: [{ id: 721, unitId: 20, objectId: null, from: "2026-09-01", to: "2026-10-15", note: "Gość z Miodowego" }] });
    expect(plan.basis).toBe("reservations-and-availability-locks");
    expect(plan.units[0]?.maintenanceWindows.map(w => w.from)).toEqual(["2026-10-16T10:00"]);
    expect(plan.units[0]?.cleaningProposals).toEqual([]);
    expect(plan.units[0]?.lockOccupancyReviews[0]?.lockId).toBe(721);
  });
  it("checks object-wide locks and checkout-cleaning conflicts", () => {
    const plan = planOperations({ fetchedAt: "", timeZone: "Europe/Warsaw", from: "2026-10-15", to: "2026-10-17", units: [{ id: 20, objectId: 7, name: "Zamkowy", code: "20" }], stays: [{ id: 1, unitId: 20, from: "2026-10-14T15:00", to: "2026-10-15T10:00", status: "accepted" }], locks: [{ id: 2, unitId: null, objectId: 7, from: "2026-10-15", to: "2026-10-15", note: "Remont" }] });
    expect(plan.units[0]?.cleaningProposals[0]?.conflict).toBe(true);
  });
});
