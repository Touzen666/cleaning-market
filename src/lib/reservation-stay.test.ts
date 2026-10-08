import { describe, expect, it } from "vitest";
import {
    amountForNightsInPeriod,
    checkoutFallsInPeriod,
    countOverlapNights,
    countStayNights,
    keptReservationRevenue,
    revenueStayFallsInPeriod,
} from "./reservation-stay";

describe("checkoutFallsInPeriod", () => {
    it("ujmuje rezerwację w miesiącu wymeldowania", () => {
        const juneStart = new Date(Date.UTC(2026, 5, 1));
        const julyStart = new Date(Date.UTC(2026, 6, 1));
        const augustStart = new Date(Date.UTC(2026, 7, 1));

        expect(
            checkoutFallsInPeriod(new Date("2026-07-01T12:00:00.000Z"), juneStart, julyStart),
        ).toBe(false);
        expect(
            checkoutFallsInPeriod(new Date("2026-07-01T12:00:00.000Z"), julyStart, augustStart),
        ).toBe(true);
        expect(
            checkoutFallsInPeriod(new Date("2026-08-01T12:00:00.000Z"), julyStart, augustStart),
        ).toBe(false);
    });
});

describe("revenueStayFallsInPeriod", () => {
    const septemberStart = new Date(Date.UTC(2026, 8, 1));
    const octoberStart = new Date(Date.UTC(2026, 9, 1));
    const novemberStart = new Date(Date.UTC(2026, 10, 1));

    it("zostawia pobyt 29.09–01.10 w całości we wrześniu", () => {
        const checkout = new Date("2026-10-01T10:00:00.000Z");
        expect(revenueStayFallsInPeriod(checkout, septemberStart, octoberStart)).toBe(true);
        expect(revenueStayFallsInPeriod(checkout, octoberStart, novemberStart)).toBe(false);
    });

    it("zostawia wymeldowanie 3.09 we wrześniu", () => {
        expect(
            revenueStayFallsInPeriod(
                new Date("2026-09-03T10:00:00.000Z"),
                septemberStart,
                octoberStart,
            ),
        ).toBe(true);
    });
});

describe("keptReservationRevenue", () => {
    it("bierze pełną cenę zakończonej rezerwacji", () => {
        expect(
            keptReservationRevenue({ status: "Zakończona", price: 522, balance: 0 }),
        ).toBe(522);
    });

    it("zeruje anulację, gdy saldo jest zwrotem całej przedpłaty", () => {
        expect(
            keptReservationRevenue({ status: "Anulowana", price: 441.7, balance: -441.7 }),
        ).toBe(0);
    });

    it("zostawia cenę anulacji bez zwrotu", () => {
        expect(
            keptReservationRevenue({ status: "Anulowana", price: 400, balance: 0 }),
        ).toBe(400);
    });
});

describe("countStayNights", () => {
    it("liczy noce bez dnia wymeldowania", () => {
        expect(
            countStayNights(new Date("2026-06-29T00:00:00.000Z"), new Date("2026-07-01T00:00:00.000Z")),
        ).toBe(2);
    });
});

describe("countOverlapNights", () => {
    it("dzieli pobyt 29.06–01.07 między czerwiec i lipiec", () => {
        const juneStart = new Date(Date.UTC(2026, 5, 1));
        const julyStart = new Date(Date.UTC(2026, 6, 1));
        const augustStart = new Date(Date.UTC(2026, 7, 1));
        const stayStart = new Date("2026-06-29T00:00:00.000Z");
        const stayEnd = new Date("2026-07-01T00:00:00.000Z");

        expect(countOverlapNights(stayStart, stayEnd, juneStart, julyStart)).toBe(2);
        expect(countOverlapNights(stayStart, stayEnd, julyStart, augustStart)).toBe(1);
    });
});

describe("amountForNightsInPeriod", () => {
    it("nie zaniża kwoty, gdy cały pobyt mieści się w miesiącu", () => {
        expect(amountForNightsInPeriod(653.48, 3, 3)).toBe(653.48);
        expect(amountForNightsInPeriod(529.31, 3, 3)).toBe(529.31);
    });

    it("dzieli kwotę proporcjonalnie do nocy w miesiącu", () => {
        expect(amountForNightsInPeriod(269.12, 2, 1)).toBe(134.56);
        expect(amountForNightsInPeriod(269.12, 2, 2)).toBe(269.12);
    });
});
