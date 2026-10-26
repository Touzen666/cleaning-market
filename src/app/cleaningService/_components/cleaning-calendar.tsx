"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  BrushCleaning,
  ChevronLeft,
  ChevronRight,
  Home,
  LockKeyhole,
  X,
} from "lucide-react";
import {
  CALENDAR_DAY_WIDTH,
  calendarDays,
  calendarGeometry,
  reservationLanes,
} from "./calendar-model";
import {
  dayLabel,
  localTimeLabel,
  rangeFrom,
  reasonLabels,
  shiftDate,
  timeLabel,
  todayInWarsaw,
  type CalendarLock,
  type CalendarReservation,
  type CalendarUnit,
  type Candidate,
  type CleaningOverview,
  type DateRange,
} from "./view-model";

type Selection =
  | { kind: "reservation"; item: CalendarReservation; unit: CalendarUnit }
  | { kind: "cleaning"; item: Candidate; unit: CalendarUnit }
  | { kind: "lock"; item: CalendarLock; unit: CalendarUnit };
type Props = {
  overview: CleaningOverview;
  candidates: Candidate[];
  range: DateRange;
  search: string;
  certainty: string;
  tab: "ready" | "review" | "excluded";
  onRangeChange: (range: DateRange) => void;
};

const reservationLabels = {
  accepted: "Przyjęta",
  provisional: "Oczekująca",
  unknown: "Do wyjaśnienia",
  inactive: "Nieaktywna",
};
const reservationColors = {
  accepted: "border-sky-700 bg-sky-600 text-white hover:bg-sky-700",
  provisional:
    "border-amber-500 bg-amber-200 text-amber-950 hover:bg-amber-300",
  unknown:
    "border-orange-600 bg-orange-200 text-orange-950 hover:bg-orange-300",
  inactive:
    "border-dashed border-slate-400 bg-slate-100 text-slate-600 hover:bg-slate-200",
};

