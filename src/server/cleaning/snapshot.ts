import { revalidateTag, unstable_cache } from "next/cache";
import {
  configFromEnv,
  readClient,
  revision,
  validateRange,
} from "@/server/idobooking/operations";
import { enrichCleaningLocations } from "./locations";
import type { CleaningSnapshot } from "./types";

function sourceIdentity(config: ReturnType<typeof configFromEnv>) {
  // No credentials or login are exposed in the response or cache key.
  const accountId = revision({ origin: config.baseUrl, login: config.login });
  return {
    accountId,
    cacheId: revision({
      accountId,
      version: config.version,
      timeZone: config.timeZone,
    }),
  };
}

export function cleaningAccountId() {
  return sourceIdentity(configFromEnv()).accountId;
}

function clientFor(cacheId: string) {
  const config = configFromEnv();
  if (sourceIdentity(config).cacheId !== cacheId)
    throw new Error("IdoBooking configuration changed during the read");
  return { config, client: readClient(config) };
}

const CATALOG_TAG = "cleaning:catalog:v2";
const SNAPSHOT_TAG = "cleaning:snapshot:v2";
async function readCatalog(cacheId: string) {
  const { config, client } = clientFor(cacheId);
  const units = await enrichCleaningLocations(config, await client.units());
  clientFor(cacheId);
  return units;
}
const catalog = unstable_cache(readCatalog, ["cleaning-catalog-v2"], {
  revalidate: 86400,
  tags: [CATALOG_TAG],
});
async function readSnapshot(
  from: string,
  to: string,
  cacheId: string,
  freshCatalog = false,
): Promise<CleaningSnapshot> {
  const { config, client } = clientFor(cacheId);
  // The oldest read, rather than the last network response, determines freshness.
  const fetchedAt = new Date().toISOString();
  const [cachedUnits, stays, locks] = await Promise.all([
    freshCatalog ? readCatalog(cacheId) : catalog(cacheId),
    client.stays(from, to),
    client.availabilityLocks(from, to),
  ]);
  const units = stays.some((s) => !cachedUnits.some((u) => u.id === s.unitId))
    ? await readCatalog(cacheId)
    : cachedUnits;
  // Reject source/account changes that happen while a paginated read is running.
  clientFor(cacheId);
  // Cleaning needs blocking dates, not private notes or access instructions.
  const cleaningLocks = locks.map(
    ({ id, unitId, objectId, from: start, to: end }) => ({
      id,
      unitId,
      objectId,
      from: start,
      to: end,
      note: "",
    }),
  );
  return {
    fetchedAt,
    timeZone: config.timeZone,
    from,
    to,
    units,
    stays,
    locks: cleaningLocks,
  };
}
const snapshot = unstable_cache(
  async (from: string, to: string, cacheId: string) =>
    readSnapshot(from, to, cacheId),
  ["cleaning-snapshot-v2"],
  { revalidate: 60, tags: [SNAPSHOT_TAG] },
);

/** Cleaning-only snapshot and cache. Existing admin/operations routes do not use this service. */
export async function getCleaningSnapshot(
  from: string,
  to: string,
  options: { forceRefresh?: boolean } = {},
) {
  validateRange(from, to);
  const config = configFromEnv();
  const { accountId, cacheId } = sourceIdentity(config);
  const state = options.forceRefresh
    ? await readSnapshot(from, to, cacheId, true)
    : await snapshot(from, to, cacheId);
  clientFor(cacheId);
  if (options.forceRefresh) {
    // Purge only cleaning caches after a successful complete read. Otherwise a later
    // ordinary query (including another date range) could resurrect the older state.
    revalidateTag(CATALOG_TAG);
    revalidateTag(SNAPSHOT_TAG);
  }
  return { ...state, accountId, apiVersion: config.version };
}
