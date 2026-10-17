import { describe, expect, it, vi } from "vitest";
import { localDate, readClient, systemKey, validateRange } from "./operations";
import { authorized } from "./operations-auth";
const config = { baseUrl: "https://example.test", version: "36", login: "test", password: "not-a-real-password", timeZone: "Europe/Warsaw" };
const reservation = (id: number) => ({ id, reservationDetails: { dateFrom: "2026-10-14 15:00", dateTo: "2026-10-16 10:00", status: "accepted", internalNote: "PRIVATE", price: 123 }, client: { email: "private@example.test" }, items: [{ objectItemId: 7 }, { objectItemId: 8 }] });
const page = (reservations: unknown[], pageAll: number, countAll: number) => Response.json({ result: { reservations, result: { pageAll, countAll } } });
describe("IdoBooking operational reads", () => {
  it("reads every page and preserves multi-unit reservations without guest data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(page([reservation(1)], 2, 2)).mockResolvedValueOnce(page([reservation(2)], 2, 2));
    const stays = await readClient(config, fetcher).stays("2026-10-15", "2026-10-17");
    expect(stays).toHaveLength(4);
    expect(stays[0]).toEqual({ id: 1, unitId: 7, from: "2026-10-14T15:00", to: "2026-10-16T10:00", status: "accepted" });
    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string) as { paramsSearch: unknown };
    expect(body.paramsSearch).toEqual({ betweenDateRange: { startDate: "2026-10-15 00:00", endDate: "2026-10-17 00:00" } });
    expect(JSON.stringify(stays)).not.toMatch(/PRIVATE|email|price|systemKey/);
    const second = JSON.parse(fetcher.mock.calls[1]?.[1]?.body as string) as { result: { page: number } };
    expect(second.result.page).toBe(2);
  });
  it("fails closed on partial pages, API errors and missing metadata", async () => {
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(page([], 1, 1))).stays("2026-10-15", "2026-10-17")).rejects.toThrow("row count");
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: { errors: [{ faultCode: 10, faultString: "PRIVATE" }] } }))).units()).rejects.toThrow("error codes 10");
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: { objects: [] } }))).units()).rejects.toThrow("pagination");
  });
  it("uses item identifiers rather than object identifiers", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ result: { objects: [{ id: 2, name: "Apartment", items: [{ id: 7, code: "A" }, { id: 8, code: "B" }] }], result: { pageAll: 1, countAll: 1 } } }));
    expect((await readClient(config, fetcher).units()).map(u => u.id)).toEqual([7, 8]);
  });
  it("uses the panel date across UTC midnight and rejects malformed ranges", () => {
    expect(systemKey("pw", new Date("2026-10-15T23:30:00Z"), "Europe/Warsaw")).toBe(systemKey("pw", new Date("2026-10-16T12:00:00Z"), "Europe/Warsaw"));
    expect(() => validateRange("2026-02-30", "2026-03-03")).toThrow();
    expect(() => validateRange("2026-10-15", "2026-12-01")).toThrow();
    expect(() => localDate("2026-10-15 15:00garbage")).toThrow();
  });
  it("requires a configured, long, matching token", () => {
    expect(authorized(null, undefined)).toBe(false);
    expect(authorized("Bearer short", "short")).toBe(false);
    expect(authorized("Bearer " + "a".repeat(32), "b".repeat(32))).toBe(false);
    expect(authorized("Bearer " + "a".repeat(32), "a".repeat(32))).toBe(true);
  });
});
