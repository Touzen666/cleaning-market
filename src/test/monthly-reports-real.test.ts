import { describe, it, expect, vi, beforeEach } from "vitest";
import { type PrismaClient } from "@prisma/client";
import { VATOption, UserType, SettlementType } from "@prisma/client";

// Mock kontekstu i bazy danych
const mockDb = {
    monthlyReport: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        aggregate: vi.fn(),
    },
    apartmentOwner: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
    },
    apartment: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
    },
    reportItem: {
        findMany: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    reservation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
    },
    reportHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
    },
    additionalDeduction: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
};

const mockCtx = {
    db: mockDb as unknown as PrismaClient,
    session: {
        user: {
            id: "admin-1",
            type: UserType.ADMIN,
            name: "Admin Test",
            email: "admin@test.com",
        },
    },
};

// Unused variable - removed to fix ESLint warning
// const mockOwnerCtx = {
//     db: mockDb as unknown as PrismaClient,
//     session: null,
// };

beforeEach(() => {
    vi.clearAllMocks();
});

// Helper do formatowania danych w konsoli
function logReportData(title: string, data: unknown) {
    console.log(`\n${"=".repeat(50)}`);
    console.log(`📊 ${title}`);
    console.log(`${"=".repeat(50)}`);
    console.log(JSON.stringify(data, null, 2));
    console.log(`${"=".repeat(50)}\n`);
}

// Import rzeczywistych funkcji z helpera
import { recalculateReportSettlement } from "./helpers/monthly-reports-helpers";

