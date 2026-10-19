export function asCleaningCostMap(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const costs: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const amount = Number(raw);
    if (Number.isFinite(amount)) costs[key] = amount;
  }
  return costs;
}

export function cleaningCostMapHasPositiveRate(value: unknown): boolean {
  return Object.values(asCleaningCostMap(value)).some((amount) => amount > 0);
}

/** Stawka dla liczby gości. Brak dokładnego progu schodzi do najbliższego niższego. */
export function cleaningCostForGuestCount(value: unknown, guests: number): number {
  if (guests <= 0) return 0;
  const costs = asCleaningCostMap(value);
  for (let count = guests; count >= 1; count--) {
    const rate = costs[String(count)];
    if (rate !== undefined) return rate;
  }
  return 0;
}

/**
 * Raport budynku często nie ma własnego cennika sprzątania.
 * Wtedy bierzemy stawki lokalu, do którego należy rezerwacja.
 */
export function cleaningCostForReservation(input: {
  adults?: number | null;
  children?: number | null;
  reportCleaningCosts?: unknown;
  stayCleaningCosts?: unknown;
}): number {
  const guests = (input.adults ?? 0) + (input.children ?? 0);
  const source = cleaningCostMapHasPositiveRate(input.reportCleaningCosts)
    ? input.reportCleaningCosts
    : input.stayCleaningCosts;
  return cleaningCostForGuestCount(source, guests);
}
