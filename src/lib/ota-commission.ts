import { getRecognizedReservationChannel, resolveReportChannel } from "@/lib/reservation-channel";
import { checkoutFallsInPeriod, roundPln2 } from "@/lib/reservation-stay";

export const AIRBNB_COMMISSION_PERCENT = 15.5;
export const AIRBNB_COMMISSION_VAT_RATE = 0.23;
export const BOOKING_COMMISSION_PERCENT = 12;
/** Booking.com: opłata za usługę płatniczą ≈ 1,4% brutto (nie 1,6%). */
export const BOOKING_TRANSACTION_FEE_RATE = 0.014;

export function formatPercentLabel(value: number): string {
    return Number(value.toFixed(4)).toString().replace(".", ",");
}

function roundPlnToFiveGrosze(value: number): number {
    return Math.round(value * 20) / 20;
}

export function isAirbnbCommissionChannel(channel: string | null | undefined): boolean {
    return getRecognizedReservationChannel(channel) === "Airbnb";
}

export function isBookingCommissionChannel(channel: string | null | undefined): boolean {
    const recognized = getRecognizedReservationChannel(channel);
    if (recognized === "Booking") return true;
    const lower = (channel ?? "").trim().toLowerCase();
    return lower.startsWith("booking") && !lower.includes("idobooking");
}

export function getDefaultOtaCommissionPercent(channel: string): number | null {
    if (isAirbnbCommissionChannel(channel)) return AIRBNB_COMMISSION_PERCENT;
    if (isBookingCommissionChannel(channel)) return BOOKING_COMMISSION_PERCENT;
    return null;
}

export function resolveOtaCommissionPercent(channel: string, rawPercent: number): number {
    if (isAirbnbCommissionChannel(channel) && (!Number.isFinite(rawPercent) || rawPercent <= 0 || rawPercent === 15)) {
        return AIRBNB_COMMISSION_PERCENT;
    }
    if (isBookingCommissionChannel(channel) && (!Number.isFinite(rawPercent) || rawPercent <= 0)) {
        return BOOKING_COMMISSION_PERCENT;
    }
    return rawPercent;
}

export function calculateBookingCommissionParts(
    lineGrossAmounts: number[],
    commissionPercent: number = BOOKING_COMMISSION_PERCENT,
    feeRate: number = BOOKING_TRANSACTION_FEE_RATE,
): { commission: number; fee: number; total: number } {
    let commission = 0;
    let fee = 0;
    for (const gross of lineGrossAmounts) {
        commission += roundPln2((gross * commissionPercent) / 100);
        fee += roundPln2(gross * feeRate);
    }
    return {
        commission: roundPln2(commission),
        fee: roundPln2(fee),
        total: roundPln2(commission + fee),
    };
}

export function calculateAirbnbCommissionParts(
    lineGrossAmounts: number[],
    percentage: number = AIRBNB_COMMISSION_PERCENT,
): {
    commissionNet: number;
    vat: number;
    commission: number;
    payout: number;
    lines: Array<{ gross: number; commissionNet: number; vat: number; commission: number; payout: number }>;
} {
    const lines = lineGrossAmounts.map((gross) => {
        const commissionNet = roundPln2((gross * percentage) / 100);
        const vat = roundPln2(commissionNet * AIRBNB_COMMISSION_VAT_RATE);
        const rawCommission = roundPln2(commissionNet + vat);
        const rawPayout = roundPln2(gross - rawCommission);
        // Wypłaty Airbnb na fakturach są do 5 groszy (np. 995,82 → 995,80).
        const payout = roundPlnToFiveGrosze(rawPayout);
        const commission = roundPln2(gross - payout);
        return { gross, commissionNet, vat, commission, payout };
    });

    return {
        commissionNet: roundPln2(lines.reduce((sum, line) => sum + line.commissionNet, 0)),
        vat: roundPln2(lines.reduce((sum, line) => sum + line.vat, 0)),
        commission: roundPln2(lines.reduce((sum, line) => sum + line.commission, 0)),
        payout: roundPln2(lines.reduce((sum, line) => sum + line.payout, 0)),
        lines,
    };
}

export function calculateOtaCommissionAmount(
    totalRevenue: number,
    percentage: number,
    channel: string,
    lineGrossAmounts?: number[],
): number {
    if (isAirbnbCommissionChannel(channel)) {
        const amounts = lineGrossAmounts && lineGrossAmounts.length > 0 ? lineGrossAmounts : [totalRevenue];
        return calculateAirbnbCommissionParts(amounts, percentage).commission;
    }

    if (isBookingCommissionChannel(channel)) {
        if (lineGrossAmounts && lineGrossAmounts.length > 0) {
            return calculateBookingCommissionParts(lineGrossAmounts, percentage).total;
        }
        const parts = calculateBookingCommissionParts([totalRevenue], percentage);
        return parts.total;
    }

    return roundPln2((totalRevenue * percentage) / 100);
}

export function calculateAirbnbPayoutNet(
    gross: number,
    percentage: number = AIRBNB_COMMISSION_PERCENT,
): number {
    return calculateAirbnbCommissionParts([gross], percentage).payout;
}

