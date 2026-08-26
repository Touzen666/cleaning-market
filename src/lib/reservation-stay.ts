const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function roundPln2(value: number): number {
    return Math.round(value * 100) / 100;
}

function utcDayMs(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Liczba nocy pobytu [start, end). Checkout w dniu X nie jest nocą w tym dniu. */
export function countStayNights(start: Date, end: Date): number {
    const nights = Math.round((utcDayMs(end) - utcDayMs(start)) / MS_PER_DAY);
    return Math.max(0, nights);
}

/**
 * Noce pobytu nachodzące na okres [periodStart, periodEnd].
 * Rezerwacja na styku miesięcy (np. 29.06–01.07) idzie do obu miesięcy,
 * a przychód jest dzielony proporcjonalnie do nocy.
 */
export function countOverlapNights(
    stayStart: Date,
    stayEnd: Date,
    periodStart: Date,
    periodEnd: Date,
): number {
    if (stayStart.getTime() >= periodEnd.getTime() || stayEnd.getTime() < periodStart.getTime()) {
        return 0;
    }

    const overlapStartMs = Math.max(stayStart.getTime(), periodStart.getTime());
    const overlapEndMs = Math.min(stayEnd.getTime(), periodEnd.getTime());
    const nights =
        overlapEndMs <= overlapStartMs
            ? 0
            : countStayNights(new Date(overlapStartMs), new Date(overlapEndMs));

    return Math.max(1, nights);
}

export function amountForNightsInPeriod(
    totalAmount: number,
    totalNights: number,
    nightsInPeriod: number,
): number {
    if (!(totalAmount > 0) || totalNights <= 0 || nightsInPeriod <= 0) return 0;
    if (nightsInPeriod >= totalNights) return roundPln2(totalAmount);
    return roundPln2((totalAmount / totalNights) * nightsInPeriod);
}

export function buildStaySplitNote(
    totalAmount: number,
    totalNights: number,
    nightsInThisMonth: number,
): string {
    const pricePerNight = roundPln2(totalAmount / Math.max(1, totalNights));
    const otherNights = Math.max(0, totalNights - nightsInThisMonth);
    return `Kwota bazowa ${roundPln2(totalAmount).toFixed(2)} / ${totalNights} nocy = ${pricePerNight.toFixed(2)} za noc. W tym raporcie: ${nightsInThisMonth} nocy; pozostałe ${otherNights} nocy rozliczane w sąsiednim miesiącu.`;
}
