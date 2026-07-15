import { getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";

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
    commission: number;
    reportCount: number;
};

export type CommissionBalanceResult = {
    monthlyEntries: MonthlyCommissionEntry[];
    positiveEntries: MonthlyCommissionEntry[];
    negativeEntries: MonthlyCommissionEntry[];
    positiveTotal: number;
    negativeTotal: number;
    balance: number;
};

export function buildCommissionBalance(
    entries: MonthlyCommissionEntry[],
): CommissionBalanceResult {
    const sorted = [...entries]
        .map((entry) => ({
            ...entry,
            commission: roundPln(entry.commission),
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

    return {
        monthlyEntries: sorted,
        positiveEntries,
        negativeEntries,
        positiveTotal,
        negativeTotal,
        balance: roundPln(positiveTotal + negativeTotal),
    };
}
