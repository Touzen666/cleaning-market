import { describe, expect, it } from "vitest";
import {
    AIRBNB_COMMISSION_PERCENT,
    BOOKING_TRANSACTION_FEE_RATE,
    buildOtaCommissionNotes,
    calculateAirbnbCommissionParts,
    calculateAirbnbPayoutNet,
    calculateBookingCommissionParts,
    calculateOtaCommissionAmount,
    collectOtaCommissionBaseByChannel,
    formatPercentLabel,
    getDefaultOtaCommissionPercent,
    isAirbnbCommissionChannel,
    resolveOtaCommissionPercent,
    sumOtaCommissionBaseByChannel,
} from "./ota-commission";

describe("Airbnb OTA commission", () => {
    it("domyślnie proponuje 15,5%", () => {
        expect(getDefaultOtaCommissionPercent("Airbnb")).toBe(15.5);
        expect(getDefaultOtaCommissionPercent("Idobooking (ID: 14)")).toBe(15.5);
        expect(AIRBNB_COMMISSION_PERCENT).toBe(15.5);
        expect(formatPercentLabel(15.5)).toBe("15,5");
    });

    it("zastępuje stare 15% stawką 15,5%", () => {
        expect(resolveOtaCommissionPercent("Airbnb", 15)).toBe(15.5);
        expect(resolveOtaCommissionPercent("Airbnb", 0)).toBe(15.5);
        expect(resolveOtaCommissionPercent("Airbnb", 16)).toBe(16);
    });

    it("liczy 15,5% + 23% VAT i zapisuje 15,5% w notatce", () => {
        expect(calculateOtaCommissionAmount(1000, 15.5, "Airbnb")).toBe(190.65);
        expect(buildOtaCommissionNotes("Airbnb", 1000, 15.5, 190.65)).toContain("(15,5%)");
        expect(buildOtaCommissionNotes("Airbnb", 1000, 15.5, 190.65)).not.toContain("(15%)");
    });

    it("liczy wypłatę Airbnb po prowizji 15,5% + VAT jak na fakturze", () => {
        expect(calculateAirbnbPayoutNet(231)).toBe(186.95);
        expect(calculateAirbnbPayoutNet(440.72)).toBe(356.7);
        expect(calculateAirbnbPayoutNet(1230.39)).toBe(995.8);
        const parts = calculateAirbnbCommissionParts([231, 440.72, 1230.39]);
        expect(parts.payout).toBe(1539.45);
        expect(parts.commission).toBe(362.66);
        expect(parts.payout + parts.commission).toBeCloseTo(1902.11, 2);
        expect(3592.48 - 481.38 + parts.payout).toBe(4650.55);
    });

    it("rozpoznaje kanał Airbnb niezależnie od zapisu IdoBooking", () => {
        expect(isAirbnbCommissionChannel("Airbnb")).toBe(true);
        expect(isAirbnbCommissionChannel("Idobooking (ID: 14)")).toBe(true);
        expect(isAirbnbCommissionChannel("Booking")).toBe(false);
        expect(isAirbnbCommissionChannel("Idobooking (ID: 8)")).toBe(false);
    });
});

