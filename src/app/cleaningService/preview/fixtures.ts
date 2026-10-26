import { buildCleaningOverview } from "@/server/cleaning/overview";
import { type CleaningSnapshot } from "@/server/cleaning/types";
import { revision } from "@/server/idobooking/operations";
import { type RouterOutputs } from "@/trpc/react";

type Response = RouterOutputs["cleaning"]["listOverview"];

export function addFixtureDays(day: string, days: number) {
  const date = new Date(day + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Synthetic property identifiers and reservations; never connects to a database or iDoBooking. */
export function createCleaningPreviewFixture(now = new Date()): Response {
  const from = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const day = (offset: number) => addFixtureDays(from, offset);
  const snapshot: CleaningSnapshot = {
    from,
    to: day(7),
    fetchedAt: now.toISOString(),
    timeZone: "Europe/Warsaw",
    units: [
      {
        id: 91001,
        objectId: 9901,
        name: "Apartament Lawendowy",
        code: "DEMO-01",
        address: "Testowa 1, Warszawa",
        mapping: "source-id",
        locationStatus: "known",
        locationId: 94001,
      },
      {
        id: 91002,
        objectId: 9902,
        name: "Apartament Słoneczny",
        code: "DEMO-02",
        mapping: "source-id",
        locationStatus: "missing",
      },
      {
        id: 91003,
        objectId: 9903,
        name: "Studio Parkowe",
        code: "DEMO-03",
        address: "Testowa 3, Warszawa",
        mapping: "source-id",
        locationStatus: "known",
        locationId: 94003,
      },
      {
        id: 91004,
        objectId: 9904,
        name: "Apartament do wyjaśnienia",
        code: "DEMO-04",
        address: "Testowa 4, Warszawa",
        mapping: "source-id",
        locationStatus: "known",
        locationId: 94004,
      },
      {
        id: 91005,
        objectId: 9905,
        name: "Studio z blokadą",
        code: "DEMO-05",
        address: "Testowa 5, Warszawa",
        mapping: "source-id",
        locationStatus: "known",
        locationId: 94005,
      },
      {
        id: 91006,
        objectId: 9906,
        name: "Apartament anulowany",
        code: "DEMO-06",
        mapping: "source-id",
        locationStatus: "known",
        locationId: 94006,
      },
    ],
    stays: [
      {
        id: 92001,
        unitId: 91001,
        from: day(-2) + "T15:00",
        to: day(0) + "T10:00",
        status: "accepted",
      },
      {
        id: 92002,
        unitId: 91001,
        from: day(0) + "T15:00",
        to: day(9) + "T10:00",
        status: "accepted",
      },
      {
        id: 92003,
        unitId: 91002,
        from: day(-1) + "T15:00",
        to: day(1) + "T10:00",
        status: "paymentInProgress",
      },
      {
        id: 92004,
        unitId: 91002,
        from: day(1) + "T15:00",
        to: day(9) + "T10:00",
        status: "accepted",
      },
      {
        id: 92005,
        unitId: 91003,
        from: day(-1) + "T15:00",
        to: day(2) + "T10:00",
        status: "accepted",
      },
      {
        id: 92006,
        unitId: 91003,
        from: day(2) + "T10:30",
        to: day(9) + "T10:00",
        status: "accepted",
      },
      {
        id: 92007,
        unitId: 91004,
        from: day(0) + "T15:00",
        to: day(3) + "T10:00",
        status: "newUnknownStatus",
      },
      {
        id: 92008,
        unitId: 91005,
        from: day(0) + "T15:00",
        to: day(4) + "T10:00",
        status: "accepted",
      },
      {
        id: 92009,
        unitId: 91006,
        from: day(0) + "T15:00",
        to: day(5) + "T10:00",
        status: "canceled",
      },
    ],
    locks: [
      {
        id: 93001,
        unitId: 91005,
        objectId: 9905,
        from: day(4),
        to: day(4),
        note: "Fikcyjna blokada testowa",
      },
    ],
  };
  const result = buildCleaningOverview(snapshot, {
    accountId: "demo-only",
    archivedUnitIds: new Set(),
    apartments: snapshot.units.map((unit) => ({
      id: unit.id + 100000,
      idobookingId: unit.id,
      name: unit.name,
      address: unit.address ?? "",
      images: [],
      rooms: [{ code: unit.code }],
    })),
  });
  const data = {
    schemaVersion: result.schemaVersion,
    from: result.from,
    to: result.to,
    timeZone: result.timeZone,
    policy: result.policy,
    candidates: result.candidates,
    reviews: result.reviews,
    excluded: result.excluded,
    counts: result.counts,
    overview: result.overview,
    source: {
      apiVersion: "36",
      catalogSource: "active-admin-readonly" as const,
      reservationsComplete: true,
      availabilityLocksComplete: true,
    },
  };
  return { ...data, revision: revision(data), fetchedAt: snapshot.fetchedAt };
}
