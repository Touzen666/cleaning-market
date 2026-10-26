"use client";

import { useEffect, useState } from "react";
import { CleaningCalendar } from "./cleaning-calendar";
import { ReservationList } from "./reservation-list";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  List,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import {
  dayLabel,
  localTimeLabel,
  matchesSearch,
  positionCount,
  rangeFrom,
  readAtLabel,
  reasonLabels,
  shiftDate,
  timeLabel,
  type Candidate,
  type CandidatesResponse,
  type CleaningOverview,
  type DateRange,
} from "./view-model";

type Props = {
  data?: CandidatesResponse & { overview?: CleaningOverview };
  loading?: boolean;
  refreshing?: boolean;
  error?: string;
  range: DateRange;
  onRangeChange: (range: DateRange) => void;
  onRefresh: () => void;
};
type Tab = "ready" | "review" | "excluded";

export function CleaningCandidatesPanel({
  data,
  loading,
  refreshing,
  error,
  range,
  onRangeChange,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("ready");
  const [certainty, setCertainty] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const days = Math.round(
    (Date.parse(range.to) - Date.parse(range.from)) / 86400000,
  );
  const freshAge = data ? now - Date.parse(data.fetchedAt) : 0;
  const stale = !!data && freshAge > 300000;
  const sourceItems = tab === "ready" ? data?.candidates : data?.reviews;
  const items = (sourceItems ?? []).filter(
    (c) =>
      matchesSearch(c, search) &&
      (certainty === "all" || c.certainty === certainty),
  );
  const excluded = (data?.excluded ?? []).filter((c) =>
    `${c.reservationId} ${c.unitId}`.includes(search.trim()),
  );
  const visibleCount = tab === "excluded" ? excluded.length : items.length;
  const filtersActive =
    Boolean(search.trim()) || (tab !== "excluded" && certainty !== "all");
  const totalReady = data
    ? data.counts.acceptedCandidates + data.counts.provisionalCandidates
    : undefined;

  return (
    <div className="space-y-4">
      <section
        className="flex flex-wrap items-start justify-between gap-4"
        aria-labelledby="candidates-title"
      >
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-700">
            <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />{" "}
            Przygotowanie sprzątań
          </div>
          <h1
            id="candidates-title"
            className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
          >
            Rezerwacje i sprzątania
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Sprzątania po wyjazdach z rezerwacji przyjętych i oczekujących.
            Sprawdź dostępne okna oraz pozycje wymagające wyjaśnienia.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={Boolean(refreshing) || Boolean(loading)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:opacity-50 hover:bg-teal-900"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          {refreshing ? "Pobieram rezerwacje…" : "Odśwież rezerwacje"}
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-950">
        <span className="inline-flex items-center gap-2">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          <strong>10:00–15:00</strong>
          <span className="text-teal-800">godziny pracy</span>
        </span>
        <span>
          <strong>60 min</strong> na sprzątanie
        </span>
        <span>
          <strong>3–4 sprzątania</strong> na osobę dziennie
        </span>
        <span className="text-xs text-teal-800 sm:ml-auto">
          Czas lokalny: Warszawa
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric
          label="Do planowania"
          value={totalReady}
          hint="Dostępne pełne okno"
          icon={<CheckCircle2 className="h-5 w-5 text-teal-700" />}
        />
        <Metric
          label="Przyjęte"
          value={data?.counts.acceptedCandidates}
          hint="Potwierdzone rezerwacje"
          icon={<ShieldCheck className="h-5 w-5 text-sky-700" />}
        />
        <Metric
          label="Oczekujące"
          value={data?.counts.provisionalCandidates}
          hint="Sprzątania wstępne"
          icon={<Clock3 className="h-5 w-5 text-amber-600" />}
        />
        <Metric
          label="Do sprawdzenia"
          value={data?.counts.reviews}
          hint="Wymagają Twojej uwagi"
          icon={<AlertCircle className="h-5 w-5 text-orange-600" />}
        />
      </div>

      <section
        className="rounded-2xl border border-slate-200 bg-white shadow-sm"
        aria-label="Lista kandydatów do sprzątania"
      >
        <div className="flex flex-wrap items-end gap-4 border-b border-slate-100 p-4 sm:p-5">
          <label className="flex min-w-0 basis-full flex-col gap-1.5 text-xs font-semibold text-slate-600 sm:flex-1 sm:basis-auto">
            {tab === "excluded"
              ? "Szukaj numeru rezerwacji lub jednostki"
              : "Szukaj lokalu lub rezerwacji"}
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "excluded"
                    ? "Nr rezerwacji lub jednostki"
                    : "Nazwa, adres, pokój lub nr rezerwacji"
                }
                className="min-h-11 w-full rounded-lg border border-slate-300 bg-slate-50 py-2 pl-9 pr-3 text-sm font-normal text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
            Wyjazdy od
            <input
              type="date"
              value={range.from}
              onChange={(e) => {
                if (shiftDate(e.target.value, 0))
                  onRangeChange(rangeFrom(e.target.value, days));
              }}
              className="min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-teal-600"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-slate-600">
            Okres
            <select
              value={days}
              onChange={(e) =>
                onRangeChange(rangeFrom(range.from, Number(e.target.value)))
              }
              className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-teal-600"
            >
              {[1, 3, 7, 14, 30].map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 dzień" : `${n} dni`}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div
            className="flex flex-wrap gap-1"
            role="group"
            aria-label="Kwalifikacja sprzątania"
          >
            {(
              [
                { id: "ready", label: "Do planowania", count: totalReady },
                {
                  id: "review",
                  label: "Do sprawdzenia",
                  count: data?.counts.reviews,
                },
                {
                  id: "excluded",
                  label: "Wycofane",
                  count: data?.counts.excluded,
                },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={`min-h-10 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-teal-800 text-white" : "text-slate-600 hover:bg-slate-100"}`}
              >
                {t.label}{" "}
                <span
                  className={`ml-1 rounded px-1.5 py-0.5 text-xs ${tab === t.id ? "bg-white/20" : "bg-slate-100"}`}
                >
                  {t.count ?? "—"}
                </span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {tab !== "excluded" && (
              <label className="flex items-center gap-1.5">
                <Filter
                  className="h-3.5 w-3.5 text-slate-500"
                  aria-hidden="true"
                />
                <span className="sr-only">Status rezerwacji</span>
                <select
                  value={certainty}
                  onChange={(e) => setCertainty(e.target.value)}
                  className="min-h-10 max-w-44 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700"
                >
                  <option value="all">Wszystkie statusy</option>
                  <option value="accepted">Przyjęte</option>
                  <option value="provisional">Oczekujące</option>
                  <option value="unknown">Do wyjaśnienia</option>
                </select>
              </label>
            )}
            <div
              className="flex rounded-lg border border-slate-200 p-1"
              role="group"
              aria-label="Sposób wyświetlania"
            >
              <button
                onClick={() => setView("list")}
                aria-label="Widok listy"
                aria-pressed={view === "list"}
                className={`flex items-center gap-2 rounded p-2 text-xs font-semibold ${view === "list" ? "bg-slate-100 text-teal-800" : "text-slate-500"}`}
              >
                <List className="h-4 w-4" />
                Lista
              </button>
              <button
                onClick={() => setView("calendar")}
                aria-label="Widok kalendarza"
                aria-pressed={view === "calendar"}
                className={`flex items-center gap-2 rounded p-2 text-xs font-semibold ${view === "calendar" ? "bg-slate-100 text-teal-800" : "text-slate-500"}`}
              >
                <CalendarDays className="h-4 w-4" />
                Kalendarz
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/70 px-4 py-3 text-xs text-slate-500 sm:px-5">
          <span>
            {dayLabel(range.from)} – {dayLabel(shiftDate(range.to, -1)!)} ·{" "}
            {data ? positionCount(visibleCount) : "wynik niedostępny"}
          </span>
          <span aria-live="polite">
            {data
              ? `Ostatni odczyt: ${readAtLabel(data.fetchedAt)}`
              : "Oczekiwanie na odczyt rezerwacji"}
          </span>
        </div>

        <div className="p-4 sm:p-5">
          {(Boolean(error) || stale) && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
            >
              <AlertCircle
                className="mt-0.5 h-5 w-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">
                  {error ?? "Dane wymagają odświeżenia."}
                </p>
                {data && (
                  <p className="mt-1 text-xs leading-5">
                    Wyświetlasz poprzedni odczyt. Pobierz aktualne rezerwacje
                    przed dalszym planowaniem.
                  </p>
                )}
              </div>
            </div>
          )}
          {view === "list" && data?.overview && (
            <ReservationList
              overview={data.overview}
              candidates={[...data.candidates, ...data.reviews]}
              search={search}
              certainty={certainty}
              excluded={tab === "excluded"}
            />
          )}
          {loading && !data ? (
            <div role="status" className="space-y-3">
              <span className="sr-only">Pobieranie rezerwacji</span>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : !data ? (
            <EmptyState
              title={
                error
                  ? "Nie można teraz wyświetlić sprzątań"
                  : "Oczekiwanie na dane"
              }
              description="Użyj przycisku odświeżania, aby pobrać kompletną listę rezerwacji."
            />
          ) : view === "calendar" && data.overview ? (
            <CleaningCalendar
              overview={data.overview}
              candidates={items}
              range={range}
              search={search}
              certainty={certainty}
              tab={tab}
              onRangeChange={onRangeChange}
            />
          ) : view === "calendar" ? (
            <EmptyState
              title="Kalendarz wymaga pełnego odczytu"
              description="Odśwież rezerwacje, aby pobrać pobyty i aktywny katalog lokali."
            />
          ) : visibleCount === 0 ? (
            <EmptyState
              title={
                filtersActive
                  ? "Brak pasujących pozycji"
                  : tab === "review"
                    ? "Wszystko sprawdzone"
                    : tab === "excluded"
                      ? "Brak wycofanych rezerwacji"
                      : data.counts.reviews > 0
                        ? "Sprzątania wymagają sprawdzenia"
                        : "Brak sprzątań w tym zakresie"
              }
              description={
                filtersActive
                  ? "Zmień wyszukiwanie lub filtr statusu."
                  : tab === "review"
                    ? "Nie ma pozycji wymagających wyjaśnienia w wybranym okresie."
                    : tab === "ready" && data.counts.reviews > 0
                      ? "Rezerwacje są na liście do sprawdzenia. Zobacz powody, które wymagają decyzji koordynatora."
                      : "Wybierz inny dzień lub dłuższy okres, aby sprawdzić kolejne wyjazdy."
              }
              action={
                tab === "ready" && !filtersActive && data.counts.reviews > 0 ? (
                  <button
                    onClick={() => setTab("review")}
                    className="mt-4 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
                  >
                    Przejdź do sprawdzenia
                  </button>
                ) : undefined
              }
            />
          ) : tab === "excluded" ? (
            <ul className="space-y-3">
              {excluded.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div>
                    <p className="font-semibold text-slate-700">
                      Rezerwacja #{c.reservationId}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Jednostka #{c.unitId} · status źródłowy: {c.sourceStatus}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                    Nieaktywna
                  </span>
                  <p className="w-full text-xs leading-5 text-slate-500">
                    Nie tworzy nowej prognozy sprzątania. Anulowanie po
                    faktycznym pobycie wymaga osobnego sprawdzenia.
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              {items.map((c) => (
                <CandidateCard key={c.id} candidate={c} />
              ))}
            </div>
          )}
        </div>
      </section>
      <p className="flex items-start gap-2 px-1 text-xs leading-5 text-slate-500">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-teal-700"
          aria-hidden="true"
        />
        Lista pokazuje sprzątania możliwe do zaplanowania. Nie przypisuje
        pracowników ani konkretnych godzin. Rezerwacje oczekujące mogą się
        zmienić; wejście do lokalu wymaga potwierdzenia.
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value?: number;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        {label}
        {icon}
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-900">
        {value ?? "—"}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="py-12 text-center">
      <CalendarDays
        className="mx-auto mb-3 h-9 w-9 text-slate-300"
        aria-hidden="true"
      />
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>
      {action}
    </div>
  );
}

function CandidateCard({ candidate: c }: { candidate: Candidate }) {
  return (
    <article
      aria-label={`${c.unit.label}, rezerwacja ${c.afterReservation.id}`}
      className={`min-w-0 overflow-hidden rounded-xl border bg-white ${c.eligibleForPlanning ? "border-slate-200" : "border-amber-200"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${c.certainty === "accepted" ? "bg-teal-50 text-teal-800" : c.certainty === "provisional" ? "bg-amber-50 text-amber-800" : "bg-orange-50 text-orange-800"}`}
            >
              {c.certainty === "accepted"
                ? "Przyjęta"
                : c.certainty === "provisional"
                  ? "Oczekująca · wstępne"
                  : "Do wyjaśnienia"}
            </span>
            <span className="text-xs text-slate-500">
              {dayLabel(c.serviceDate, true)}
            </span>
          </div>
          <h3 className="break-words text-base font-bold text-slate-900">
            {c.unit.label}{" "}
            {c.unit.code &&
              c.unit.code.trim().toLocaleLowerCase("pl") !==
                c.unit.label.trim().toLocaleLowerCase("pl") && (
                <span className="ml-1 inline-block max-w-full break-all rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {c.unit.code}
                </span>
              )}
          </h3>
          <p className="mt-1 flex items-start gap-1.5 break-words text-xs leading-5 text-slate-500">
            <MapPin
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            {c.unit.locationStatus === "ambiguous"
              ? "Niejednoznaczna lokalizacja — potwierdź adres przed wejściem"
              : (c.unit.address ?? "Adres wymaga potwierdzenia przed wejściem")}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <div className="text-xs font-medium text-slate-500">
            {c.eligibleForPlanning ? "Dostępne okno" : "Okno do weryfikacji"}
          </div>
          {c.windows.length ? (
            c.windows.map((w) => (
              <div
                key={w.start}
                className="mt-1 whitespace-nowrap text-lg font-bold tabular-nums text-teal-900"
              >
                {timeLabel(w.start)}–{timeLabel(w.end)}
              </div>
            ))
          ) : (
            <div className="mt-1 text-sm font-semibold text-amber-800">
              Brak pełnego okna
            </div>
          )}
          <div className="mt-1 text-xs text-slate-500">
            Sprzątanie:{" "}
            <strong className="font-semibold text-slate-700">
              {c.duration.estimatedMinutes} min
            </strong>
          </div>
        </div>
      </div>
      {c.reviewReasons.length > 0 && (
        <ul className="mx-4 mb-3 space-y-1 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          {c.reviewReasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2">
              <AlertCircle
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {reasonLabels[reason]}
            </li>
          ))}
        </ul>
      )}
      <details className="group border-t border-slate-100">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          Szczegóły rezerwacji{" "}
          <span className="ml-1 font-normal text-slate-400">
            #{c.afterReservation.id}
          </span>
        </summary>
        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 p-4 text-xs sm:grid-cols-2">
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700">
              <ArrowUpRight className="h-3.5 w-3.5" />
              Wyjazd · #{c.afterReservation.id}
            </p>
            <p className="text-slate-500">
              {dayLabel(c.afterReservation.checkoutLocal.slice(0, 10))},{" "}
              {localTimeLabel(c.afterReservation.checkoutLocal)}
            </p>
            <p className="mt-1 break-all text-slate-500">
              Status źródłowy: {c.afterReservation.sourceStatus}
            </p>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 font-semibold text-slate-700">
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Następny przyjazd
              {c.beforeReservation ? ` · #${c.beforeReservation.id}` : ""}
            </p>
            <p className="text-slate-500">
              {c.beforeReservation
                ? `${dayLabel(c.beforeReservation.checkinLocal.slice(0, 10))}, ${localTimeLabel(c.beforeReservation.checkinLocal)}`
                : "Brak w sprawdzonym zakresie"}
            </p>
            {c.beforeReservation && (
              <p className="mt-1 break-all text-slate-500">
                Status źródłowy: {c.beforeReservation.sourceStatus}
              </p>
            )}
          </div>
          <div className="text-slate-500 sm:col-span-2">
            Jednostka iDoBooking #{c.unit.unitId} ·{" "}
            {c.unit.mapping === "source-id"
              ? "katalog iDoBooking"
              : c.unit.mapping === "id"
                ? "potwierdzone ID"
                : "powiązanie wymaga sprawdzenia"}{" "}
            · stan znany do {dayLabel(c.nextArrivalKnownThrough.slice(0, 10))}
          </div>
        </div>
      </details>
    </article>
  );
}