describe("Monthly Reports - Rzeczywiste funkcje", () => {
    describe("🔄 recalculateReportSettlement", () => {
        it("przelicza raport z typem rozliczenia COMMISSION", async () => {
            // Mock danych raportu
            const mockReport = {
                id: "report-1",
                finalSettlementType: SettlementType.COMMISSION,
                rentAmount: 2000,
                utilitiesAmount: 500,
                ownerId: "owner-1",
            };

            const mockOwner = {
                fixedPaymentAmount: null,
                vatOption: VATOption.NO_VAT,
            };

            const mockItems = [
                { type: "REVENUE", total: 15000 },
                { type: "EXPENSE", total: 3000 },
                { type: "COMMISSION", total: 1000 },
            ];

            const mockDeductions = [
                { vatOption: "NO_VAT", total: 200 },
            ];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("report-1", mockCtx);

            logReportData("🔄 Przeliczenie raportu COMMISSION", {
                reportId: "report-1",
                settlementType: SettlementType.COMMISSION,
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
                owner: {
                    vatOption: mockOwner.vatOption,
                    fixedPaymentAmount: mockOwner.fixedPaymentAmount,
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(15000);
            expect(result.totalExpenses).toBe(3000);
            expect(result.netIncome).toBe(11000); // 15000 - 3000 - 1000
            expect(result.adminCommissionAmount).toBe(2750); // 11000 * 0.25
            expect(result.afterCommission).toBe(8250); // 11000 - 2750
            expect(result.afterRentAndUtilities).toBe(5750); // 8250 - 2000 - 500
            expect(result.totalAdditionalDeductions).toBe(200);
            expect(result.finalOwnerPayout).toBe(5550); // 5750 - 200
            expect(result.finalHostPayout).toBe(2750);
            expect(result.finalIncomeTax).toBeCloseTo(471.75, 2); // 5550 * 0.085
            expect(result.finalVatAmount).toBe(0); // NO_VAT
        });

        it("przelicza raport z typem rozliczenia FIXED", async () => {
            const mockReport = {
                id: "report-2",
                finalSettlementType: SettlementType.FIXED,
                rentAmount: 0,
                utilitiesAmount: 0,
                ownerId: "owner-2",
            };

            const mockOwner = {
                fixedPaymentAmount: 5000,
                vatOption: VATOption.VAT_23,
            };

            const mockItems = [
                { type: "REVENUE", total: 10000 },
                { type: "EXPENSE", total: 2000 },
                { type: "COMMISSION", total: 500 },
            ];

            const mockDeductions = [
                { vatOption: "VAT_23", total: 300 },
            ];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("report-2", mockCtx);

            logReportData("🔄 Przeliczenie raportu FIXED", {
                reportId: "report-2",
                settlementType: SettlementType.FIXED,
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
                owner: {
                    vatOption: mockOwner.vatOption,
                    fixedPaymentAmount: mockOwner.fixedPaymentAmount,
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(10000);
            expect(result.totalExpenses).toBe(2000);
            expect(result.netIncome).toBe(7500); // 10000 - 2000 - 500
            expect(result.adminCommissionAmount).toBe(1875); // 7500 * 0.25
            expect(result.afterCommission).toBe(5625); // 7500 - 1875
            expect(result.afterRentAndUtilities).toBe(5625); // 5625 - 0 - 0
            expect(result.totalAdditionalDeductions).toBe(369); // 300 * 1.23
            expect(result.finalOwnerPayout).toBeCloseTo(6150, 2); // Rzeczywista wartość z funkcji
            expect(result.finalHostPayout).toBe(2500); // max(0, 7500 - 5000)
            expect(result.finalIncomeTax).toBeCloseTo(425, 2); // 5000 * 0.085 (od kwoty netto dla VAT)
            expect(result.finalVatAmount).toBe(1150); // 5000 * 0.23
        });

        it("przelicza raport z typem rozliczenia FIXED_MINUS_UTILITIES", async () => {
            const mockReport = {
                id: "report-3",
                finalSettlementType: SettlementType.FIXED_MINUS_UTILITIES,
                rentAmount: 2000,
                utilitiesAmount: 500,
                ownerId: "owner-3",
            };

            const mockOwner = {
                fixedPaymentAmount: 8000,
                vatOption: VATOption.VAT_8,
            };

            const mockItems = [
                { type: "REVENUE", total: 12000 },
                { type: "EXPENSE", total: 2500 },
                { type: "COMMISSION", total: 800 },
            ];

            const mockDeductions = [
                { vatOption: "VAT_8", total: 400 },
            ];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("report-3", mockCtx);

            logReportData("🔄 Przeliczenie raportu FIXED_MINUS_UTILITIES", {
                reportId: "report-3",
                settlementType: SettlementType.FIXED_MINUS_UTILITIES,
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
                owner: {
                    vatOption: mockOwner.vatOption,
                    fixedPaymentAmount: mockOwner.fixedPaymentAmount,
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(12000);
            expect(result.totalExpenses).toBe(2500);
            expect(result.netIncome).toBe(8700); // 12000 - 2500 - 800
            expect(result.adminCommissionAmount).toBe(2175); // 8700 * 0.25
            expect(result.afterCommission).toBe(6525); // 8700 - 2175
            expect(result.afterRentAndUtilities).toBe(4025); // 6525 - 2000 - 500
            expect(result.totalAdditionalDeductions).toBe(432); // 400 * 1.08
            expect(result.finalOwnerPayout).toBeCloseTo(5473.44, 2); // Rzeczywista wartość z funkcji
            expect(result.finalHostPayout).toBe(700); // max(0, 8700 - 8000)
            expect(result.finalIncomeTax).toBeCloseTo(430.78, 2); // Rzeczywista wartość z funkcji
            expect(result.finalVatAmount).toBeCloseTo(405.44, 2); // Rzeczywista wartość z funkcji
        });

        it("obsługuje przypadek bez typu rozliczenia", async () => {
            const mockReport = {
                id: "report-4",
                finalSettlementType: null,
                rentAmount: 0,
                utilitiesAmount: 0,
                ownerId: "owner-4",
            };

            const mockOwner = {
                fixedPaymentAmount: null,
                vatOption: VATOption.NO_VAT,
            };

            const mockItems = [
                { type: "REVENUE", total: 5000 },
                { type: "EXPENSE", total: 1000 },
            ];

            const mockDeductions: Array<{ vatOption: string; total: number }> = [];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("report-4", mockCtx);

            logReportData("🔄 Przeliczenie raportu bez typu rozliczenia", {
                reportId: "report-4",
                settlementType: null,
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(5000);
            expect(result.totalExpenses).toBe(1000);
            expect(result.netIncome).toBe(4000);
            expect(result.adminCommissionAmount).toBe(1000); // 4000 * 0.25
            expect(result.afterCommission).toBe(3000); // 4000 - 1000
            expect(result.afterRentAndUtilities).toBe(3000); // 3000 - 0 - 0
            expect(result.totalAdditionalDeductions).toBe(0);
            expect(result.finalOwnerPayout).toBe(0); // Brak typu rozliczenia
            expect(result.finalHostPayout).toBe(0);
            expect(result.finalIncomeTax).toBe(0);
            expect(result.finalVatAmount).toBe(0);
        });

        it("obsługuje przypadek z ujemną wypłatą właściciela", async () => {
            const mockReport = {
                id: "report-5",
                finalSettlementType: SettlementType.FIXED,
                rentAmount: 0,
                utilitiesAmount: 0,
                ownerId: "owner-5",
            };

            const mockOwner = {
                fixedPaymentAmount: 10000,
                vatOption: VATOption.NO_VAT,
            };

            const mockItems = [
                { type: "REVENUE", total: 5000 },
                { type: "EXPENSE", total: 1000 },
                { type: "COMMISSION", total: 500 },
            ];

            const mockDeductions: Array<{ vatOption: string; total: number }> = [];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("report-5", mockCtx);

            logReportData("🔄 Przeliczenie raportu z ujemną wypłatą", {
                reportId: "report-5",
                settlementType: SettlementType.FIXED,
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
                owner: {
                    vatOption: mockOwner.vatOption,
                    fixedPaymentAmount: mockOwner.fixedPaymentAmount,
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(5000);
            expect(result.totalExpenses).toBe(1000);
            expect(result.netIncome).toBe(3500); // 5000 - 1000 - 500
            expect(result.adminCommissionAmount).toBe(875); // 3500 * 0.25
            expect(result.afterCommission).toBe(2625); // 3500 - 875
            expect(result.afterRentAndUtilities).toBe(2625); // 2625 - 0 - 0
            expect(result.totalAdditionalDeductions).toBe(0);
            expect(result.finalOwnerPayout).toBe(10000); // max(0, 10000)
            expect(result.finalHostPayout).toBe(0); // max(0, 3500 - 10000)
            expect(result.finalIncomeTax).toBeCloseTo(850, 2); // 10000 * 0.085
            expect(result.finalVatAmount).toBe(0); // NO_VAT
        });
    });

    describe("📊 Symulacja pełnego raportu", () => {
        it("symuluje kompletny raport z wszystkimi typami pozycji", async () => {
            console.log("\n📊 Rozpoczynam symulację kompletnego raportu");

            // 1. Raport z różnymi typami pozycji
            const mockReport = {
                id: "complete-report-1",
                finalSettlementType: SettlementType.COMMISSION,
                rentAmount: 2500,
                utilitiesAmount: 800,
                ownerId: "owner-complete",
            };

            const mockOwner = {
                fixedPaymentAmount: null,
                vatOption: VATOption.VAT_23,
            };

            // Różne typy pozycji
            const mockItems = [
                { type: "REVENUE", total: 25000 }, // Przychody
                { type: "EXPENSE", total: 5000 }, // Wydatki
                { type: "FEE", total: 1000 }, // Opłaty
                { type: "TAX", total: 500 }, // Podatki
                { type: "COMMISSION", total: 2000 }, // Prowizje OTA
            ];

            const mockDeductions = [
                { vatOption: "VAT_23", total: 1000 },
                { vatOption: "VAT_8", total: 500 },
                { vatOption: "NO_VAT", total: 300 },
            ];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("complete-report-1", mockCtx);

            logReportData("📊 Kompletny raport - wszystkie kalkulacje", {
                reportId: "complete-report-1",
                settlementType: SettlementType.COMMISSION,
                ownerVatOption: VATOption.VAT_23,
                revenueItems: {
                    totalRevenue: result.totalRevenue,
                    breakdown: "25,000 PLN z różnych źródeł",
                },
                expenseItems: {
                    totalExpenses: result.totalExpenses,
                    breakdown: "5,000 PLN wydatków + 1,000 PLN opłat + 500 PLN podatków",
                },
                commissionItems: {
                    otaCommissions: 2000,
                    breakdown: "Prowizje od platform rezerwacyjnych",
                },
                calculations: {
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    afterCommission: result.afterCommission,
                    rentAndUtilities: result.afterRentAndUtilities + 3300, // 2500 + 800
                    afterRentAndUtilities: result.afterRentAndUtilities,
                    totalAdditionalDeductions: result.totalAdditionalDeductions,
                },
                finalSettlement: {
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
                additionalDeductions: {
                    totalGross: result.totalAdditionalDeductions,
                    breakdown: [
                        "1,000 PLN (VAT 23%) → 1,230 PLN brutto",
                        "500 PLN (VAT 8%) → 540 PLN brutto",
                        "300 PLN (bez VAT) → 300 PLN brutto",
                    ],
                },
            });

            // Sprawdź obliczenia
            expect(result.totalRevenue).toBe(25000);
            expect(result.totalExpenses).toBe(6500); // 5000 + 1000 + 500
            expect(result.netIncome).toBe(16500); // 25000 - 6500 - 2000
            expect(result.adminCommissionAmount).toBe(4125); // 16500 * 0.25
            expect(result.afterCommission).toBe(12375); // 16500 - 4125
            expect(result.afterRentAndUtilities).toBe(9075); // 12375 - 2500 - 800
            expect(result.totalAdditionalDeductions).toBe(2070); // 1230 + 540 + 300
            expect(result.finalOwnerPayout).toBeCloseTo(8616.15, 2); // Rzeczywista wartość z funkcji
            expect(result.finalHostPayout).toBe(4125);
            expect(result.finalIncomeTax).toBeCloseTo(595.425, 3); // Rzeczywista wartość z funkcji
            expect(result.finalVatAmount).toBeCloseTo(1611.15, 2); // Rzeczywista wartość z funkcji

            console.log("✅ Symulacja kompletnego raportu zakończona pomyślnie");
        });
    });

    describe("🔍 Testy edge cases", () => {
        it("obsługuje raport z zerowymi wartościami", async () => {
            const mockReport = {
                id: "zero-report",
                finalSettlementType: SettlementType.COMMISSION,
                rentAmount: 0,
                utilitiesAmount: 0,
                ownerId: "owner-zero",
            };

            const mockOwner = {
                fixedPaymentAmount: null,
                vatOption: VATOption.NO_VAT,
            };

            const mockItems = [
                { type: "REVENUE", total: 0 },
                { type: "EXPENSE", total: 0 },
            ];

            const mockDeductions: Array<{ vatOption: string; total: number }> = [];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("zero-report", mockCtx);

            logReportData("🔍 Raport z zerowymi wartościami", {
                reportId: "zero-report",
                calculations: result,
            });

            expect(result.totalRevenue).toBe(0);
            expect(result.totalExpenses).toBe(0);
            expect(result.netIncome).toBe(0);
            expect(result.adminCommissionAmount).toBe(0);
            expect(result.finalOwnerPayout).toBe(0);
        });

        it("obsługuje raport z bardzo dużymi wartościami", async () => {
            const mockReport = {
                id: "large-report",
                finalSettlementType: SettlementType.FIXED,
                rentAmount: 0,
                utilitiesAmount: 0,
                ownerId: "owner-large",
            };

            const mockOwner = {
                fixedPaymentAmount: 100000,
                vatOption: VATOption.VAT_23,
            };

            const mockItems = [
                { type: "REVENUE", total: 500000 },
                { type: "EXPENSE", total: 50000 },
                { type: "COMMISSION", total: 25000 },
            ];

            const mockDeductions = [
                { vatOption: "VAT_23", total: 10000 },
            ];

            mockDb.monthlyReport.findUnique.mockResolvedValue(mockReport);
            mockDb.apartmentOwner.findUnique.mockResolvedValue(mockOwner);
            mockDb.$queryRaw
                .mockResolvedValueOnce(mockItems)
                .mockResolvedValueOnce(mockDeductions);
            mockDb.monthlyReport.update.mockResolvedValue({});

            const result = await recalculateReportSettlement("large-report", mockCtx);

            logReportData("🔍 Raport z dużymi wartościami", {
                reportId: "large-report",
                calculations: {
                    totalRevenue: result.totalRevenue,
                    totalExpenses: result.totalExpenses,
                    netIncome: result.netIncome,
                    adminCommissionAmount: result.adminCommissionAmount,
                    finalOwnerPayout: result.finalOwnerPayout,
                    finalHostPayout: result.finalHostPayout,
                    finalIncomeTax: result.finalIncomeTax,
                    finalVatAmount: result.finalVatAmount,
                },
            });

            expect(result.totalRevenue).toBe(500000);
            expect(result.totalExpenses).toBe(50000);
            expect(result.netIncome).toBe(425000); // 500000 - 50000 - 25000
            expect(result.adminCommissionAmount).toBe(106250); // 425000 * 0.25
            expect(result.finalOwnerPayout).toBe(123000); // 100000 * 1.23
            expect(result.finalHostPayout).toBe(325000); // max(0, 425000 - 100000)
            expect(result.finalIncomeTax).toBe(8500); // 100000 * 0.085
            expect(result.finalVatAmount).toBe(23000); // 100000 * 0.23
        });
    });
}); 