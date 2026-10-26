import { createHash } from "node:crypto";

export type Unit = { id: number; objectId: number; name: string; code: string; apartmentId?: number; address?: string; mapping?: "id" | "unique-name" | "unmapped" | "ambiguous"; archived?: boolean; disabledFrom?: string | null; disabledTo?: string | null; disabled?: boolean };
export type Stay = { id: number; unitId: number; from: string; to: string; status: string };
export type ReservationNotes = {
  id: number; unitIds: number[]; from: string; to: string; status: string;
  notes: { field: "internalNote" | "apiNote"; text: string }[];
};
export type AvailabilityLock = { id: number; unitId: number | null; objectId: number | null; from: string; to: string; note: string };
export type BookingSnapshot = {
  fetchedAt: string;
  timeZone: string;
  from: string;
  to: string;
  units: Unit[];
  stays: Stay[];
  locks?: AvailabilityLock[];
};
type Config = { baseUrl: string; version: string; login: string; password: string; timeZone: string };
type Row = Record<string, unknown>;
const row = (value: unknown): Row => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid IdoBooking response object");
  return value as Row;
};
const integer = (value: unknown): number => {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error("Invalid IdoBooking identifier");
  return n;
};
const text = (value: unknown): string => {
  if (typeof value !== "string") throw new Error("Invalid IdoBooking text field");
  return value;
};
const sha1 = (s: string) => createHash("sha1").update(s).digest("hex");

export function configFromEnv(): Config {
  // Production and the existing integration use IDOBOOKING_USER. Keep the
  // dedicated override while accepting the deployed name without copying secrets.
  const configuredLogin = process.env.IDOBOOKING_LOGIN;
  const login = configuredLogin?.length ? configuredLogin : process.env.IDOBOOKING_USER;
  const password = process.env.IDOBOOKING_PASSWORD;
  if (!login || !password) throw new Error("Configure IDOBOOKING_LOGIN (or IDOBOOKING_USER) and IDOBOOKING_PASSWORD");
  const baseUrl = process.env.IDOBOOKING_BASE_URL ?? "https://zlote-wynajmy.pl";
  const url = new URL(baseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("IDOBOOKING_BASE_URL must be an HTTPS origin");
  }
  const version = process.env.IDOBOOKING_API_VERSION ?? "36";
  if (!/^\d+$/.test(version)) throw new Error("Invalid IdoBooking API version");
  return { baseUrl: url.origin, version, login, password, timeZone: process.env.IDOBOOKING_TIME_ZONE ?? "Europe/Warsaw" };
}

export function systemKey(password: string, now: Date, timeZone: string): string {
  const date = new Intl.DateTimeFormat("sv-SE", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).replaceAll("-", "");
  return sha1(date + sha1(password));
}

export function localDate(value: unknown): string {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/.test(raw)) throw new Error("Invalid IdoBooking stay date");
  const s = raw.replace(" ", "T").slice(0, 16);
  const date = new Date(s + ":00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 16) !== s) throw new Error("Invalid IdoBooking calendar date");
  return s;
}

export function validateRange(from: string, to: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) throw new Error("Use YYYY-MM-DD dates");
  const a = localDate(from + "T00:00");
  const b = localDate(to + "T00:00");
  const days = (Date.parse(b + "Z") - Date.parse(a + "Z")) / 86400000;
  if (days <= 0 || days > 31) throw new Error("The requested range must contain 1–31 days; to is exclusive");
}

