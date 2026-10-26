import {
  systemKey,
  type configFromEnv,
  type Unit,
} from "@/server/idobooking/operations";
import type { CleaningUnit } from "./types";

type Config = ReturnType<typeof configFromEnv>;
type Location = { locationId: number; address: string };
const failureMessage = "Could not obtain cleaning property locations";

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(failureMessage);
  return value as Record<string, unknown>;
}

function positiveId(value: unknown): number {
  if (
    typeof value !== "number" &&
    (typeof value !== "string" || !/^\d+$/.test(value))
  )
    throw new Error(failureMessage);
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(failureMessage);
  return id;
}

function validateEnvelope(value: Record<string, unknown>) {
  if (value.success !== undefined && value.success !== true)
    throw new Error(failureMessage);
  if (
    value.errors != null &&
    (!Array.isArray(value.errors) || value.errors.length > 0)
  )
    throw new Error(failureMessage);
}

/** Cleaning-only metadata enrichment. The native source identity never depends on admin records. */
export async function enrichCleaningLocations(
  config: Config,
  units: Unit[],
  fetcher: typeof fetch = fetch,
): Promise<CleaningUnit[]> {
  try {
    const unitIds = new Set<number>();
    for (const unit of units) {
      positiveId(unit.objectId);
      const id = positiveId(unit.id);
      if (unitIds.has(id)) throw new Error(failureMessage);
      unitIds.add(id);
    }
    const objectIds = [...new Set(units.map((unit) => unit.objectId))];
    const locations = new Map<number, Location[]>();
    for (let offset = 0; offset < objectIds.length; offset += 100) {
      const batch = objectIds.slice(offset, offset + 100);
      const requested = new Set(batch);
      const response = await fetcher(
        `${config.baseUrl}/api/objects/getLocation/${config.version}/json`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json;charset=UTF-8",
          },
          body: JSON.stringify({
            authenticate: {
              systemLogin: config.login,
              systemKey: systemKey(
                config.password,
                new Date(),
                config.timeZone,
              ),
              lang: "pol",
            },
            paramsSearchObjectLocation: {
              objects: batch.map((id) => ({ id })),
            },
          }),
          signal: AbortSignal.timeout(30000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error(failureMessage);
      const envelope = record(await response.json());
      validateEnvelope(envelope);
      const body = Array.isArray(envelope.objectLocations)
        ? envelope
        : record(envelope.result ?? envelope);
      validateEnvelope(body);
      if (!Array.isArray(body.objectLocations)) throw new Error(failureMessage);
      for (const value of body.objectLocations) {
        const location = record(value);
        const objectId = positiveId(location.objectId);
        const locationId = positiveId(location.locationId);
        if (!requested.has(objectId) || typeof location.address !== "string")
          throw new Error(failureMessage);
        const existing = locations.get(objectId) ?? [];
        existing.push({ locationId, address: location.address.trim() });
        locations.set(objectId, existing);
      }
    }
    return units.map((unit) => {
      // Whitelist source fields: old Apartment mappings, addresses and admin exclusion flags never leak in.
      const native = {
        id: unit.id,
        objectId: unit.objectId,
        name: unit.name,
        code: unit.code,
        mapping: "source-id" as const,
      };
      const matches = locations.get(unit.objectId) ?? [];
      if (matches.length > 1)
        return { ...native, locationStatus: "ambiguous" as const };
      const location = matches[0];
      if (!location?.address)
        return { ...native, locationStatus: "missing" as const };
      return {
        ...native,
        locationStatus: "known" as const,
        locationId: location.locationId,
        address: location.address,
      };
    });
  } catch {
    // Upstream error bodies and thrown transport errors may contain credentials; never echo them.
    throw new Error(failureMessage);
  }
}
