import { TerminationCostSide, TerminationOwnerPaymentKind } from "@prisma/client";

export type TerminationCostLike = {
    side: TerminationCostSide;
    amount: number | null | undefined;
    countsTowardOwnerTaxBase: boolean;
};

/**
 * Koszty rozwiązania umowy:
 * - HOST_COMPANY (ZW): zwiększa wypłatę właściciela, zmniejsza stronę hosta.
 * - OWNER_SIDE: zmniejsza wypłatę właściciela, zwiększa stronę hosta.
 * Checkbox „wchodzi w podstawę opodatkowania” modyfikuje wyłącznie taxBaseAdj (± jak przy wypłacie).
 */
export function summarizeTerminationCosts(costs: TerminationCostLike[]) {
    let zwTotal = 0;
    let ownerSideTotal = 0;
    let taxBaseAdj = 0;

    for (const c of costs) {
        const amt = Math.max(0, Number(c.amount) || 0);
        if (c.side === TerminationCostSide.HOST_COMPANY) {
            zwTotal += amt;
            if (c.countsTowardOwnerTaxBase) {
                taxBaseAdj += amt;
            }
        } else {
            ownerSideTotal += amt;
            if (c.countsTowardOwnerTaxBase) {
                taxBaseAdj -= amt;
            }
        }
    }

    const payoutAdj = zwTotal - ownerSideTotal;
    return { zwTotal, ownerSideTotal, payoutAdj, taxBaseAdj };
}

export function terminationOwnerPaymentKindLabel(
    kind: TerminationOwnerPaymentKind | null | undefined,
): string {
    if (kind === TerminationOwnerPaymentKind.REFUND) {
        return "Zwrot na rzecz Złote Wynajmy";
    }
    if (kind === TerminationOwnerPaymentKind.REVENUE) {
        return "Przychód na rzecz Złote Wynajmy";
    }
    return "—";
}

/** Krótka podpowiedź dla właściciela / admina (nie jest poradą prawną). */
export function terminationOwnerPaymentKindTaxNote(
    kind: TerminationOwnerPaymentKind | null | undefined,
): string {
    if (kind === TerminationOwnerPaymentKind.REFUND) {
        return "Zwrot: zwykle poza podstawą opodatkowania — ustaw checkbox poniżej, jeśli ma wejść w podstawę.";
    }
    if (kind === TerminationOwnerPaymentKind.REVENUE) {
        return "Przychód: często wymaga uwzględnienia przy 8,5% — potwierdź checkboxem „podstawa opodatkowania”.";
    }
    return "";
}
