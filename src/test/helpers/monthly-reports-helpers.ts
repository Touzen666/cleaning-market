import { type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";

type RecalculateContext = {
    db: PrismaClient;
};

type RecalculationResult = {
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
    adminCommissionAmount: number;
    afterCommission: number;
    afterRentAndUtilities: number;
    totalAdditionalDeductions: number;
    finalOwnerPayout: number;
    finalHostPayout: number;
    finalIncomeTax: number;
    finalVatAmount: number;
};

export async function recalculateReportSettlement(reportId: string, ctx: RecalculateContext): Promise<RecalculationResult> {
    const startTime = Date.now();
    console.log(`[PERF] Rozpoczynam przeliczanie raportu: ${reportId}`);

    try {
        // Zoptymalizowane zapytanie - pobieramy tylko potrzebne dane
        const [report, items, additionalDeductions] = await Promise.all([
            ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
                select: {
                    id: true,
                    finalSettlementType: true,
                    rentAmount: true,
                    utilitiesAmount: true,
                    ownerId: true,
                    apartmentId: true,
                }
            }),
            // Zoptymalizowane zapytanie - użyj agregacji SQL zamiast pobierania wszystkich rekordów
            // Filtrujemy rezerwacje ze statusem 'Anulowana' i 'Odrzucona przez obsługę' dla typów REVENUE
            ctx.db.$queryRaw<Array<{ type: string; total: number }>>`
                SELECT ri.type, SUM(ri.amount) as total 
                FROM "ReportItem" ri
                LEFT JOIN "Reservation" r ON ri."reservationId" = r.id
                WHERE ri."reportId" = ${reportId}
                  AND (ri.type != 'REVENUE' OR r.id IS NULL OR (r.status != 'Anulowana' AND r.status != 'Odrzucona przez obsługę'))
                GROUP BY ri.type
            `,
            // Zoptymalizowane zapytanie - użyj agregacji SQL dla dodatkowych odliczeń
            ctx.db.$queryRaw<Array<{ vatOption: string; total: number }>>`
                SELECT "vatOption", SUM(amount) as total 
                FROM "AdditionalDeduction" 
                WHERE "reportId" = ${reportId}
                GROUP BY "vatOption"
            `,
        ]);

        if (!report) {
            console.error(`[ERROR] Nie znaleziono raportu dla ID: ${reportId}`);
            throw new TRPCError({ code: "NOT_FOUND", message: `Raport ${reportId} nie istnieje.` });
        }

        // Pobierz właściciela i apartament na podstawie report.ownerId i report.apartmentId
        const [actualOwner, actualApartment] = await Promise.all([
            ctx.db.apartmentOwner.findUnique({
                where: { id: report.ownerId },
                select: { vatOption: true }
            }),
            ctx.db.apartment.findUnique({
                where: { id: report.apartmentId },
                select: { fixedPaymentAmount: true }
            })
        ]);

        if (!actualOwner) {
            console.error(`[ERROR] Nie znaleziono właściciela dla raportu: ${reportId}`);
            throw new TRPCError({ code: "NOT_FOUND", message: `Właściciel raportu ${reportId} nie istnieje.` });
        }

        if (!actualApartment) {
            console.error(`[ERROR] Nie znaleziono apartamentu dla raportu: ${reportId}`);
            throw new TRPCError({ code: "NOT_FOUND", message: `Apartament raportu ${reportId} nie istnieje.` });
        }

        // Zoptymalizowane obliczenia - używamy danych z agregacji SQL
        const totalRevenue = items.find(item => item.type === "REVENUE")?.total ?? 0;
        const totalExpenses = items
            .filter(item => ["EXPENSE", "FEE", "TAX"].includes(item.type))
            .reduce((sum, item) => sum + item.total, 0);
        const otaCommissions = items.find(item => item.type === "COMMISSION")?.total ?? 0;
        const netIncome = totalRevenue - totalExpenses - otaCommissions;
        const adminCommissionAmount = netIncome * 0.25;
        const afterCommission = netIncome - adminCommissionAmount;
        const rentAndUtilities = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
        const afterRentAndUtilities = afterCommission - rentAndUtilities;

        // Zoptymalizowane obliczenie dodatkowych odliczeń - używamy danych z agregacji SQL
        const totalAdditionalDeductionsGross = additionalDeductions.reduce((sum: number, d: { vatOption: string; total: number }) => {
            const vatMultiplier = d.vatOption === "VAT_23" ? 1.23 : d.vatOption === "VAT_8" ? 1.08 : 1;
            return sum + (d.total * vatMultiplier);
        }, 0);

        // Tylko jeden log zamiast wielu
        console.log(`[PERF] Raport ${reportId}: revenue=${totalRevenue}, expenses=${totalExpenses}, netIncome=${netIncome}, adminCommission=${adminCommissionAmount}`);

        let finalOwnerPayout = 0;
        let finalHostPayout = 0;
        let finalIncomeTax = 0;
        let finalVatAmount = 0;

        if (report.finalSettlementType) {
            let baseAmount = 0;
            const settlementType = report.finalSettlementType;

            if (settlementType === 'FIXED' || settlementType === 'FIXED_MINUS_UTILITIES') {
                if (actualApartment.fixedPaymentAmount === null || actualApartment.fixedPaymentAmount === undefined) {
                    console.warn(`[WARN] Raport ${reportId}: brak kwoty stałej dla typu ${settlementType}`);
                } else {
                    const fixedBaseAmount = Number(actualApartment.fixedPaymentAmount);

                    if (settlementType === 'FIXED') {
                        baseAmount = fixedBaseAmount;
                    } else { // FIXED_MINUS_UTILITIES
                        baseAmount = fixedBaseAmount - rentAndUtilities - totalAdditionalDeductionsGross;
                    }
                }
            } else if (settlementType === 'COMMISSION') {
                baseAmount = afterRentAndUtilities - totalAdditionalDeductionsGross;
            }

            // Zoptymalizowane obliczenia VAT - inline
            const vatRate = actualOwner.vatOption === "VAT_23" ? 0.23 : actualOwner.vatOption === "VAT_8" ? 0.08 : 0;
            finalVatAmount = Math.max(0, baseAmount) * vatRate;
            finalOwnerPayout = Math.max(0, baseAmount) + finalVatAmount;

            // Zoptymalizowane obliczanie finalHostPayout
            const fixedAmount = actualApartment.fixedPaymentAmount ? Number(actualApartment.fixedPaymentAmount) : 0;

            if (settlementType === 'COMMISSION') {
                finalHostPayout = adminCommissionAmount;
            } else if (settlementType === 'FIXED' || settlementType === 'FIXED_MINUS_UTILITIES') {
                finalHostPayout = Math.max(0, netIncome - fixedAmount);
            }

            finalIncomeTax = Math.max(0, finalOwnerPayout) * 0.085;
            console.log(`[TAX] Raport ${reportId}: podatek od wypłaty właściciela: settlementType=${settlementType}, finalOwnerPayout=${finalOwnerPayout}, finalIncomeTax=${finalIncomeTax}`);
        }

        const updateData = {
            totalRevenue,
            totalExpenses,
            netIncome,
            adminCommissionAmount,
            afterCommission,
            afterRentAndUtilities,
            totalAdditionalDeductions: totalAdditionalDeductionsGross,
            finalOwnerPayout,
            finalHostPayout,
            finalIncomeTax,
            finalVatAmount,
        };

        const duration = Date.now() - startTime;
        console.log(`[PERF] Zakończono przeliczanie raportu ${reportId} w ${duration}ms`);

        return updateData;

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] Błąd podczas przeliczania raportu ${reportId} (${duration}ms):`, error);
        throw error;
    }
} 