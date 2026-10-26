"use client";

import Image from "next/image";
import { Home } from "lucide-react";
import {
  dayLabel,
  localTimeLabel,
  matchesSearch,
  timeLabel,
  type Candidate,
  type CleaningOverview,
} from "./view-model";

const labels = {
  accepted: "Przyjęta",
  provisional: "Oczekująca",
  unknown: "Do wyjaśnienia",
  inactive: "Nieaktywna",
};

export function ReservationList({
  overview,
  candidates,
  search,
  certainty,
  excluded,
}: {
  overview: CleaningOverview;
  candidates: Candidate[];
  search: string;
  certainty: string;
  excluded: boolean;
}) {
  const byUnit = new Map(overview.units.map((unit) => [unit.unitId, unit]));
  const rows = overview.reservations.filter((reservation) => {
    const unit = byUnit.get(reservation.unitId);
    const candidate = candidates.find(
      (candidate) =>
        candidate.unit.unitId === reservation.unitId &&
        candidate.afterReservation.id === reservation.id,
    );
    const query = search
      .trim()
      .toLocaleLowerCase("pl")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replaceAll("ł", "l");
    const name =
      `${unit?.label ?? ""} ${unit?.code ?? ""} ${unit?.address ?? ""} ${reservation.id} ${reservation.unitId}`
        .toLocaleLowerCase("pl")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replaceAll("ł", "l");
    return (
      unit &&
      (excluded
        ? reservation.certainty === "inactive"
        : reservation.certainty !== "inactive" &&
          (certainty === "all" || reservation.certainty === certainty)) &&
      (!query ||
        name.includes(query) ||
        (candidate && matchesSearch(candidate, search)))
    );
  });
  return (
    <section aria-label="Lista rezerwacji" className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-800">
          Rezerwacje w sprawdzonym zakresie{" "}
          <span className="ml-1 text-sm font-normal text-slate-400">
            ({rows.length})
          </span>
        </h2>
        <p className="text-xs text-slate-500">
          Pobyt może zaczynać się lub kończyć poza wybranym okresem.
        </p>
      </div>
      {overview.unmappedApartments.length > 0 && (
        <p
          role="note"
          className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900"
        >
          Bez jednostki iDoBooking:{" "}
          {overview.unmappedApartments
            .map((apartment) => apartment.label)
            .join(", ")}
          . Powiązanie wymaga potwierdzenia.
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[850px] border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {[
                "Apartament",
                "Rezerwacja",
                "Zameldowanie",
                "Wymeldowanie",
                "Status",
                "Sprzątanie po wyjeździe",
              ].map((label) => (
                <th key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((reservation) => {
              const unit = byUnit.get(reservation.unitId)!;
              const candidate = candidates.find(
                (item) =>
                  item.unit.unitId === reservation.unitId &&
                  item.afterReservation.id === reservation.id,
              );
              return (
                <tr
                  key={`${reservation.id}:${reservation.unitId}`}
                  className="bg-white hover:bg-slate-50/60"
                >
                  <td className="max-w-[280px] px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {unit.imageUrl ? (
                        <Image
                          src={unit.imageUrl}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <Home className="h-6 w-6 shrink-0 text-slate-300" />
                      )}
                      <div>
                        <p className="font-semibold leading-5 text-slate-800">
                          {unit.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Jednostka #{unit.unitId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-700">
                    #{reservation.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {dayLabel(reservation.from.slice(0, 10))}
                    <strong className="mt-1 block text-slate-800">
                      {localTimeLabel(reservation.from)}
                    </strong>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {dayLabel(reservation.to.slice(0, 10))}
                    <strong className="mt-1 block text-slate-800">
                      {localTimeLabel(reservation.to)}
                    </strong>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-1 font-semibold ${reservation.certainty === "provisional" ? "bg-amber-100 text-amber-900" : reservation.certainty === "accepted" ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-600"}`}
                    >
                      {labels[reservation.certainty]}
                    </span>
                  </td>
                  <td className="px-4 py-3 leading-5 text-slate-500">
                    {reservation.certainty === "inactive" ? (
                      "Nie tworzy prognozy"
                    ) : candidate ? (
                      <>
                        <span
                          className={
                            candidate.eligibleForPlanning
                              ? "font-semibold text-teal-800"
                              : "font-semibold text-orange-800"
                          }
                        >
                          {candidate.windows.length
                            ? candidate.windows
                                .map(
                                  (window) =>
                                    `${timeLabel(window.start)}–${timeLabel(window.end)}`,
                                )
                                .join(", ")
                            : "Brak pełnego okna"}
                        </span>
                        <p>
                          {candidate.eligibleForPlanning
                            ? "60 min, bez przydziału"
                            : "Do sprawdzenia"}
                        </p>
                      </>
                    ) : (
                      "Wyjazd poza zakresem lub w innej zakładce"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">
            Brak rezerwacji pasujących do filtrów.
          </p>
        )}
      </div>
    </section>
  );
}