describe("sumOtaCommissionBaseByChannel", () => {
    it("liczy Booking według wymeldowania i pełnej kwoty z FV, nie podziału nocy", () => {
        const julyStart = new Date(Date.UTC(2026, 6, 1));
        const augustStart = new Date(Date.UTC(2026, 7, 1));
        const channels = sumOtaCommissionBaseByChannel(
            [
                {
                    reservationId: 1,
                    category: "Booking",
                    amount: 134.56,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-07-01T12:00:00.000Z"),
                        paymantValue: 269.12,
                    },
                },
                {
                    reservationId: 18,
                    category: "Booking",
                    amount: 196.04,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-08-01T12:00:00.000Z"),
                        paymantValue: 196.04,
                    },
                },
                {
                    reservationId: 5,
                    category: "Booking",
                    amount: 653.46,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-07-07T12:00:00.000Z"),
                        paymantValue: 653.48,
                    },
                },
                {
                    reservationId: 12,
                    category: "Booking",
                    amount: 529.29,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-07-17T12:00:00.000Z"),
                        paymantValue: 529.31,
                    },
                },
                {
                    reservationId: 16,
                    category: "Booking",
                    amount: 407.66,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-07-29T12:00:00.000Z"),
                        paymantValue: 407.66,
                    },
                },
                {
                    reservationId: 15,
                    category: "Airbnb",
                    amount: 1230.39,
                    reservation: {
                        source: "Airbnb",
                        end: new Date("2026-07-26T12:00:00.000Z"),
                        paymantValue: 1230.39,
                    },
                },
            ],
            julyStart,
            augustStart,
        );

        expect(channels.get("Booking")).toBe(1859.57);
        expect(channels.get("Airbnb")).toBe(1230.39);
        expect(channels.has("Booking")).toBe(true);
    });
});

describe("Booking OTA commission", () => {
    it("używa 1,4% opłaty za usługę płatniczą", () => {
        expect(BOOKING_TRANSACTION_FEE_RATE).toBe(0.014);
        expect(formatPercentLabel(BOOKING_TRANSACTION_FEE_RATE * 100)).toBe("1,4");
    });

    it("zaokrągla 12% i 1,4% per rezerwacja jak na wykazie wypłaty", () => {
        expect(calculateBookingCommissionParts([407.66])).toEqual({
            commission: 48.92,
            fee: 5.71,
            total: 54.63,
        });
        expect(calculateBookingCommissionParts([653.48])).toEqual({
            commission: 78.42,
            fee: 9.15,
            total: 87.57,
        });
        expect(calculateBookingCommissionParts([269.12])).toEqual({
            commission: 32.29,
            fee: 3.77,
            total: 36.06,
        });
    });

    it("nie liczy procentu od sumy — 12% + 1,4% od 3592,48 zł daje 481,39, wykaz ma 481,38", () => {
        const ofTotal = calculateBookingCommissionParts([3592.48]);
        expect(ofTotal).toEqual({
            commission: 431.1,
            fee: 50.29,
            total: 481.39,
        });
        expect(ofTotal.total).not.toBe(481.38);
        expect(
            calculateOtaCommissionAmount(3592.48, 12, "Booking", [3592.48]),
        ).not.toBe(481.38);
    });

    it("zapisuje w notatce 12% i 1,4% bez VAT 8%", () => {
        const notes = buildOtaCommissionNotes(
            "Booking",
            407.66,
            12,
            54.63,
            [407.66],
        );
        expect(notes).toContain("48.92 PLN (12%)");
        expect(notes).toContain("5.71 PLN (1,4%)");
        expect(notes).toContain("54.63 PLN");
        expect(notes).not.toContain("1.6");
        expect(notes).not.toContain("1,6");
        expect(notes).not.toContain("VAT (8%)");
    });

    it("zbiera pełne kwoty brutto per rezerwacja z wymeldowaniem w miesiącu", () => {
        const julyStart = new Date(Date.UTC(2026, 6, 1));
        const augustStart = new Date(Date.UTC(2026, 7, 1));
        const collected = collectOtaCommissionBaseByChannel(
            [
                {
                    reservationId: 1,
                    category: "Booking",
                    amount: 134.56,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-07-01T12:00:00.000Z"),
                        paymantValue: 269.12,
                    },
                },
                {
                    reservationId: 18,
                    category: "Booking",
                    amount: 196.04,
                    reservation: {
                        source: "Booking",
                        end: new Date("2026-08-01T12:00:00.000Z"),
                        paymantValue: 196.04,
                    },
                },
            ],
            julyStart,
            augustStart,
        );

        expect(collected.get("Booking")).toEqual({
            totalRevenue: 269.12,
            lineGrossAmounts: [269.12],
        });
    });
});
