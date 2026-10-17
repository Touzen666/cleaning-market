import { describe, expect, it, vi } from "vitest";
import { readClient } from "./operations";
const config = { baseUrl: "https://example.test", version: "36", login: "test", password: "test", timeZone: "Europe/Warsaw" };
const reservation = (id: number, note: unknown) => ({ id, reservationDetails: { dateFrom: "2026-10-14 15:00", dateTo: "2026-10-16 10:00", status: "accepted", internalNote: note, apiNote: null, clientNote: "NOT_REQUESTED", price: 100 }, client: { email: "private@example.test" }, items: [{ objectItemId: 7 }] });
const page = (rows: unknown[], pages = 1, count = rows.length) => Response.json({ result: { reservations: rows, result: { pageAll: pages, countAll: count } } });
describe("explicit reservation-note reads", () => {
  it("retains operational evidence through pagination without exporting guest or financial fields", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(page([reservation(1, " Przeniesiono z Miodowego ")], 2, 2)).mockResolvedValueOnce(page([reservation(2, " ")], 2, 2));
    const notes = await readClient(config, fetcher).reservationNotes("2026-10-15", "2026-10-17");
    expect(notes).toEqual([{ id: 1, unitIds: [7], from: "2026-10-14T15:00", to: "2026-10-16T10:00", status: "accepted", notes: [{ field: "internalNote", text: "Przeniesiono z Miodowego" }] }]);
    expect(JSON.stringify(notes)).not.toMatch(/private@example|price|NOT_REQUESTED|systemKey/);
  });
  it("does not call a partial read complete and rejects malformed notes", async () => {
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(page([], 1, 1))).reservationNotes("2026-10-15", "2026-10-17")).rejects.toThrow("row count");
    await expect(readClient(config, vi.fn<typeof fetch>().mockResolvedValue(page([reservation(1, {})]))).reservationNotes("2026-10-15", "2026-10-17")).rejects.toThrow("text field");
  });
});
