import type { RouterOutputs } from "@/trpc/react";

export type CandidatesResponse = RouterOutputs["cleaning"]["listCandidates"];
export type Candidate = CandidatesResponse["candidates"][number];
export type DateRange = { from: string; to: string };
export type PlanningResponse = RouterOutputs["cleaning"]["listOverview"];
export type CleaningOverview = PlanningResponse["overview"];
export type CalendarUnit = CleaningOverview["units"][number];
export type CalendarReservation = CleaningOverview["reservations"][number];
export type CalendarLock = CleaningOverview["locks"][number];

export function todayInWarsaw(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function shiftDate(date: string, days: number) {
  const value = new Date(date + "T12:00:00Z");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(value.getTime()) ||
    value.toISOString().slice(0, 10) !== date
  )
    return null;
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function rangeFrom(from: string, days = 7): DateRange {
  if (!Number.isInteger(days) || days < 1 || days > 31)
    throw new Error("Invalid cleaning date range");
  const to = shiftDate(from, days);
  if (!to) throw new Error("Invalid cleaning date range");
  return { from, to };
}

export function dayLabel(date: string, weekday = false) {
  return new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    ...(weekday ? { weekday: "long" } : {}),
  }).format(new Date(date + "T12:00:00Z"));
}

export const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
export const readAtLabel = (iso: string) =>
  new Intl.DateTimeFormat("pl-PL", {
    timeZone: "Europe/Warsaw",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
export const localTimeLabel = (local: string) => local.slice(11, 16);

export function positionCount(count: number) {
  const forms = {
    one: "pozycja",
    few: "pozycje",
    many: "pozycji",
    other: "pozycji",
    zero: "pozycji",
    two: "pozycje",
  };
  return `${count} ${forms[new Intl.PluralRules("pl").select(count)]}`;
}

export const reasonLabels: Record<Candidate["reviewReasons"][number], string> =
  {
    UNKNOWN_STATUS: "Status rezerwacji wymaga wyjaśnienia",
    UNVERIFIED_UNIT_MAPPING: "Niepotwierdzone przypisanie lokalu",
    PROPERTY_DISABLED: "Lokal wycofany lub niedostępny w tym dniu",
    RELOCATION_REVIEW: "Przeniesienie rezerwacji wymaga sprawdzenia",
    OUTSIDE_WORK_HOURS: "Wyjazd lub przyjazd poza oknem 10:00–15:00",
    INSUFFICIENT_WINDOW: "Brakuje pełnych 60 minut na sprzątanie",
    OCCUPANCY_OVERLAP: "Nakładające się pobyty w tym samym lokalu",
    AVAILABILITY_LOCK: "Blokada dostępności obejmuje czas sprzątania",
  };

export function matchesSearch(candidate: Candidate, query: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replaceAll("ł", "l")
      .replaceAll("Ł", "L")
      .toLocaleLowerCase("pl");
  return normalize(
    [
      candidate.unit.label,
      candidate.unit.code,
      candidate.unit.address,
      candidate.unit.unitId,
      candidate.afterReservation.id,
    ].join(" "),
  ).includes(normalize(query.trim()));
}

export function planningError(code?: string) {
  switch (code) {
    case "UNAUTHORIZED":
      return "Sesja wygasła. Zaloguj się ponownie do panelu cleaning.";
    case "FORBIDDEN":
      return "Twoje konto nie ma dostępu do planowania sprzątań.";
    case "BAD_REQUEST":
      return "Wybierz poprawny zakres od 1 do 31 dni.";
    case "SERVICE_UNAVAILABLE":
      return "Dane rezerwacji są zbyt stare. Odśwież je przed dalszym planowaniem.";
    case "NOT_FOUND":
      return "Nie znaleziono wybranego lokalu w iDoBooking.";
    default:
      return "Nie udało się pobrać pełnych danych z iDoBooking. Spróbuj ponownie za chwilę.";
  }
}

export function clientErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("data" in error)) return;
  const data = error.data;
  if (
    data &&
    typeof data === "object" &&
    "code" in data &&
    typeof data.code === "string"
  )
    return data.code;
}
