import { describe, expect, it } from "vitest";
import {
    AIRBNB_COMMISSION_PERCENT,
    buildOtaCommissionNotes,
    calculateOtaCommissionAmount,
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
