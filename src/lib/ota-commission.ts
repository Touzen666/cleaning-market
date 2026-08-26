import { getRecognizedReservationChannel, resolveReportChannel } from "@/lib/reservation-channel";
import { roundPln2 } from "@/lib/reservation-stay";

export const AIRBNB_COMMISSION_PERCENT = 15.5;
export const AIRBNB_COMMISSION_VAT_RATE = 0.23;
export const BOOKING_COMMISSION_PERCENT = 12;
export const BOOKING_TRANSACTION_FEE_RATE = 0.016;

export function formatPercentLabel(value: number): string {
    return value.toString().replace(".", ",");
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

export function calculateOtaCommissionAmount(
    totalRevenue: number,
    percentage: number,
    channel: string,
): number {
    const commission = (totalRevenue * percentage) / 100;

    if (isAirbnbCommissionChannel(channel)) {
        return roundPln2(commission * (1 + AIRBNB_COMMISSION_VAT_RATE));
    }

    if (isBookingCommissionChannel(channel)) {
        return roundPln2(commission + totalRevenue * BOOKING_TRANSACTION_FEE_RATE);
    }

    return roundPln2(commission);
}

export function buildOtaCommissionNotes(
    channel: string,
    totalRevenue: number,
    percentage: number,
    amount: number,
): string {
    const percentLabel = formatPercentLabel(percentage);

    if (isAirbnbCommissionChannel(channel)) {
        const commissionNet = roundPln2((totalRevenue * percentage) / 100);
        const vat = roundPln2(commissionNet * AIRBNB_COMMISSION_VAT_RATE);
        return `Prowizja Airbnb (netto): ${commissionNet.toFixed(2)} PLN (${percentLabel}%) + VAT (23%): ${vat.toFixed(2)} PLN.`;
    }

    if (isBookingCommissionChannel(channel)) {
        const commissionGross = amount;
        const commissionNet = roundPln2(commissionGross / 1.08);
        const vat = roundPln2(commissionGross - commissionNet);
        const standardCommissionValue = roundPln2((totalRevenue * percentage) / 100);
        const transactionFeeValue = roundPln2(totalRevenue * BOOKING_TRANSACTION_FEE_RATE);
        return `Prowizja Booking (brutto): ${commissionGross.toFixed(2)} PLN. Składowe: Prowizja (${percentLabel}%): ${standardCommissionValue.toFixed(2)} PLN + Opłata transakcyjna (1.6%): ${transactionFeeValue.toFixed(2)} PLN. W kwocie brutto zawarty jest VAT (8%): ${vat.toFixed(2)} PLN. Kwota netto: ${commissionNet.toFixed(2)} PLN.`;
    }

    return `Sugerowana pozycja prowizji dla kanału ${channel} - ${percentLabel}% od ${totalRevenue.toFixed(2)} PLN`;
}

function utcDayMs(date: Date): number {
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Wymeldowanie w okresie [periodStart, periodEnd) — tak Booking ujmuje rezerwację w wykazie wypłaty. */
export function checkoutFallsInPeriod(
    checkout: Date,
    periodStart: Date,
    periodEnd: Date,
): boolean {
    const day = utcDayMs(checkout);
    return day >= utcDayMs(periodStart) && day < utcDayMs(periodEnd);
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
 * Nie używamy podziału proporcjonalnego z pozycji przychodu — ten nie zgadza się z FV/wypłatą.
 */
export function sumOtaCommissionBaseByChannel(
    items: OtaCommissionRevenueItem[],
    periodStart: Date,
    periodEnd: Date,
): Map<string, number> {
    const channels = new Map<string, number>();
    const seenReservations = new Set<number>();

    for (const item of items) {
        const channel = resolveReportChannel(item.category, item.reservation?.source);
        if (!channel) continue;

        const reservation = item.reservation;
        if (!reservation) {
            channels.set(channel, roundPln2((channels.get(channel) ?? 0) + item.amount));
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

        const fullAmount = reservation.rateCorrection ?? reservation.paymantValue ?? item.amount;
        channels.set(channel, roundPln2((channels.get(channel) ?? 0) + fullAmount));
    }

    return channels;
}
