import { describe, expect, it } from "vitest";
import {
    amountForNightsInPeriod,
    countOverlapNights,
    countStayNights,
} from "./reservation-stay";

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
