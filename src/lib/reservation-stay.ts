const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function roundPln2(value: number): number {
    return Math.round(value * 100) / 100;
}

function utcDayMs(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Wymeldowanie w okresie [periodStart, periodEnd) — tak OTA ujmują rezerwację na FV/wypłacie. */
export function checkoutFallsInPeriod(
    checkout: Date,
    periodStart: Date,
    periodEnd: Date,
): boolean {
    const day = utcDayMs(checkout);
    return day >= utcDayMs(periodStart) && day < utcDayMs(periodEnd);
}

const REPORT_TIME_ZONE = "Europe/Warsaw";

/** Dzień kalendarzowy w Europe/Warsaw, jako północ UTC tego dnia. */
export function warsawDayMs(date: Date): number {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: REPORT_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    return Date.UTC(year, month - 1, day);
}

/** Ostatnia noc pobytu: dzień przed wymeldowaniem w Europe/Warsaw. */
export function lastNightDayMs(checkout: Date): number {
    return warsawDayMs(checkout) - MS_PER_DAY;
}

/**
 * Rezerwacja wchodzi do miesiąca, w którym jest jej ostatnia noc.
 * Używane przy sprzątaniu (jedno sprzątanie przy wyjeździe).
 */
export function revenueStayFallsInPeriod(
    checkout: Date,
    periodStart: Date,
    periodEnd: Date,
): boolean {
    const night = lastNightDayMs(checkout);
    return night >= warsawDayMs(periodStart) && night < warsawDayMs(periodEnd);
}

/** Szerokie okno `end` do pobrania kandydatów pod sprzątanie. */
export function revenueCheckoutQueryWindow(
    periodStart: Date,
    periodEnd: Date,
): { gte: Date; lt: Date } {
    return {
        gte: new Date(periodStart.getTime() - MS_PER_DAY),
        lt: new Date(periodEnd.getTime() + 2 * MS_PER_DAY),
    };
}

/** Pobyt nachodzi na miesiąc, także gdy wymeldowanie jest już w następnym. */
export function revenueStayQueryWindow(
    periodStart: Date,
    periodEnd: Date,
): { start: { lt: Date }; end: { gt: Date } } {
    return {
        start: { lt: new Date(periodEnd.getTime() + MS_PER_DAY) },
        end: { gt: new Date(periodStart.getTime() - MS_PER_DAY) },
    };
}

/** Liczba nocy pobytu w kalendarzu Europe/Warsaw. Dzień wymeldowania nie jest nocą. */
export function warsawStayNights(stayStart: Date, stayEnd: Date): number {
    const first = warsawDayMs(stayStart);
    const last = lastNightDayMs(stayEnd);
    if (last < first) return 0;
    return Math.round((last - first) / MS_PER_DAY) + 1;
}

/** Noce pobytu, które kalendarzowo przypadają na [periodStart, periodEnd). */
export function warsawNightsInPeriod(
    stayStart: Date,
    stayEnd: Date,
    periodStart: Date,
    periodEnd: Date,
): number {
    const first = warsawDayMs(stayStart);
    const last = lastNightDayMs(stayEnd);
    if (last < first) return 0;

    const periodFrom = warsawDayMs(periodStart);
    const periodTo = warsawDayMs(periodEnd);
    const overlapFirst = Math.max(first, periodFrom);
    const overlapLast = Math.min(last, periodTo - MS_PER_DAY);
    if (overlapLast < overlapFirst) return 0;
    return Math.round((overlapLast - overlapFirst) / MS_PER_DAY) + 1;
}

export function normalizeReservationStatus(status: string | null | undefined): string {
    return (status ?? "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function isCancelledReservationStatus(status: string | null | undefined): boolean {
    const normalized = normalizeReservationStatus(status);
    return normalized.includes("anul") || normalized.includes("cancel");
}

/**
 * Kwota, którą obiekt naprawdę zatrzymuje.
 * Ujemne saldo IdoBooking przy anulacji to zwrot przedpłaty (cena + saldo = 0).
 * Saldo 0 przy anulacji oznacza, że wpłata została zatrzymana.
 */
export function keptReservationRevenue(input: {
    status: string | null | undefined;
    price: number;
    balance?: number | null;
}): number {
    const price = roundPln2(Number.isFinite(input.price) ? Math.max(0, input.price) : 0);
    if (!isCancelledReservationStatus(input.status)) return price;

    const balance = input.balance;
    if (balance == null || !Number.isFinite(balance)) return 0;
    if (balance < 0) return roundPln2(Math.max(0, price + balance));
    return price;
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
