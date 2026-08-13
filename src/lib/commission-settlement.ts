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

/** Prowizja ZW i baza netto wypłaty właściciela (przed VAT) dla rozliczenia prowizyjnego. */
export function getCommissionPayoutNet(params: {
    netIncome: number;
    rentAmount: number;
    utilitiesAmount: number;
    additionalDeductionsGross: number;
    commissionRate: number;
    /** true = najpierw czynsz i media, potem % prowizji od pozostałości */
    deductCostsBeforeCommission: boolean;
}): { hostPayout: number; ownerNetBase: number; commissionBase: number } {
    const rentAndUtilities = params.rentAmount + params.utilitiesAmount;

    if (params.deductCostsBeforeCommission) {
        const commissionBase = params.netIncome - rentAndUtilities;
        const hostPayout = commissionBase * params.commissionRate;
        const ownerNetBase =
            commissionBase - hostPayout - params.additionalDeductionsGross;
        return { hostPayout, ownerNetBase, commissionBase };
    }

    const hostPayout = params.netIncome * params.commissionRate;
    const ownerNetBase =
        params.netIncome -
        hostPayout -
        rentAndUtilities -
        params.additionalDeductionsGross;
    return { hostPayout, ownerNetBase, commissionBase: params.netIncome };
}