export function CleaningCalendar({
  overview,
  candidates,
  range,
  search,
  certainty,
  tab,
  onRangeChange,
}: Props) {
  const [selection, setSelection] = useState<Selection>();
  const days = calendarDays(range);
  const today = todayInWarsaw();
  const dayWidth =
    days.length === 1 ? 720 : days.length <= 3 ? 280 : CALENDAR_DAY_WIDTH;
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replaceAll("ł", "l")
      .toLocaleLowerCase("pl");
  const query = normalize(search.trim());
  void certainty; // Filters qualify cleaning windows; all stays remain visible as occupancy context.
  const reservations = overview.reservations.filter((reservation) =>
    tab === "excluded"
      ? reservation.certainty === "inactive"
      : reservation.certainty !== "inactive",
  );
  const units = overview.units.filter(
    (unit) =>
      unit.active &&
      (!query ||
        normalize(
          `${unit.label} ${unit.code} ${unit.address ?? ""} ${unit.unitId}`,
        ).includes(query) ||
        reservations.some(
          (reservation) =>
            reservation.unitId === unit.unitId &&
            String(reservation.id).includes(query),
        )),
  );
  const rangeMove = (direction: number) =>
    onRangeChange(
      rangeFrom(shiftDate(range.from, direction * days.length)!, days.length),
    );

  useEffect(() => {
    setSelection(undefined);
  }, [range.from, range.to]);

  return (
    <section aria-label="Kalendarz pobytów i sprzątań" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Pobyty i okna sprzątania
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
            Paski pokazują rzeczywiste godziny pobytu. W osobnym wierszu
            znajdziesz dostępne okna na 60 minut sprzątania.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1">
          <button
            aria-label="Poprzedni okres"
            onClick={() => rangeMove(-1)}
            className="rounded-md p-2 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onRangeChange(rangeFrom(today, days.length))}
            className="rounded-md px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Dziś
          </button>
          <button
            aria-label="Następny okres"
            onClick={() => rangeMove(1)}
            className="rounded-md p-2 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        aria-label="Legenda kalendarza"
        className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600"
      >
        <Legend color="bg-sky-600" label="Rezerwacja przyjęta" />
        <Legend color="bg-amber-300" label="Rezerwacja oczekująca" />
        <Legend color="bg-orange-300" label="Status do wyjaśnienia" />
        <Legend color="bg-teal-600" label="Okno sprzątania" />
        <Legend
          color="border border-orange-300 bg-orange-50"
          label="Sprzątanie do sprawdzenia"
        />
        <Legend color="bg-slate-400" label="Blokada dostępności" />
      </div>

      {overview.unmappedApartments.length > 0 && (
        <div
          role="note"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950"
        >
          <p className="font-semibold">
            Aktywne lokale bez potwierdzonej jednostki iDoBooking (
            {overview.unmappedApartments.length})
          </p>
          <p className="mt-1">
            {overview.unmappedApartments
              .map((apartment) => apartment.label)
              .join(", ")}
            . Nie pokazujemy dla nich pustych kalendarzy — najpierw trzeba
            potwierdzić powiązanie.
          </p>
        </div>
      )}
      {overview.mappingIssues.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold">
            Jednostki iDoBooking poza aktywnym katalogiem:{" "}
            {overview.mappingIssues.length}
          </summary>
          <ul className="mt-2 space-y-1">
            {overview.mappingIssues.map((issue) => (
              <li key={`${issue.unitId}:${issue.reason}`}>
                {issue.label} · jednostka #{issue.unitId} ·{" "}
                {issue.reason === "archived"
                  ? "lokal archiwalny"
                  : issue.reason === "ambiguous"
                    ? "niejednoznaczne powiązanie"
                    : "brak powiązania"}
              </li>
            ))}
          </ul>
        </details>
      )}

      {units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
          <Home className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <h3 className="font-semibold text-slate-800">
            {query
              ? "Brak pasujących lokali"
              : "Brak aktywnych lokali z potwierdzonym powiązaniem"}
          </h3>
          <p className="mt-2 px-4 text-xs text-slate-500">
            {query
              ? "Zmień wyszukiwanie, aby zobaczyć pozostałe lokale."
              : "Sprawdź powiązania katalogu. Brak lokalu w tym widoku nie oznacza braku rezerwacji."}
          </p>
        </div>
      ) : (
        <div
          role="region"
          aria-label="Przewijany kalendarz apartamentów"
          tabIndex={0}
          className="max-h-[72vh] overflow-auto rounded-xl border border-slate-200 outline-none [--cleaning-label-width:180px] focus-visible:ring-2 focus-visible:ring-teal-600 sm:[--cleaning-label-width:250px]"
        >
          <div
            style={{
              minWidth: `calc(var(--cleaning-label-width) + ${days.length * dayWidth}px)`,
              width: "100%",
            }}
          >
            <div className="sticky top-0 z-30 flex border-b border-slate-200 bg-white shadow-sm">
              <div className="sticky left-0 z-40 flex w-[var(--cleaning-label-width)] shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 py-4 text-xs font-bold text-slate-600">
                Aktywne apartamenty{" "}
                <span className="ml-2 rounded bg-white px-1.5 py-0.5 text-slate-500">
                  {units.length}
                </span>
              </div>
              <div className="flex flex-1">
                {days.map((day) => (
                  <div
                    key={day}
                    style={{ minWidth: dayWidth, flex: 1 }}
                    className={`shrink-0 border-r border-slate-200 px-3 py-3 ${day === today ? "bg-teal-50" : "bg-white"}`}
                  >
                    <p
                      className={`text-sm font-bold capitalize ${day === today ? "text-teal-800" : "text-slate-700"}`}
                    >
                      {new Intl.DateTimeFormat("pl-PL", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        timeZone: "Europe/Warsaw",
                      }).format(new Date(day + "T12:00Z"))}
                      {day === today && (
                        <span className="ml-2 rounded bg-teal-800 px-1 py-0.5 text-[9px] uppercase text-white">
                          dziś
                        </span>
                      )}
                    </p>
                    <div className="mt-2 flex justify-between text-[10px] tabular-nums text-slate-400">
                      <span>00:00</span>
                      <span>12:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {units.map((unit) => (
              <CalendarRow
                key={unit.unitId}
                unit={unit}
                dayWidth={dayWidth}
                days={days}
                range={range}
                reservations={reservations.filter(
                  (item) => item.unitId === unit.unitId,
                )}
                locks={
                  tab === "excluded"
                    ? []
                    : overview.locks.filter(
                        (lock) =>
                          lock.unitId === unit.unitId ||
                          (lock.unitId === null &&
                            lock.objectId === unit.objectId),
                      )
                }
                candidates={
                  tab === "excluded"
                    ? []
                    : candidates.filter(
                        (candidate) => candidate.unit.unitId === unit.unitId,
                      )
                }
                today={today}
                onSelect={setSelection}
              />
            ))}
          </div>
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500">
        Przewiń kalendarz w bok, aby zobaczyć kolejne dni. Okno 10:00–15:00 daje
        wybór godziny sprzątania; nie jest przydziałem pracownika ani
        pięciogodzinnym zadaniem.
      </p>
      {selection && (
        <CalendarDetails
          selection={selection}
          reservations={overview.reservations}
          onClose={() => setSelection(undefined)}
        />
      )}
    </section>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} aria-hidden="true" />
      {label}
    </span>
  );
}

function CalendarRow({
  unit,
  dayWidth,
  days,
  range,
  reservations,
  locks,
  candidates,
  today,
  onSelect,
}: {
  unit: CalendarUnit;
  dayWidth: number;
  days: string[];
  range: DateRange;
  reservations: CalendarReservation[];
  locks: CalendarLock[];
  candidates: Candidate[];
  today: string;
  onSelect: (selection: Selection) => void;
}) {
  const lanes = reservationLanes(reservations);
  const laneCount = Math.max(1, ...lanes.map((item) => item.lane + 1));
  const occupancyHeight = laneCount * 31 + (locks.length ? 24 : 0) + 10;
  const maxDailyCleanings = Math.max(
    1,
    ...days.map(
      (day) => candidates.filter((item) => item.serviceDate === day).length,
    ),
  );
  const [imageFailed, setImageFailed] = useState(false);
  return (
    <div
      className="flex border-b border-slate-200 last:border-0"
      aria-label={`Kalendarz: ${unit.label}`}
    >
      <div className="sticky left-0 z-20 flex w-[var(--cleaning-label-width)] shrink-0 flex-col justify-between border-r border-slate-200 bg-white px-3 py-3 shadow-[3px_0_6px_-5px_#64748b]">
        <div className="flex items-start gap-2.5">
          {unit.imageUrl && !imageFailed ? (
            <Image
              src={unit.imageUrl}
              alt={`Zdjęcie: ${unit.label}`}
              width={46}
              height={46}
              unoptimized
              onError={() => setImageFailed(true)}
              className="h-11 w-11 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <Home className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="break-words text-xs font-bold leading-5 text-slate-800">
              {unit.label}
            </h3>
            <p className="mt-0.5 break-words text-[10px] text-slate-500">
              {unit.code} · ID {unit.unitId}
            </p>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-[9px] text-slate-400">
          <p>Pobyty i blokady</p>
          <p className="flex items-center gap-1 font-semibold text-teal-700">
            <BrushCleaning className="h-3 w-3" />
            Okna sprzątania
          </p>
        </div>
      </div>
      <div
        className="relative flex-1"
        style={{ minHeight: occupancyHeight + maxDailyCleanings * 57 + 4 }}
      >
        <div
          className="pointer-events-none absolute inset-0 flex"
          aria-hidden="true"
        >
          {days.map((day) => (
            <div
              key={day}
              style={{ minWidth: dayWidth, flex: 1 }}
              className={`relative shrink-0 border-r border-slate-100 ${day === today ? "bg-teal-50/40" : "bg-white"}`}
            >
              <div className="absolute inset-y-0 left-1/2 border-l border-dotted border-slate-100" />
            </div>
          ))}
        </div>
        <div className="relative" style={{ height: occupancyHeight }}>
          {lanes.map(({ reservation, lane }) => {
            const geometry = calendarGeometry(
              reservation.from,
              reservation.to,
              range,
            );
            return (
              geometry && (
                <button
                  key={`${reservation.id}:${reservation.unitId}`}
                  aria-label={`Rezerwacja ${reservation.id}, ${unit.label}, ${reservationLabels[reservation.certainty]}, od ${reservation.from.replace("T", " ")} do ${reservation.to.replace("T", " ")}`}
                  onClick={() =>
                    onSelect({ kind: "reservation", item: reservation, unit })
                  }
                  style={{
                    left: `${geometry.left}%`,
                    width: `${geometry.width}%`,
                    top: 9 + lane * 31,
                    minWidth: 5,
                  }}
                  className={`absolute h-6 overflow-hidden rounded-md border px-2 text-left text-[10px] font-semibold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-1 ${reservationColors[reservation.certainty]}`}
                  title={`#${reservation.id} · ${reservationLabels[reservation.certainty]} · ${reservation.from.replace("T", " ")} → ${reservation.to.replace("T", " ")}`}
                >
                  <span className="whitespace-nowrap">
                    #{reservation.id} ·{" "}
                    {reservationLabels[reservation.certainty]}{" "}
                    <span className="font-normal opacity-85">
                      {localTimeLabel(reservation.from)} →{" "}
                      {localTimeLabel(reservation.to)}
                    </span>
                  </span>
                </button>
              )
            );
          })}
          {locks.map((lock) => {
            const geometry = calendarGeometry(
              lock.from,
              shiftDate(lock.to, 1)!,
              range,
            );
            return (
              geometry && (
                <button
                  key={lock.id}
                  aria-label={`Blokada dostępności ${lock.id}, ${unit.label}`}
                  onClick={() => onSelect({ kind: "lock", item: lock, unit })}
                  style={{
                    left: `${geometry.left}%`,
                    width: `${geometry.width}%`,
                    top: 10 + laneCount * 31,
                  }}
                  className="absolute flex h-5 items-center gap-1 overflow-hidden rounded border border-dashed border-slate-400 bg-slate-200 px-2 text-left text-[10px] font-semibold text-slate-600 hover:bg-slate-300"
                >
                  <LockKeyhole className="h-3 w-3 shrink-0" />
                  <span className="whitespace-nowrap">Blokada #{lock.id}</span>
                </button>
              )
            );
          })}
        </div>
        <div className="relative flex border-t border-dashed border-slate-200">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
            aria-hidden="true"
          >
            {candidates.flatMap((candidate) =>
              candidate.windows.map((window) => {
                const geometry = calendarGeometry(
                  window.start,
                  window.end,
                  range,
                );
                return (
                  geometry && (
                    <span
                      key={`${candidate.id}:${window.start}`}
                      className={`absolute h-1.5 rounded-b ${candidate.eligibleForPlanning ? "bg-teal-600" : "bg-orange-400"}`}
                      style={{
                        left: `${geometry.left}%`,
                        width: `${geometry.width}%`,
                      }}
                    />
                  )
                );
              }),
            )}
          </div>
          {days.map((day) => (
            <div
              key={day}
              style={{ minWidth: dayWidth, flex: 1 }}
              className="shrink-0 space-y-1.5 px-2 pb-2 pt-3"
            >
              {candidates
                .filter((candidate) => candidate.serviceDate === day)
                .map((candidate) => (
                  <button
                    key={candidate.id}
                    aria-label={`Sprzątanie ${unit.label}, ${day}, ${candidate.eligibleForPlanning ? "do planowania" : "do sprawdzenia"}, 60 minut`}
                    onClick={() =>
                      onSelect({ kind: "cleaning", item: candidate, unit })
                    }
                    className={`w-full rounded-lg border px-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-teal-700 ${candidate.eligibleForPlanning ? "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-100" : "border-orange-200 bg-orange-50 text-orange-950 hover:bg-orange-100"}`}
                  >
                    <span className="flex items-center gap-1 text-[11px] font-bold">
                      <BrushCleaning className="h-3 w-3 shrink-0" />
                      {candidate.windows.length
                        ? candidate.windows
                            .map(
                              (window) =>
                                `${timeLabel(window.start)}–${timeLabel(window.end)}`,
                            )
                            .join(", ")
                        : "Do sprawdzenia"}
                    </span>
                    <span className="mt-1 block text-[10px]">
                      60 min ·{" "}
                      {candidate.eligibleForPlanning
                        ? candidate.certainty === "provisional"
                          ? "wstępne"
                          : "do planowania"
                        : "wymaga decyzji"}
                    </span>
                  </button>
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CalendarDetails({
  selection,
  reservations,
  onClose,
}: {
  selection: Selection;
  reservations: CalendarReservation[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        event.preventDefault();
        dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [onClose]);
  const { unit } = selection;
  const outgoingId =
    selection.kind === "cleaning" ? selection.item.afterReservation.id : null;
  const outgoing = reservations.find(
    (reservation) =>
      reservation.id === outgoingId && reservation.unitId === unit.unitId,
  );
  const conflicts = outgoing
    ? reservations.filter(
        (reservation) =>
          reservation.unitId === unit.unitId &&
          reservation.id !== outgoing.id &&
          reservation.certainty !== "inactive" &&
          reservation.from < outgoing.to &&
          reservation.to > outgoing.from,
      )
    : [];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-detail-title"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
              {unit.label}
            </p>
            <h2
              id="calendar-detail-title"
              className="text-xl font-bold text-slate-900"
            >
              {selection.kind === "cleaning"
                ? "Okno sprzątania"
                : selection.kind === "reservation"
                  ? `Rezerwacja #${selection.item.id}`
                  : "Blokada dostępności"}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij szczegóły"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-5 text-sm text-slate-600">
          {selection.kind === "reservation" ? (
            <>
              <Detail
                label="Status"
                value={`${reservationLabels[selection.item.certainty]} (${selection.item.status})`}
              />
              <Detail
                label="Zameldowanie"
                value={`${dayLabel(selection.item.from.slice(0, 10))}, ${localTimeLabel(selection.item.from)}`}
              />
              <Detail
                label="Wymeldowanie"
                value={`${dayLabel(selection.item.to.slice(0, 10))}, ${localTimeLabel(selection.item.to)}`}
              />
            </>
          ) : selection.kind === "lock" ? (
            <>
              <Detail label="Numer blokady" value={`#${selection.item.id}`} />
              <Detail
                label="Zakres blokady"
                value={`${dayLabel(selection.item.from)} – ${dayLabel(selection.item.to)} (łącznie z ostatnim dniem)`}
              />
              <p className="rounded-lg bg-slate-100 p-3 text-xs leading-5">
                Blokada dostępności wymaga sprawdzenia przed ustawieniem
                sprzątania w tym czasie.
              </p>
            </>
          ) : (
            <>
              <Detail
                label="Dzień sprzątania"
                value={dayLabel(selection.item.serviceDate, true)}
              />
              <Detail
                label="Czas zadania"
                value={`${selection.item.duration.estimatedMinutes} minut`}
              />
              <Detail
                label="Dostępne okno"
                value={
                  selection.item.windows.length
                    ? selection.item.windows
                        .map(
                          (window) =>
                            `${timeLabel(window.start)}–${timeLabel(window.end)}`,
                        )
                        .join(", ")
                    : "Brak pełnego okna na 60 minut"
                }
              />
              <Detail
                label="Rezerwacja po wyjeździe"
                value={`#${selection.item.afterReservation.id} · ${localTimeLabel(selection.item.afterReservation.checkoutLocal)}`}
              />
              <Detail
                label="Najbliższy przyjazd po wyjeździe"
                value={
                  selection.item.beforeReservation
                    ? `#${selection.item.beforeReservation.id} · ${dayLabel(selection.item.beforeReservation.checkinLocal.slice(0, 10))}, ${localTimeLabel(selection.item.beforeReservation.checkinLocal)}`
                    : "Brak w sprawdzonym zakresie"
                }
              />
              {conflicts.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs leading-5 text-orange-950">
                  <p className="font-semibold">
                    Pobyty nakładające się na tę rezerwację
                  </p>
                  <ul className="mt-1 space-y-1">
                    {conflicts.map((reservation) => (
                      <li key={`${reservation.id}:${reservation.unitId}`}>
                        #{reservation.id} ·{" "}
                        {dayLabel(reservation.from.slice(0, 10))},{" "}
                        {localTimeLabel(reservation.from)} →{" "}
                        {dayLabel(reservation.to.slice(0, 10))},{" "}
                        {localTimeLabel(reservation.to)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {selection.item.certainty === "provisional" && (
                <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                  Sprzątanie wstępne: rezerwacja oczekująca może jeszcze zostać
                  zmieniona lub anulowana.
                </p>
              )}
              {selection.item.reviewReasons.length > 0 && (
                <ul className="space-y-2 rounded-lg bg-orange-50 p-3 text-xs leading-5 text-orange-900">
                  {selection.item.reviewReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {reasonLabels[reason]}
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-slate-100 pt-3 text-xs leading-5">
                {selection.item.eligibleForPlanning
                  ? "To dostępne okno, bez ustalonej godziny i pracownika."
                  : "Ta pozycja wymaga sprawdzenia przed planowaniem."}{" "}
                Wejście do lokalu wymaga potwierdzenia.
              </p>
            </>
          )}
          <Detail
            label="Adres"
            value={unit.address ?? "Wymaga potwierdzenia przed wejściem"}
          />
          <p className="text-xs text-slate-400">
            Jednostka iDoBooking #{unit.unitId}
            {unit.apartmentId ? ` · lokal Bookmarket #${unit.apartmentId}` : ""}
          </p>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}
