/** Liczba dni w miesiącu kalendarzowym (month: 1 = styczeń). */
export function daysInCalendarMonth(year: number, month1To12: number): number {
    return new Date(year, month1To12, 0).getDate();
}

/**
 * Współczynnik proporcjonalnej wypłaty przy kwocie stałej (np. umowa tylko przez część miesiąca).
 * Pełny miesiąc lub wyłączone → 1.
 */
export function getFixedPayoutProrateFactor(
    year: number,
    month1To12: number,
    enabled: boolean | null | undefined,
    activeDays: number | null | undefined,
): number {
    if (!enabled) return 1;
    if (activeDays == null || !Number.isFinite(activeDays)) return 1;
    const dim = daysInCalendarMonth(year, month1To12);
    if (dim <= 0) return 1;
    const a = Math.round(Number(activeDays));
    if (a < 1) return 1;
    if (a >= dim) return 1;
    return a / dim;
}
