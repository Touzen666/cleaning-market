const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type ReservationExclusionRange = {
  from: Date | null;
  to: Date | null;
};

export type ApartmentReservationExclusion = {
  reservationsDisabled?: boolean | null;
  reservationsDisabledFrom?: Date | string | null;
  reservationsDisabledTo?: Date | string | null;
};

function utcDayMs(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function exclusionRangeFromApartment(
  apartment: ApartmentReservationExclusion | null | undefined,
): ReservationExclusionRange {
  if (!apartment?.reservationsDisabled) {
    return { from: null, to: null };
  }
  return {
    from: toDate(apartment.reservationsDisabledFrom) ?? new Date(0),
    to: toDate(apartment.reservationsDisabledTo),
  };
}

export function isReservationExclusionActive(
  range: ReservationExclusionRange,
): boolean {
  return range.from != null;
}

/**
 * Pobyt [start, end) nachodzi na wykluczenie [from, to]
 * (`to` włącznie; brak `to` = bezterminowo).
 */
export function reservationOverlapsExclusion(
  stayStart: Date,
  stayEnd: Date,
  range: ReservationExclusionRange,
): boolean {
  if (!range.from) return false;

  const stayStartMs = utcDayMs(stayStart);
  const stayEndMs = utcDayMs(stayEnd);
  const exclusionStartMs = utcDayMs(range.from);
  const exclusionEndMs = range.to
    ? utcDayMs(range.to) + MS_PER_DAY
    : Number.POSITIVE_INFINITY;

  return stayStartMs < exclusionEndMs && stayEndMs > exclusionStartMs;
}

export function filterReservationsOutsideExclusion<
  T extends { start: Date; end: Date },
>(reservations: T[], range: ReservationExclusionRange): T[] {
  if (!isReservationExclusionActive(range)) return reservations;
  return reservations.filter(
    (reservation) =>
      !reservationOverlapsExclusion(reservation.start, reservation.end, range),
  );
}

export function filterReportItemsOutsideExclusion<
  T extends { reservation?: { start: Date; end: Date } | null },
>(items: T[], range: ReservationExclusionRange): T[] {
  if (!isReservationExclusionActive(range)) return items;
  return items.filter((item) => {
    if (!item.reservation) return true;
    return !reservationOverlapsExclusion(
      item.reservation.start,
      item.reservation.end,
      range,
    );
  });
}

function formatUtcDatePl(date: Date): string {
  return date.toLocaleDateString("pl-PL", { timeZone: "UTC" });
}

export function formatReservationExclusionNotice(
  range: ReservationExclusionRange,
): string | null {
  if (!isReservationExclusionActive(range) || !range.from) return null;

  const fromIsEpoch = range.from.getTime() <= 0;
  if (fromIsEpoch && !range.to) {
    return "Ten obiekt nie przyjmuje już rezerwacji.";
  }
  if (fromIsEpoch && range.to) {
    return `Ten obiekt nie przyjmuje już rezerwacji. Wykluczenie obowiązuje do ${formatUtcDatePl(range.to)}.`;
  }
  if (range.to) {
    return `Ten obiekt nie przyjmuje już rezerwacji. Wykluczenie obowiązuje od ${formatUtcDatePl(range.from)} do ${formatUtcDatePl(range.to)}.`;
  }
  return `Ten obiekt nie przyjmuje już rezerwacji od ${formatUtcDatePl(range.from)}.`;
}
