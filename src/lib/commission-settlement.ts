export const PAYMENT_TYPE_VALUES = [
    "COMMISSION",
    "COMMISSION_MINUS_UTILITIES",
    "FIXED_AMOUNT",
    "FIXED_AMOUNT_MINUS_UTILITIES",
    "OWN_APARTMENT",
] as const;

export const SETTLEMENT_TYPE_VALUES = [
    "COMMISSION",
    "COMMISSION_MINUS_UTILITIES",
    "FIXED",
    "FIXED_MINUS_UTILITIES",
] as const;

export type PaymentTypeName = (typeof PAYMENT_TYPE_VALUES)[number];
export type SettlementTypeName = (typeof SETTLEMENT_TYPE_VALUES)[number];

export function mapPaymentTypeToSettlementType(
    paymentType: string | null | undefined,
): SettlementTypeName {
    switch (paymentType) {
        case "FIXED_AMOUNT":
            return "FIXED";
        case "FIXED_AMOUNT_MINUS_UTILITIES":
            return "FIXED_MINUS_UTILITIES";
        case "COMMISSION_MINUS_UTILITIES":
            return "COMMISSION_MINUS_UTILITIES";
        case "COMMISSION":
        case "OWN_APARTMENT":
        default:
            return "COMMISSION";
    }
}

export function isCommissionSettlementType(
    settlementType: string | null | undefined,
): boolean {
    return (
        settlementType === "COMMISSION" ||
        settlementType === "COMMISSION_MINUS_UTILITIES"
    );
}

/**
 * Prowizja ZW i baza netto wypłaty właściciela (przed VAT).
 *
 * COMMISSION: ZW = % od pełnego zysku; wypłata = zysk − ZW − czynsz − media − dodatkowe
 * COMMISSION_MINUS_UTILITIES: ZW = % od (zysk − czynsz − media);
 *   wypłata = (zysk − czynsz − media) − ZW − dodatkowe
 *   (czynsz/media nie są odejmowane drugi raz)
 */
export function getCommissionPayoutNet(params: {
    netIncome: number;
    rentAmount: number;
    utilitiesAmount: number;
    additionalDeductionsGross: number;
    commissionRate: number;
    /** true = najpierw czynsz i media, potem % prowizji od pozostałości */
    deductCostsBeforeCommission: boolean;
}): {
    hostPayout: number;
    ownerNetBase: number;
    commissionBase: number;
    /** Kwota pozostała po prowizji ZW (przed dodatkowymi odliczeniami; przy MINUS_UTILITIES też przed/już bez czynszu i mediów w bazie) */
    afterHostCommission: number;
    rentAndUtilities: number;
} {
    const rentAndUtilities = params.rentAmount + params.utilitiesAmount;

    if (params.deductCostsBeforeCommission) {
        const commissionBase = params.netIncome - rentAndUtilities;
        const hostPayout = commissionBase * params.commissionRate;
        const afterHostCommission = commissionBase - hostPayout;
        const ownerNetBase = afterHostCommission - params.additionalDeductionsGross;
        return {
            hostPayout,
            ownerNetBase,
            commissionBase,
            afterHostCommission,
            rentAndUtilities,
        };
    }

    const commissionBase = params.netIncome;
    const hostPayout = commissionBase * params.commissionRate;
    const afterHostCommission = commissionBase - hostPayout;
    const ownerNetBase =
        afterHostCommission - rentAndUtilities - params.additionalDeductionsGross;
    return {
        hostPayout,
        ownerNetBase,
        commissionBase,
        afterHostCommission,
        rentAndUtilities,
    };
}
