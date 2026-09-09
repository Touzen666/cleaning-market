import { describe, expect, it } from "vitest";
import { getFixedHostPayout } from "./commission-settlement";

describe("getFixedHostPayout", () => {
    it("przy kwocie stałej odejmuje czynsz i media, bo ZW je pokrywa", () => {
        expect(
            getFixedHostPayout({
                netIncome: 6376.18,
                fixedAmount: 2700,
                rentAmount: 620,
                utilitiesAmount: 150,
                managerCoversRentAndUtilities: true,
            }),
        ).toBeCloseTo(2906.18, 2);
    });

    it("przy kwocie stałej po odliczeniu mediów nie odejmuje czynszu i mediów od prowizji ZW", () => {
        expect(
            getFixedHostPayout({
                netIncome: 6376.18,
                fixedAmount: 2700,
                rentAmount: 620,
                utilitiesAmount: 150,
                managerCoversRentAndUtilities: false,
            }),
        ).toBeCloseTo(3676.18, 2);
    });
});
