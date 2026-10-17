/** Node >=22.18 (native TypeScript stripping). Read-only; prints only operational deltas. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { configFromEnv, fetchSnapshot, revision, validateRange } from "../src/server/idobooking/operations.ts";
import { planOperations } from "../src/server/idobooking/planning.ts";
import { mapInventory } from "../src/server/idobooking/inventory.ts";
import { PrismaClient } from "@prisma/client";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const name of [".env.local", ".env"]) {
  try { process.loadEnvFile(path.join(root, name)); } catch (error) { if (error.code !== "ENOENT") throw new Error("Could not load local environment"); }
}
const args = process.argv.slice(2);
const value = (name, fallback) => {
  const i = args.indexOf("--" + name);
  if (i < 0) return fallback;
  if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Missing argument: " + name);
  return args[i + 1];
};
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: process.env.IDOBOOKING_TIME_ZONE || "Europe/Warsaw", dateStyle: "short" }).format(new Date());
const from = value("from", today);
const to = value("to", new Date(Date.parse(from + "T00:00:00Z") + 7 * 86400000).toISOString().slice(0, 10));
const view = value("view", "plan");
const appUrl = value("app-url", process.env.OPERATIONS_APP_URL);
const unitId = value("unit-id", null);
const options = { cleaningMinutes: Number(value("cleaning-minutes", "90")), arrivalBufferMinutes: Number(value("arrival-buffer-minutes", "30")) };
const cacheDir = path.join(root, ".cache", "idobooking-operations");
let stateFile;
let previous;
async function main() {
  validateRange(from, to);
  if (!["plan", "reservations"].includes(view) || (unitId !== null && !/^[1-9]\d*$/.test(unitId))) throw new Error("Invalid view or unit-id");
  planOperations({ from, to, timeZone: "Europe/Warsaw", fetchedAt: "", units: [], stays: [] }, options);
  // Account, filters and duration parameters have independent cache states.
  const origin = appUrl ? new URL(appUrl).origin : configFromEnv().baseUrl;
  const key = revision({ schema: 3, origin, login: appUrl ? "app" : process.env.IDOBOOKING_LOGIN, from, to, view, unitId, options });
  await fs.mkdir(cacheDir, { recursive: true });
  stateFile = path.join(cacheDir, key + ".json");
  previous = JSON.parse(await fs.readFile(stateFile, "utf8").catch(error => { if (error.code === "ENOENT") return "null"; throw error; }));
  if (previous && !args.includes("--refresh") && Date.now() - Date.parse(previous.checkedAt) < 60000) {
    console.log(JSON.stringify({ changed: false, cached: true, checkedAt: previous.checkedAt, fetchedAt: previous.fetchedAt, revision: previous.revision }));
    return;
  }
  let data;
  let fetchedAt;
  if (appUrl) {
    const url = new URL("/api/operations/reservations", appUrl);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Use HTTPS for the operations endpoint");
    if (url.username || url.password) throw new Error("Do not put credentials in the URL");
    if (!process.env.OPERATIONS_API_TOKEN) throw new Error("Configure OPERATIONS_API_TOKEN");
    for (const [k, v] of Object.entries({ from, to, view, ...(unitId ? { unitId } : {}), ...options })) url.searchParams.set(k, String(v));
    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.OPERATIONS_API_TOKEN}`, ...(previous ? { "If-None-Match": `"${previous.revision}"` } : {}) }, signal: AbortSignal.timeout(180000), redirect: "error" });
    if (response.status === 304 && previous) {
      fetchedAt = response.headers.get("x-snapshot-fetched-at");
      if (!fetchedAt || !Number.isFinite(Date.parse(fetchedAt)) || Date.now() - Date.parse(fetchedAt) > 300000) throw new Error("Endpoint returned a stale or invalid snapshot");
      const state = { ...previous, fetchedAt, checkedAt: new Date().toISOString() };
      await save(state);
      console.log(JSON.stringify({ changed: false, checkedAt: state.checkedAt, fetchedAt, revision: state.revision }));
      return;
    }
    if (!response.ok) throw new Error(`Operations endpoint HTTP ${response.status}; cache not updated`);
    const body = await response.json();
    const { fetchedAt: at, revision: ignoredRevision, ...payload } = body;
    fetchedAt = at;
    data = payload;
    if (!Array.isArray(data.units) || !fetchedAt || !Number.isFinite(Date.parse(fetchedAt)) || Date.now() - Date.parse(fetchedAt) > 300000) throw new Error("Endpoint returned incomplete or stale data");
    if (data.lockCoverage !== "complete-read" || data.units.some(u => !Array.isArray(u.availabilityLocks))) throw new Error("Endpoint does not include availability locks; update the deployed endpoint");
  } else {
    const snapshot = await fetchSnapshot(from, to);
    if (process.env.DATABASE_URL) {
      const db = new PrismaClient({ log: [] });
      try {
        const apartments = await db.apartment.findMany({ select: { id: true, idobookingId: true, name: true, address: true, archived: true, reservationsDisabled: true, reservationsDisabledFrom: true, reservationsDisabledTo: true } });
        snapshot.units = mapInventory(snapshot.units, apartments);
      } finally { await db.$disconnect(); }
    } else snapshot.units = snapshot.units.map(u => ({ ...u, mapping: "unmapped" }));
    const plan = planOperations(snapshot, options);
    if (unitId !== null && !plan.units.some(u => u.id === Number(unitId))) throw new Error("Unknown unit-id");
    data = { ...plan, units: plan.units.filter(u => unitId === null || u.id === Number(unitId)).map(({ reservations, ...u }) => view === "reservations" ? { ...u, reservations } : u) };
    fetchedAt = snapshot.fetchedAt;
  }
  const currentRevision = revision(data);
  const old = new Map((previous?.data.units || []).map(u => [u.id, u]));
  const fresh = new Map(data.units.map(u => [u.id, u]));
  const upsert = data.units.filter(u => !old.has(u.id) || revision(old.get(u.id)) !== revision(u));
  const removed = [...old.keys()].filter(id => !fresh.has(id));
  const state = { checkedAt: new Date().toISOString(), fetchedAt, revision: currentRevision, data };
  await save(state);
  console.log(JSON.stringify({ changed: currentRevision !== previous?.revision, checkedAt: state.checkedAt, fetchedAt, revision: currentRevision, from, to, timeZone: data.timeZone, basis: data.basis, lockCoverage: data.lockCoverage, lockEndBoundary: data.lockEndBoundary, entryRequiresConfirmation: true, assumptions: data.assumptions, ...(!previous || upsert.length || removed.length ? { changes: { upsert, removed } } : {}) }));
}
async function save(state) {
  const temporary = stateFile + "." + process.pid + ".tmp";
  await fs.writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await fs.rename(temporary, stateFile);
}
main().catch(() => { console.error(JSON.stringify({ error: "Operations read failed. Check credentials, range, connectivity and API permissions. No availability published; previous cache was not overwritten." })); process.exitCode = 1; });
