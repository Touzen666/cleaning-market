import { authorized } from "@/server/idobooking/operations-auth";
import { unstable_cache } from "next/cache";
import { configFromEnv, readClient, revision, validateRange, type BookingSnapshot } from "@/server/idobooking/operations";
import { planOperations } from "@/server/idobooking/planning";
import { mapInventory } from "@/server/idobooking/inventory";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

const catalog = unstable_cache(async () => readClient(configFromEnv()).units(), ["idobooking-operations-catalog-v1"], { revalidate: 86400 });
const snapshot = unstable_cache(async (from: string, to: string): Promise<BookingSnapshot> => {
  const config = configFromEnv();
  const client = readClient(config);
  const [cachedUnits, stays, locks] = await Promise.all([catalog(), client.stays(from, to), client.availabilityLocks(from, to)]);
  let units = cachedUnits;
  if (stays.some(s => !units.some(u => u.id === s.unitId))) units = await client.units();
  return { fetchedAt: new Date().toISOString(), timeZone: config.timeZone, from, to, units, stays, locks };
}, ["idobooking-operations-snapshot-v2-locks"], { revalidate: 60 });

/** Read-only: no database mutation, status change, notification, or assignment. */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
  if (!authorized(request.headers.get("authorization"), process.env.OPERATIONS_API_TOKEN)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const view = url.searchParams.get("view") ?? "plan";
  const unitId = url.searchParams.get("unitId");
  const cleaningMinutes = Number(url.searchParams.get("cleaningMinutes") ?? 90);
  const arrivalBufferMinutes = Number(url.searchParams.get("arrivalBufferMinutes") ?? 30);
  try {
    validateRange(from, to);
    if (!["plan", "reservations"].includes(view) || (unitId !== null && (!/^\d+$/.test(unitId) || Number(unitId) <= 0))) throw new Error("Invalid view or unitId");
    // Validate planning parameters before issuing any upstream request.
    planOperations({ from, to, timeZone: "Europe/Warsaw", fetchedAt: "", units: [], stays: [] }, { cleaningMinutes, arrivalBufferMinutes });
  } catch {
    return Response.json({ error: "Use valid from/to dates (exclusive to, max 31 days), view=plan|reservations and valid planning durations" }, { status: 400, headers });
  }
  try {
    const state = await snapshot(from, to);
    const ageSeconds = Math.max(0, Math.floor((Date.now() - Date.parse(state.fetchedAt)) / 1000));
    // Data Cache can serve an old value when revalidation fails; never silently call it fresh.
    if (ageSeconds > 300) return Response.json({ error: "Snapshot stale; verify availability in IdoBooking", fetchedAt: state.fetchedAt, ageSeconds }, { status: 503, headers });
    const apartments = await db.apartment.findMany({ select: { id: true, idobookingId: true, name: true, address: true, archived: true, reservationsDisabled: true, reservationsDisabledFrom: true, reservationsDisabledTo: true } });
    const plan = planOperations({ ...state, units: mapInventory(state.units, apartments) }, { cleaningMinutes, arrivalBufferMinutes });
    let units = plan.units;
    if (unitId !== null) units = units.filter(u => u.id === Number(unitId));
    if (unitId !== null && !units.length) return Response.json({ error: "Unknown unitId" }, { status: 404, headers });
    const data = { ...plan, units: units.map(({ reservations, ...u }) => view === "reservations" ? { ...u, reservations } : u) };
    const etag = `"${revision(data)}"`;
    const responseHeaders = { ...headers, ETag: etag, "X-Snapshot-Fetched-At": state.fetchedAt, "X-Snapshot-Age-Seconds": String(ageSeconds) };
    if (request.headers.get("if-none-match")?.split(",").some(t => t.trim().replace(/^W\//, "") === etag)) return new Response(null, { status: 304, headers: responseHeaders });
    return Response.json({ fetchedAt: state.fetchedAt, revision: etag.slice(1, -1), ...data }, { headers: responseHeaders });
  } catch {
    return Response.json({ error: "Could not obtain a complete IdoBooking snapshot; no availability published" }, { status: 502, headers });
  }
}
