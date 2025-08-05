import { describe, it, expect, vi, beforeEach } from "vitest";
import { recalculateReportSettlement } from "../server/api/routers/monthly-reports";

// Mock kontekstu i bazy
const mockCtx = {
    db: {
        monthlyReport: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
        apartmentOwner: {
            findUnique: vi.fn(),
        },
        $queryRaw: vi.fn(),
    },
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe("recalculateReportSettlement - rozliczenia miesięczne", () => {
    it("poprawnie liczy rozliczenie prowizyjne bez VAT", async () => {
        mockCtx.db.monthlyReport.findUnique.mockResolvedValue({
            id: "test-id",
            finalSettlementType: "COMMISSION",
            rentAmount: 0,
            utilitiesAmount: 0,
            ownerId: "owner-1",
        });
        mockCtx.db.apartmentOwner.findUnique.mockResolvedValue({
            fixedPaymentAmount: null,
            vatOption: "NO_VAT",
        });
        mockCtx.db.$queryRaw
            .mockResolvedValueOnce([
                { type: "REVENUE", total: 10000 },
                { type: "EXPENSE", total: 2000 },
                { type: "COMMISSION", total: 1000 },
            ])
            .mockResolvedValueOnce([]); // brak dodatkowych odliczeń

        // @ts-expect-error - Mock context for testing
        const result = await recalculateReportSettlement("test-id", mockCtx);

        // netIncome = 10000 - 2000 - 1000 = 7000
        // adminCommissionAmount = 7000 * 0.25 = 1750
        // afterCommission = 7000 - 1750 = 5250
        // finalOwnerPayout = 5250 (brak VAT)
        // finalHostPayout = 1750
        expect(result.finalOwnerPayout).toBeCloseTo(5250, 2);
        expect(result.finalHostPayout).toBeCloseTo(1750, 2);
    });

    it("poprawnie liczy rozliczenie stałe z VAT 8%", async () => {
        mockCtx.db.monthlyReport.findUnique.mockResolvedValue({
            id: "test-id",
            finalSettlementType: "FIXED",
            rentAmount: 0,
            utilitiesAmount: 0,
            ownerId: "owner-1",
        });
        mockCtx.db.apartmentOwner.findUnique.mockResolvedValue({
            fixedPaymentAmount: 1000,
            vatOption: "VAT_8",
        });
        mockCtx.db.$queryRaw
            .mockResolvedValueOnce([
                { type: "REVENUE", total: 5000 },
                { type: "EXPENSE", total: 1000 },
                { type: "COMMISSION", total: 500 },
            ])
            .mockResolvedValueOnce([]);

        // @ts-expect-error - Mock context for testing
        const result = await recalculateReportSettlement("test-id", mockCtx);

        // finalOwnerPayout = 1000 * 1.08 = 1080
        // netIncome = 5000 - 1000 - 500 = 3500
        // finalHostPayout = 3500 - 1000 = 2500
        expect(result.finalOwnerPayout).toBeCloseTo(1080, 2);
        expect(result.finalHostPayout).toBeCloseTo(2500, 2);
    });

    it("poprawnie liczy rozliczenie stałe minus media z VAT 23%", async () => {
        mockCtx.db.monthlyReport.findUnique.mockResolvedValue({
            id: "test-id",
            finalSettlementType: "FIXED_MINUS_UTILITIES",
            rentAmount: 200,
            utilitiesAmount: 100,
            ownerId: "owner-1",
        });
        mockCtx.db.apartmentOwner.findUnique.mockResolvedValue({
            fixedPaymentAmount: 1000,
            vatOption: "VAT_23",
        });
        mockCtx.db.$queryRaw
            .mockResolvedValueOnce([
                { type: "REVENUE", total: 5000 },
                { type: "EXPENSE", total: 1000 },
                { type: "COMMISSION", total: 500 },
            ])
            .mockResolvedValueOnce([]);

        // @ts-expect-error - Mock context for testing
        const result = await recalculateReportSettlement("test-id", mockCtx);

        // netBaseAfterUtilities = 1000 - 200 - 100 = 700
        // finalOwnerPayout = 700 * 1.23 = 861
        // netIncome = 5000 - 1000 - 500 = 3500
        // finalHostPayout = 3500 - 1000 = 2500
        expect(result.finalOwnerPayout).toBeCloseTo(861, 2);
        expect(result.finalHostPayout).toBeCloseTo(2500, 2);
    });

    it("nie pozwala na ujemną wypłatę właściciela", async () => {
        mockCtx.db.monthlyReport.findUnique.mockResolvedValue({
            id: "test-id",
            finalSettlementType: "FIXED",
            rentAmount: 0,
            utilitiesAmount: 0,
            ownerId: "owner-1",
        });
        mockCtx.db.apartmentOwner.findUnique.mockResolvedValue({
            fixedPaymentAmount: 10000,
            vatOption: "NO_VAT",
        });
        mockCtx.db.$queryRaw
            .mockResolvedValueOnce([
                { type: "REVENUE", total: 5000 },
                { type: "EXPENSE", total: 1000 },
                { type: "COMMISSION", total: 500 },
            ])
            .mockResolvedValueOnce([]);

        // @ts-expect-error - Mock context for testing
        const result = await recalculateReportSettlement("test-id", mockCtx);

        // netIncome = 5000 - 1000 - 500 = 3500
        // finalOwnerPayout = max(0, 10000) = 10000
        // finalHostPayout = max(0, 3500 - 10000) = 0
        expect(result.finalOwnerPayout).toBeCloseTo(10000, 2);
        expect(result.finalHostPayout).toBeCloseTo(0, 2);
    });
});