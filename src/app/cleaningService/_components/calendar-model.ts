import {
  shiftDate,
  type CalendarReservation,
  type DateRange,
} from "./view-model";

export const CALENDAR_DAY_WIDTH = 184;
const dayMilliseconds = 86400000;
const localInstant = (value: string) =>
  Date.parse(
    value.slice(0, 16) + (value.length === 10 ? "T00:00" : "") + ":00Z",
  );

export function calendarDays(range: DateRange) {
  const count = Math.round(
    (Date.parse(range.to) - Date.parse(range.from)) / dayMilliseconds,
  );
  return Array.from(
    { length: Math.max(0, Math.min(31, count)) },
    (_, index) => shiftDate(range.from, index)!,
  );
}

/** Positions use wall-clock calendar hours; the source dates are local Warsaw values. */
export function calendarGeometry(from: string, to: string, range: DateRange) {
  const start = localInstant(range.from),
    end = localInstant(range.to);
  const left = Math.max(start, localInstant(from));
  const right = Math.min(end, localInstant(to));
  if (right <= left || end <= start) return null;
  return {
    left: ((left - start) / (end - start)) * 100,
    width: ((right - left) / (end - start)) * 100,
  };
}

/** Overlapping stays occupy distinct lanes so a collision is visible rather than painted over. */
export function reservationLanes(reservations: CalendarReservation[]) {
  const ends: string[] = [];
  return [...reservations]
    .sort((a, b) => a.from.localeCompare(b.from) || a.id - b.id)
    .map((reservation) => {
      let lane = ends.findIndex((end) => end <= reservation.from);
      if (lane === -1) lane = ends.length;
      ends[lane] = reservation.to;
      return { reservation, lane };
    });
}