/** Read methods only. Never log raw responses/authentication. */
export function readClient(config: Config, fetcher: typeof fetch = fetch) {
  async function pages(gateway: "objects" | "reservations", paramsSearch?: Row): Promise<Row[]> {
    const all: Row[] = [];
    let expected: number | undefined;
    let totalPages = 1;
    for (let page = 1; page <= totalPages; page++) {
      const response = await fetcher(`${config.baseUrl}/api/${gateway}/${gateway === "objects" ? "getAll" : "get"}/${config.version}/json`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json;charset=UTF-8" },
        body: JSON.stringify({
          authenticate: { systemLogin: config.login, systemKey: systemKey(config.password, new Date(), config.timeZone), lang: "pol" },
          ...(paramsSearch ? { paramsSearch } : {}),
          result: { page, number: 100, ...(gateway === "reservations" ? { returnElements: ["reservationDetails", "items"] } : {}) },
        }),
        signal: AbortSignal.timeout(30000),
        cache: "no-store",
        redirect: "error",
      });
      if (!response.ok) throw new Error(`IdoBooking ${gateway}: HTTP ${response.status}`);
      let raw: unknown;
      try { raw = await response.json(); } catch { throw new Error("IdoBooking returned invalid JSON"); }
      const envelope = row(raw);
      const body = Array.isArray(envelope[gateway]) ? envelope : row(envelope.result ?? envelope);
      if (Array.isArray(body.errors) && body.errors.length) {
        // faultString may echo request parameters, so expose codes only.
        throw new Error(`IdoBooking ${gateway}: error codes ${body.errors.map(e => String(row(e).faultCode)).join(",")}`);
      }
      if (body.success === false || !Array.isArray(body[gateway])) throw new Error(`Incomplete IdoBooking ${gateway} response`);
      const batch = (body[gateway] as unknown[]).map(row);
      if (!body.result) throw new Error("IdoBooking pagination metadata missing; completeness unknown");
      const pagination = row(body.result);
      const count = Number(pagination.countAll);
      const pageCount = Number(pagination.pageAll);
      if (!Number.isSafeInteger(count) || count < 0 || !Number.isSafeInteger(pageCount) || pageCount < 0 || pageCount > 500) {
        throw new Error("Invalid IdoBooking pagination");
      }
      if (expected !== undefined && expected !== count) throw new Error("IdoBooking changed during pagination; retry the complete read");
      expected = count;
      totalPages = Math.max(1, pageCount);
      if (page > totalPages || (page < totalPages && batch.length === 0)) throw new Error("Incomplete IdoBooking pagination");
      all.push(...batch);
    }
    if (all.length !== expected) throw new Error("IdoBooking row count does not match pagination; snapshot not safe to use");
    return all;
  }
  return {
    /** Fetch without upstream date filters so long-running/overlapping locks cannot be missed.
     * Live v36 starts at page 1 (page 0 returns error 3), and has no pagination metadata.
     * Read through an empty terminal page; reject repeated IDs if the server ignores page.
     */
    async availabilityLocks(from: string, to: string): Promise<AvailabilityLock[]> {
      validateRange(from, to);
      const all: AvailabilityLock[] = [], seen = new Set<number>();
      for (let page = 1; page <= 500; page++) {
        const response = await fetcher(`${config.baseUrl}/api/availabilitylocks/get/${config.version}/json`, {
          method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json;charset=UTF-8" },
          body: JSON.stringify({ authenticate: { systemLogin: config.login, systemKey: systemKey(config.password, new Date(), config.timeZone), lang: "pol" }, result: { page, number: 100 } }),
          signal: AbortSignal.timeout(30000), cache: "no-store", redirect: "error",
        });
        if (!response.ok) throw new Error(`IdoBooking availabilitylocks: HTTP ${response.status}`);
        const envelope = row(await response.json());
        const body = Array.isArray(envelope.availabilityLocks) ? envelope : row(envelope.result ?? envelope);
        if (body.errors && (!Array.isArray(body.errors) || body.errors.length)) throw new Error("IdoBooking availabilitylocks returned errors");
        if (body.success === false || !Array.isArray(body.availabilityLocks) || body.availabilityLocks.length > 100) throw new Error("Incomplete IdoBooking availabilitylocks response");
        if (body.availabilityLocks.length === 0) return all.filter(lock => lock.from < to && lock.to >= from);
        for (const value of body.availabilityLocks) {
          const lock = row(value), id = integer(lock.id);
          if (seen.has(id)) throw new Error("Duplicate availability lock: pagination incomplete");
          seen.add(id);
          const start = text(lock.dateFrom), end = text(lock.dateTo);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) throw new Error("Invalid availability lock date");
          localDate(start + "T00:00"); localDate(end + "T00:00");
          if (end < start) throw new Error("Invalid availability lock interval");
          const unitId = lock.itemId == null || lock.itemId === "0" || lock.itemId === 0 ? null : integer(lock.itemId);
          const objectId = lock.objectId == null || lock.objectId === "0" || lock.objectId === 0 ? null : integer(lock.objectId);
          if (unitId === null && objectId === null) throw new Error("Availability lock has no unit or object");
          all.push({ id, unitId, objectId, from: start, to: end, note: text(lock.note) });
        }
      }
      throw new Error("Availability lock page limit exceeded; completeness unknown");
    },
    /** Operational notes are fetched explicitly, outside the compact calendar feed.
     * These are reservation notes, not availability blocks. They do not prove block coverage.
     */
    async reservationNotes(from: string, to: string): Promise<ReservationNotes[]> {
      validateRange(from, to);
      const reservations = await pages("reservations", { betweenDateRange: { startDate: from + " 00:00", endDate: to + " 00:00" } });
      const seen = new Set<number>();
      return reservations.map(r => {
        const details = row(r.reservationDetails);
        const id = integer(r.id);
        if (seen.has(id)) throw new Error("Duplicate IdoBooking reservation identifier");
        seen.add(id);
        const start = localDate(details.dateFrom), end = localDate(details.dateTo);
        if (end <= start) throw new Error("Invalid IdoBooking stay interval");
        if (!Array.isArray(r.items) || !r.items.length) throw new Error("IdoBooking reservation has no units");
        const notes = (["internalNote", "apiNote"] as const).flatMap(field => {
          const value = details[field];
          if (value === undefined || value === null || value === "") return [];
          const note = text(value).trim();
          return note ? [{ field, text: note }] : [];
        });
        return { id, unitIds: [...new Set(r.items.map(i => integer(row(i).objectItemId)))], from: start, to: end, status: text(details.status), notes };
      }).filter(r => r.from < to + "T00:00" && r.to >= from + "T00:00" && r.notes.length > 0);
    },
    async units(): Promise<Unit[]> {
      const objects = await pages("objects");
      const units = objects.flatMap(o => {
        if (!Array.isArray(o.items) || o.items.length === 0) throw new Error("IdoBooking object has no reservable units");
        return o.items.map(i => {
          const item = row(i);
          const code = item.code ?? item.name ?? "";
          if (typeof code !== "string" && typeof code !== "number") throw new Error("Invalid IdoBooking unit code");
          return { id: integer(item.id), objectId: integer(o.id), name: text(o.name), code: String(code) };
        });
      });
      if (new Set(units.map(u => u.id)).size !== units.length) throw new Error("Duplicate IdoBooking unit identifier");
      return units.sort((a, b) => a.id - b.id);
    },
    async stays(from: string, to: string): Promise<Stay[]> {
      validateRange(from, to);
      // betweenDateRange includes stays that started before the requested interval.
      const reservations = await pages("reservations", { betweenDateRange: { startDate: from + " 00:00", endDate: to + " 00:00" } });
      const keys = new Set<string>();
      return reservations.flatMap(r => {
        const details = row(r.reservationDetails);
        const start = localDate(details.dateFrom);
        const end = localDate(details.dateTo);
        if (end <= start) throw new Error("Invalid IdoBooking stay interval");
        if (!Array.isArray(r.items) || !r.items.length) throw new Error("IdoBooking reservation has no units");
        return r.items.map(i => {
          const item = row(i);
          const id = integer(r.id);
          const unitId = integer(item.objectItemId); // not objectId: one object can contain multiple units.
          const key = `${id}:${unitId}`;
          if (keys.has(key)) throw new Error("Duplicate IdoBooking reservation/unit pair");
          keys.add(key);
          return { id, unitId, from: start, to: end, status: text(details.status) };
        });
      }).filter(s => s.from < to + "T00:00" && s.to >= from + "T00:00").sort((a, b) => a.from.localeCompare(b.from) || a.id - b.id || a.unitId - b.unitId);
    },
  };
}

export async function fetchSnapshot(from: string, to: string): Promise<BookingSnapshot> {
  validateRange(from, to);
  const config = configFromEnv();
  const client = readClient(config);
  const [units, stays, locks] = await Promise.all([client.units(), client.stays(from, to), client.availabilityLocks(from, to)]);
  return { fetchedAt: new Date().toISOString(), timeZone: config.timeZone, from, to, units, stays, locks };
}

export function revision(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