export function buildOtaCommissionNotes(
    channel: string,
    totalRevenue: number,
    percentage: number,
    amount: number,
    lineGrossAmounts?: number[],
): string {
    const percentLabel = formatPercentLabel(percentage);

    if (isAirbnbCommissionChannel(channel)) {
        const amounts = lineGrossAmounts && lineGrossAmounts.length > 0 ? lineGrossAmounts : [totalRevenue];
        const parts = calculateAirbnbCommissionParts(amounts, percentage);
        const payouts = parts.lines.map((line) => line.payout.toFixed(2)).join(" + ");
        return `Prowizja Airbnb (netto): ${parts.commissionNet.toFixed(2)} PLN (${percentLabel}%) + VAT (23%): ${parts.vat.toFixed(2)} PLN. Wypłaty na konto: ${payouts} = ${parts.payout.toFixed(2)} PLN.`;
    }

    if (isBookingCommissionChannel(channel)) {
        const parts =
            lineGrossAmounts && lineGrossAmounts.length > 0
                ? calculateBookingCommissionParts(lineGrossAmounts, percentage)
                : calculateBookingCommissionParts([totalRevenue], percentage);
        const feePercentLabel = formatPercentLabel(BOOKING_TRANSACTION_FEE_RATE * 100);
        return `Prowizja Booking: ${parts.commission.toFixed(2)} PLN (${percentLabel}%) + opłata za usługę płatniczą: ${parts.fee.toFixed(2)} PLN (${feePercentLabel}%). Razem: ${parts.total.toFixed(2)} PLN.`;
    }

    return `Sugerowana pozycja prowizji dla kanału ${channel} - ${percentLabel}% od ${totalRevenue.toFixed(2)} PLN`;
}

export function summarizeOtaAccountInflow(
    items: Array<{ type: string; category: string; amount: number }>,
): {
    bookingGross: number;
    bookingCommission: number;
    bookingNet: number;
    airbnbGross: number;
    airbnbCommission: number;
    airbnbNet: number;
    totalNet: number;
} {
    let bookingGross = 0;
    let airbnbGross = 0;
    let bookingCommission = 0;
    let airbnbCommission = 0;

    for (const item of items) {
        if (item.type === "REVENUE") {
            if (isBookingCommissionChannel(item.category)) bookingGross += item.amount;
            else if (isAirbnbCommissionChannel(item.category)) airbnbGross += item.amount;
        } else if (item.type === "COMMISSION") {
            if (isBookingCommissionChannel(item.category)) bookingCommission += item.amount;
            else if (isAirbnbCommissionChannel(item.category)) airbnbCommission += item.amount;
        }
    }

    const bookingNet = roundPln2(bookingGross - bookingCommission);
    const airbnbNet = roundPln2(airbnbGross - airbnbCommission);
    return {
        bookingGross: roundPln2(bookingGross),
        bookingCommission: roundPln2(bookingCommission),
        bookingNet,
        airbnbGross: roundPln2(airbnbGross),
        airbnbCommission: roundPln2(airbnbCommission),
        airbnbNet,
        totalNet: roundPln2(bookingNet + airbnbNet),
    };
}

export type OtaCommissionRevenueItem = {
    reservationId?: number | null;
    category: string;
    amount: number;
    reservation?: {
        source?: string | null;
        end: Date;
        paymantValue?: number | null;
        rateCorrection?: number | null;
    } | null;
};

/**
 * Podstawa prowizji OTA: pełna kwota rezerwacji z wymeldowaniem w miesiącu raportu.
 * Booking zaokrągla prowizję i opłatę per rezerwacja, potem je sumuje (jak na wykazie wypłaty).
 */
export function collectOtaCommissionBaseByChannel(
    items: OtaCommissionRevenueItem[],
    periodStart: Date,
    periodEnd: Date,
): Map<string, { totalRevenue: number; lineGrossAmounts: number[] }> {
    const channels = new Map<string, { totalRevenue: number; lineGrossAmounts: number[] }>();
    const seenReservations = new Set<number>();

    const add = (channel: string, gross: number) => {
        const current = channels.get(channel) ?? { totalRevenue: 0, lineGrossAmounts: [] };
        current.lineGrossAmounts.push(gross);
        current.totalRevenue = roundPln2(current.totalRevenue + gross);
        channels.set(channel, current);
    };

    for (const item of items) {
        const channel = resolveReportChannel(item.category, item.reservation?.source);
        if (!channel) continue;

        const reservation = item.reservation;
        if (!reservation) {
            add(channel, item.amount);
            continue;
        }

        if (!checkoutFallsInPeriod(new Date(reservation.end), periodStart, periodEnd)) {
            continue;
        }

        const reservationKey = item.reservationId;
        if (typeof reservationKey === "number") {
            if (seenReservations.has(reservationKey)) continue;
            seenReservations.add(reservationKey);
        }

        add(channel, reservation.rateCorrection ?? reservation.paymantValue ?? item.amount);
    }

    return channels;
}

export function sumOtaCommissionBaseByChannel(
    items: OtaCommissionRevenueItem[],
    periodStart: Date,
    periodEnd: Date,
): Map<string, number> {
    const collected = collectOtaCommissionBaseByChannel(items, periodStart, periodEnd);
    return new Map(
        [...collected.entries()].map(([channel, value]) => [channel, value.totalRevenue]),
    );
}
