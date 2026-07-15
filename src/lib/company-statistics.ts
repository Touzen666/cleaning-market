import { getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";
import { getGrossAmount } from "@/lib/vat";
import type { VATOption } from "@prisma/client";

export type HostPayoutReportInput = {
    customSummaryEnabled?: boolean | null;
    customHostPayout?: number | null;
    finalSettlementType?: string | null;
    netIncome?: number | null;
    adminCommissionAmount?: number | null;
    finalHostPayout?: number | null;
    year: number;
    month: number;
    fixedPayoutProrateEnabled?: boolean | null;
    fixedPayoutActiveDays?: number | null;
    apartment: {
        paymentType: string;
        fixedPaymentAmount?: unknown;
    };
};

/** 5% dodatkowych odliczeń uznajemy jako zysk ZW. */
export const ADDITIONAL_DEDUCTION_PROFIT_RATE = 0.05;

export type AdditionalDeductionInput = {
    amount: number;
    vatOption: VATOption | string;
};

export function sumAdditionalDeductionsGross(
    deductions: AdditionalDeductionInput[] | null | undefined,
): number {
    if (!deductions?.length) return 0;
    return deductions.reduce(
        (sum, d) => sum + getGrossAmount(d.amount, d.vatOption as VATOption),
        0,
    );
}

export function getAdditionalDeductionsProfit(
    deductionsGross: number,
): number {
    return roundPln(deductionsGross * ADDITIONAL_DEDUCTION_PROFIT_RATE);
}

/** Wkład do bilansu firmy z raportu: prowizja ZW + 5% dodatkowych odliczeń. */
export function getReportBalanceContribution(
    report: HostPayoutReportInput,
    deductions: AdditionalDeductionInput[] | null | undefined,
): {
    hostPayout: number;
    additionalDeductionsTotal: number;
    additionalDeductionsProfit: number;
    commission: number;
} {
    const hostPayout = roundPln(getHostPayoutFromSummary(report));
    const additionalDeductionsTotal = roundPln(
        sumAdditionalDeductionsGross(deductions),
    );
    const additionalDeductionsProfit = getAdditionalDeductionsProfit(
        additionalDeductionsTotal,
    );
    return {
        hostPayout,
        additionalDeductionsTotal,
        additionalDeductionsProfit,
        commission: roundPln(hostPayout + additionalDeductionsProfit),
    };
}

function getAdminCommissionRate(paymentType: string): number {
    return paymentType === "OWN_APARTMENT" ? 0 : 0.25;
}

/** Prowizja Złote Wynajmy — ta sama logika co podsumowanie w edytorze raportu. */
export function getHostPayoutFromSummary(report: HostPayoutReportInput): number {
    if (report.customSummaryEnabled) {
        return Number(report.customHostPayout ?? 0);
    }

    if (report.apartment.paymentType === "OWN_APARTMENT") {
        return 0;
    }

    const netIncome = report.netIncome ?? 0;
    const settlementType = report.finalSettlementType;
    const prorateF = getFixedPayoutProrateFactor(
        report.year,
        report.month,
        report.fixedPayoutProrateEnabled,
        report.fixedPayoutActiveDays,
    );
    const fixedBaseAmount =
        report.apartment.fixedPaymentAmount != null
            ? Number(report.apartment.fixedPaymentAmount)
            : 0;
    const adminCommission =
        report.adminCommissionAmount ??
        netIncome * getAdminCommissionRate(report.apartment.paymentType);

    if (settlementType === "FIXED" || settlementType === "FIXED_MINUS_UTILITIES") {
        return netIncome - fixedBaseAmount * prorateF;
    }

    if (settlementType === "COMMISSION") {
        return adminCommission;
    }

    return Number(report.finalHostPayout ?? 0);
}

export function monthKey(year: number, month: number): string {
    return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonthLabel(year: number, month: number): string {
    return `${String(month).padStart(2, "0")}/${year}`;
}

export function isMonthInRange(
    year: number,
    month: number,
    startYear: number,
    startMonth: number,
    endYear: number,
    endMonth: number,
): boolean {
    const value = year * 12 + month;
    const start = startYear * 12 + startMonth;
    const end = endYear * 12 + endMonth;
    return value >= start && value <= end;
}

/** Zaokrąglenie do groszy — unika błędów float (np. -127.979999 → -127.98). */
export function roundPln(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

export function formatPlnAmount(amount: number): string {
    const formatted = new Intl.NumberFormat("pl-PL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(roundPln(amount));
    return `${formatted} PLN`;
}

export type MonthlyCommissionEntry = {
    year: number;
    month: number;
    label: string;
    /** Wkład do bilansu = prowizja ZW + 5% dodatkowych odliczeń. */
    commission: number;
    hostPayout: number;
    additionalDeductionsTotal: number;
    additionalDeductionsProfit: number;
    reportCount: number;
};

export function createEmptyMonthlyEntry(
    year: number,
    month: number,
): MonthlyCommissionEntry {
    return {
        year,
        month,
        label: formatMonthLabel(year, month),
        commission: 0,
        hostPayout: 0,
        additionalDeductionsTotal: 0,
        additionalDeductionsProfit: 0,
        reportCount: 0,
    };
}

export function addContributionToMonthlyEntry(
    entry: MonthlyCommissionEntry,
    contribution: {
        hostPayout: number;
        additionalDeductionsTotal: number;
        additionalDeductionsProfit: number;
        commission: number;
    },
): void {
    entry.hostPayout += contribution.hostPayout;
    entry.additionalDeductionsTotal += contribution.additionalDeductionsTotal;
    entry.additionalDeductionsProfit += contribution.additionalDeductionsProfit;
    entry.commission += contribution.commission;
    entry.reportCount += 1;
}

export type MonthSettlementDetail = {
    year: number;
    month: number;
    label: string;
    commission: number;
    hostPayout: number;
    additionalDeductionsTotal: number;
    additionalDeductionsProfit: number;
    reports: Array<{
        id: string;
        isHistorical: boolean;
        settlementType: string | null;
        settlementLabel: string;
        rentAndUtilitiesDeducted: boolean;
        rentAmount: number;
        utilitiesAmount: number;
        rentAndUtilitiesTotal: number;
        additionalDeductionsTotal: number;
        additionalDeductionsProfit: number;
        netIncome: number;
        hostPayout: number;
        fixedPaymentAmount: number | null;
    }>;
    /** true = we wszystkich raportach miesiąca odjęto czynsz i media od kwoty stałej */
    rentAndUtilitiesDeducted: boolean | null;
    /** true = w miesiącu są mieszane typy rozliczenia */
    mixedSettlement: boolean;
};

export function getSettlementTypeLabel(settlementType: string | null | undefined): string {
    switch (settlementType) {
        case "FIXED":
            return "Kwota stała (bez odjęcia mediów)";
        case "FIXED_MINUS_UTILITIES":
            return "Kwota stała minus czynsz i media";
        case "COMMISSION":
            return "Prowizja %";
        default:
            return "Brak typu rozliczenia";
    }
}

export function doesSettlementDeductRentAndUtilities(
    settlementType: string | null | undefined,
): boolean {
    return settlementType === "FIXED_MINUS_UTILITIES";
}

export type CommissionBalanceResult = {
    monthlyEntries: MonthlyCommissionEntry[];
    positiveEntries: MonthlyCommissionEntry[];
    negativeEntries: MonthlyCommissionEntry[];
    positiveTotal: number;
    negativeTotal: number;
    balance: number;
    hostPayoutTotal: number;
    additionalDeductionsTotal: number;
    additionalDeductionsProfitTotal: number;
};

export function buildCommissionBalance(
    entries: MonthlyCommissionEntry[],
): CommissionBalanceResult {
    const sorted = [...entries]
        .map((entry) => ({
            ...entry,
            commission: roundPln(entry.commission),
            hostPayout: roundPln(entry.hostPayout),
            additionalDeductionsTotal: roundPln(entry.additionalDeductionsTotal),
            additionalDeductionsProfit: roundPln(entry.additionalDeductionsProfit),
        }))
        .sort((a, b) => {
            const av = a.year * 12 + a.month;
            const bv = b.year * 12 + b.month;
            return av - bv;
        });

    const positiveEntries = sorted.filter((entry) => entry.commission > 0);
    const negativeEntries = sorted.filter((entry) => entry.commission < 0);

    const positiveTotal = roundPln(
        positiveEntries.reduce((sum, entry) => sum + entry.commission, 0),
    );
    const negativeTotal = roundPln(
        negativeEntries.reduce((sum, entry) => sum + entry.commission, 0),
    );
    const hostPayoutTotal = roundPln(
        sorted.reduce((sum, entry) => sum + entry.hostPayout, 0),
    );
    const additionalDeductionsTotal = roundPln(
        sorted.reduce((sum, entry) => sum + entry.additionalDeductionsTotal, 0),
    );
    const additionalDeductionsProfitTotal = roundPln(
        sorted.reduce((sum, entry) => sum + entry.additionalDeductionsProfit, 0),
    );

    return {
        monthlyEntries: sorted,
        positiveEntries,
        negativeEntries,
        positiveTotal,
        negativeTotal,
        balance: roundPln(positiveTotal + negativeTotal),
        hostPayoutTotal,
        additionalDeductionsTotal,
        additionalDeductionsProfitTotal,
    };
}

const FIXED_SETTLEMENT_TYPES = new Set(["FIXED", "FIXED_MINUS_UTILITIES"]);
const FIXED_PAYMENT_TYPES = new Set([
    "FIXED_AMOUNT",
    "FIXED_AMOUNT_MINUS_UTILITIES",
]);

export function isFixedPaymentApartment(paymentType: string): boolean {
    return FIXED_PAYMENT_TYPES.has(paymentType);
}

export function isFixedSettlementType(settlementType: string | null | undefined): boolean {
    return settlementType != null && FIXED_SETTLEMENT_TYPES.has(settlementType);
}

/**
 * Obniżka kwoty stałej o Δ w miesiącu z proratą F zwiększa prowizję ZW o Δ×F.
 * Wyjście na 0: Δ = −bilans / suma(F).
 * Cel zysku miesięcznego: Δ = targetMonthly − bilans/suma(F)
 *   (= obniżka do zera + docelowy zysk / miesiąc).
 *
 * Gdy po odjęciu średniego czynszu+mediów netto właściciela < próg (1900),
 * apartament uznajemy za nieodpowiedni pod krótkoterminowy wynajem ze stałą kwotą.
 */
export const DEFAULT_OWNER_NET_AFTER_UTILITIES_THRESHOLD = 1900;
/** Propozycja czynszu długoterminowego = 60% ustalonej kwoty stałej. */
export const LONG_TERM_RENT_RATIO = 0.6;

export function calculateFixedAmountAdjustment(params: {
    balance: number;
    currentFixedAmount: number;
    /** Suma współczynników proraty dla miesięcy z rozliczeniem stałym. */
    fixedWeight: number;
    monthCount: number;
    /** Docelowy zysk ZW na miesiąc (nie na cały okres). */
    targetMonthlyProfit: number;
    /** Średnia (czynsz + media) z miesięcy w okresie — odejmowana od kwoty stałej właściciela. */
    averageRentAndUtilities?: number;
    /** Minimalna sensowna wypłata netto właściciela po mediach (domyślnie 1900). */
    ownerNetThreshold?: number;
}) {
    const {
        balance,
        currentFixedAmount,
        fixedWeight,
        monthCount,
        targetMonthlyProfit,
        averageRentAndUtilities = 0,
        ownerNetThreshold = DEFAULT_OWNER_NET_AFTER_UTILITIES_THRESHOLD,
    } = params;

    if (fixedWeight <= 0 || monthCount <= 0) {
        return null;
    }

    const averageMonthlyBalance = balance / fixedWeight;
    const reductionToBreakEven = roundPln(-averageMonthlyBalance);
    const reductionToTarget = roundPln(
        targetMonthlyProfit - averageMonthlyBalance,
    );
    const suggestedFixedToBreakEven = roundPln(
        currentFixedAmount - reductionToBreakEven,
    );
    const suggestedFixedToTarget = roundPln(
        currentFixedAmount - reductionToTarget,
    );
    const avgUtilities = roundPln(averageRentAndUtilities);
    const ownerNetAtBreakEven = roundPln(suggestedFixedToBreakEven - avgUtilities);
    const ownerNetAtTarget = roundPln(suggestedFixedToTarget - avgUtilities);
    const suggestedLongTermRent = roundPln(
        currentFixedAmount * LONG_TERM_RENT_RATIO,
    );

    const buildViability = (ownerNet: number, suggestedFixed: number) => {
        const belowThreshold = ownerNet < ownerNetThreshold;
        return {
            ownerNetAfterUtilities: ownerNet,
            belowOwnerNetThreshold: belowThreshold,
            warning: belowThreshold
                ? `Po korekcie kwota stała (${formatPlnAmount(suggestedFixed)}) minus średni czynsz i media (${formatPlnAmount(avgUtilities)}) daje właścicielowi ok. ${formatPlnAmount(ownerNet)} — poniżej progu ${formatPlnAmount(ownerNetThreshold)}. To mieszkanie nie nadaje się na krótkoterminowy wynajem ze stałą kwotą; rozważ wynajem długoterminowy.`
                : null,
        };
    };

    return {
        monthCount,
        fixedWeight: roundPln(fixedWeight),
        currentFixedAmount: roundPln(currentFixedAmount),
        targetMonthlyProfit: roundPln(targetMonthlyProfit),
        averageRentAndUtilities: avgUtilities,
        ownerNetThreshold: roundPln(ownerNetThreshold),
        suggestedLongTermRent,
        longTermRentRatio: LONG_TERM_RENT_RATIO,
        reductionToBreakEven,
        reductionToTarget,
        suggestedFixedToBreakEven,
        suggestedFixedToTarget,
        projectedMonthlyBalanceAtBreakEven: 0,
        projectedMonthlyBalanceAtTarget: roundPln(targetMonthlyProfit),
        viabilityAtBreakEven: buildViability(
            ownerNetAtBreakEven,
            suggestedFixedToBreakEven,
        ),
        viabilityAtTarget: buildViability(ownerNetAtTarget, suggestedFixedToTarget),
    };
}
