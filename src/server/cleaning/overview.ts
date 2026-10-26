import { buildCleaningCandidates, reservationClass } from "./candidates";
import { revision } from "@/server/idobooking/operations";
import type { CleaningSnapshot } from "./types";

export type ActiveCleaningApartment = {
  id: number;
  idobookingId: number | null;
  name: string;
  address: string;
  images: { url: string; isPrimary: boolean; order: number }[];
  rooms: { code: string }[];
};

const nonempty = (value: string | undefined) =>
  value?.trim() ? value.trim() : null;

const canonicalName = (name: string) =>
  name.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");

function photo(apartment: ActiveCleaningApartment) {
  const images = [...apartment.images].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      a.order - b.order ||
      a.url.localeCompare(b.url),
  );
  return (
    images.find((image) => {
      try {
        return new URL(image.url).protocol === "https:";
      } catch {
        return false;
      }
    })?.url ?? null
  );
}

/** Local catalog supplies presentation only. Reservations retain native objectItemId identity. */
export function buildCleaningOverview(
  snapshot: CleaningSnapshot,
  context: {
    accountId: string;
    apartments: ActiveCleaningApartment[];
    archivedUnitIds: ReadonlySet<number>;
  },
) {
  // Validate and calculate occupancy against the ENTIRE source before any catalog filtering.
  const all = buildCleaningCandidates(snapshot, {
    accountId: context.accountId,
  });
  const mappingIssues: {
    unitId: number;
    reason: "archived" | "unmapped" | "ambiguous";
    label: string;
  }[] = [];
  const units = snapshot.units
    .flatMap((unit) => {
      if (context.archivedUnitIds.has(unit.id)) {
        mappingIssues.push({
          unitId: unit.id,
          reason: "archived",
          label: unit.name,
        });
        return [];
      }
      let method: "id" | "unique-name" = "id";
      let matches = context.apartments.filter(
        (apartment) => apartment.idobookingId === unit.id,
      );
      if (!matches.length) {
        method = "unique-name";
        matches = context.apartments.filter(
          (apartment) =>
            apartment.idobookingId === null &&
            canonicalName(apartment.name) === canonicalName(unit.name),
        );
        // Several items under the same object cannot be collapsed by a shared property name.
        const siblings = snapshot.units.filter(
          (other) =>
            other.objectId === unit.objectId ||
            canonicalName(other.name) === canonicalName(unit.name),
        );
        if (siblings.length > 1) {
          matches = matches.filter((apartment) =>
            apartment.rooms.some(
              (room) => canonicalName(room.code) === canonicalName(unit.code),
            ),
          );
          const sameCode = siblings.filter(
            (other) => canonicalName(other.code) === canonicalName(unit.code),
          );
          if (sameCode.length !== 1) matches = [];
        }
      }
      if (matches.length !== 1) {
        mappingIssues.push({
          unitId: unit.id,
          reason: matches.length > 1 ? "ambiguous" : "unmapped",
          label: unit.name,
        });
        return [];
      }
      const apartment = matches[0]!;
      return [
        {
          unitId: unit.id,
          objectId: unit.objectId,
          apartmentId: apartment.id,
          label: apartment.name.trim(),
          code: unit.code,
          address: nonempty(unit.address) ?? nonempty(apartment.address),
          imageUrl: photo(apartment),
          mapping: method,
          active: true,
        },
      ];
    })
    .sort(
      (a, b) => a.label.localeCompare(b.label, "pl") || a.unitId - b.unitId,
    );
  const byUnit = new Map(units.map((unit) => [unit.unitId, unit]));
  const archived = context.archivedUnitIds;
  const enrich = (candidate: (typeof all.candidates)[number]) => {
    const mapped = byUnit.get(candidate.unit.unitId);
    const value = {
      ...candidate,
      eligibleForPlanning: candidate.eligibleForPlanning && !!mapped,
      unit: {
        ...candidate.unit,
        apartmentId: mapped?.apartmentId ?? null,
        label: mapped?.label ?? candidate.unit.label,
        address: mapped?.address ?? candidate.unit.address,
        imageUrl: mapped?.imageUrl ?? null,
        catalogMapping: mapped?.mapping ?? "unmapped",
      },
      reviewReasons: mapped
        ? candidate.reviewReasons
        : [
            ...new Set([
              ...candidate.reviewReasons,
              "UNVERIFIED_UNIT_MAPPING" as const,
            ]),
          ].sort(),
    };
    return { ...value, candidateRevision: revision(value) };
  };
  const items = [...all.candidates, ...all.reviews]
    .filter((candidate) => !archived.has(candidate.unit.unitId))
    .map(enrich)
    .sort(
      (a, b) =>
        a.serviceDate.localeCompare(b.serviceDate) ||
        a.unit.label.localeCompare(b.unit.label, "pl") ||
        a.id.localeCompare(b.id),
    );
  const candidates = items.filter((candidate) => candidate.eligibleForPlanning);
  const reviews = items.filter((candidate) => !candidate.eligibleForPlanning);
  const excluded = all.excluded.filter((item) => !archived.has(item.unitId));
  const mappedApartments = new Set(units.map((unit) => unit.apartmentId));
  return {
    ...all,
    candidates,
    reviews,
    excluded,
    counts: {
      acceptedCandidates: candidates.filter(
        (candidate) => candidate.certainty === "accepted",
      ).length,
      provisionalCandidates: candidates.filter(
        (candidate) => candidate.certainty === "provisional",
      ).length,
      reviews: reviews.length,
      excluded: excluded.length,
    },
    overview: {
      units,
      reservations: snapshot.stays
        .filter((stay) => byUnit.has(stay.unitId))
        .map((stay) => ({
          id: stay.id,
          unitId: stay.unitId,
          from: stay.from,
          to: stay.to,
          status: stay.status,
          certainty:
            reservationClass(stay.status) === "review"
              ? ("unknown" as const)
              : (reservationClass(stay.status) as
                  | "accepted"
                  | "provisional"
                  | "inactive"),
        }))
        .sort(
          (a, b) =>
            a.from.localeCompare(b.from) || a.unitId - b.unitId || a.id - b.id,
        ),
      locks: (snapshot.locks ?? [])
        .filter((lock) =>
          units.some(
            (unit) =>
              lock.unitId === unit.unitId ||
              (lock.unitId === null && lock.objectId === unit.objectId),
          ),
        )
        .map(({ id, unitId, objectId, from, to }) => ({
          id,
          unitId,
          objectId,
          from,
          to,
        })),
      mappingIssues,
      unmappedApartments: context.apartments
        .filter((apartment) => !mappedApartments.has(apartment.id))
        .map((apartment) => ({
          apartmentId: apartment.id,
          label: apartment.name.trim(),
          address: apartment.address || null,
          imageUrl: photo(apartment),
        })),
    },
  };
}
