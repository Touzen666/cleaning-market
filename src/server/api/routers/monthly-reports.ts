import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Decimal } from "@prisma/client/runtime/library";
import {
    ReportStatus,
    ReportItemType,
    PaymentType,
    VATOption,
    UserType,
    ExpenseCategory,
    ReservationPortal,
    SettlementType
} from "@prisma/client";
import { getVatAmount, getGrossAmount } from "@/lib/vat";
import { type PrismaClient } from "@prisma/client";

type RecalculateContext = {
    db: PrismaClient;
};

// Helper to read parking profit
// Business rule: Always prefer the explicit value saved in the report (even if 0).
// Only when it is null/undefined do we fall back to computed (rental income - admin rent).
function getParkingProfit(report: unknown): number {
    const r = report as {
        parkingProfit?: number | null;
        parkingRentalIncome?: number | null;
        parkingAdminRent?: number | null;
    } | null | undefined;

    const explicit = r?.parkingProfit;
    if (explicit !== null && explicit !== undefined) {
        const n = Number(explicit);
        return Number.isFinite(n) ? n : 0;
    }

    const rentalIncome = Number(r?.parkingRentalIncome ?? 0);
    const adminRent = Number(r?.parkingAdminRent ?? 0);
    const computed = rentalIncome - adminRent;
    return Number.isFinite(computed) ? Math.max(0, computed) : 0;
}

function safeNumber(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function getParkingSuggestionsFromReport(report: Partial<{
    parkingAdminRent?: number | null;
    parkingRentalIncome?: number | null;
    parkingProfit?: number | null;
}> | null | undefined): {
    suggestedParkingAdminRent: number;
    suggestedParkingRentalIncome: number;
    suggestedParkingProfit: number;
} {
    const obj = report ?? {};
    const adminRent = safeNumber(obj.parkingAdminRent);
    const rentalIncome = safeNumber(obj.parkingRentalIncome);
    const profit = safeNumber(obj.parkingProfit);
    const computedProfit = Math.max(0, rentalIncome - adminRent);
    return {
        suggestedParkingAdminRent: adminRent,
        suggestedParkingRentalIncome: rentalIncome,
        suggestedParkingProfit: profit || computedProfit,
    };
}
// Zod schemas
const createReportSchema = z.object({
    apartmentId: z.number(),
    year: z.number().min(2020).max(2030),
    month: z.number().min(1).max(12),
});

const addReportItemSchema = z.object({
    reportId: z.string().uuid(),
    type: z.enum([ReportItemType.REVENUE, ReportItemType.EXPENSE, ReportItemType.FEE, ReportItemType.TAX, ReportItemType.COMMISSION]),
    category: z.string().min(1),
    description: z.string().min(1),
    amount: z.number(),
    date: z.date(),
    notes: z.string().optional(),
    reservationId: z.number().optional(),
    expenseCategory: z.enum([
        ExpenseCategory.CZYNSZ,
        ExpenseCategory.MEDIA,
        ExpenseCategory.PRAD,
        ExpenseCategory.GAZ,
        ExpenseCategory.WODA,
        ExpenseCategory.INTERNET,
        ExpenseCategory.PRANIE,
        ExpenseCategory.SPRZATANIE,
        ExpenseCategory.SRODKI_CZYSTOSCI,
        ExpenseCategory.TEKSTYLIA
    ]).optional(),
    portal: z.enum([
        ReservationPortal.BOOKING,
        ReservationPortal.AIRBNB,
        ReservationPortal.IDOBOOKING,
        ReservationPortal.CHANEL_MANAGER
    ]).optional(),
});

const sendReportSchema = z.object({
    reportId: z.string().uuid(),
    sendEmail: z.boolean().optional().default(false), // Opcjonalne wysyłanie emaila
});

const updateReportStatusSchema = z.object({
    reportId: z.string().uuid(),
    status: z.enum([ReportStatus.DRAFT, ReportStatus.REVIEW, ReportStatus.APPROVED, ReportStatus.SENT, ReportStatus.DELETED]),
    notes: z.string().optional(),
});

// Helper function to calculate owner payout amount
function calculateOwnerPayout(
    netIncome: number,
    apartmentPaymentType: PaymentType,
    apartmentFixedPaymentAmount: Decimal | null,
    ownerVatOption: VATOption
): number {
    let baseAmount = 0;

    if (apartmentPaymentType === PaymentType.FIXED_AMOUNT && apartmentFixedPaymentAmount) {
        baseAmount = Number(apartmentFixedPaymentAmount);
    } else if (apartmentPaymentType === PaymentType.COMMISSION) {
        // For commission, we'll calculate it based on net income
        // This can be customized with commission percentages in the future
        baseAmount = netIncome; // For now, owner gets all net income
    }

    // Apply VAT if applicable (VAT option remains on owner level)
    switch (ownerVatOption) {
        case VATOption.VAT_8:
            return baseAmount * 1.08;
        case VATOption.VAT_23:
            return baseAmount * 1.23;
        case VATOption.NO_VAT:
        default:
            return baseAmount;
    }
}

// Helper function to create historical copy of a report
// TODO: Enable after migration is generated
async function createHistoricalReportCopy(reportId: string, _ctx: RecalculateContext) {
    console.log(`Historical copy creation for report ${reportId} - will be implemented after migration`);
    // TODO: Implement after Prisma Client is regenerated with new models
}

// Helper function to calculate fixed costs (laundry, cleaning, textiles)
function calculateFixedCosts(items: Array<{ type: string; category: string; amount: number; expenseCategory?: ExpenseCategory | null }>): number {
    return items
        .filter(item =>
            item.type === "EXPENSE" &&
            (item.expenseCategory === ExpenseCategory.PRANIE ||
                item.expenseCategory === ExpenseCategory.SPRZATANIE ||
                item.expenseCategory === ExpenseCategory.SRODKI_CZYSTOSCI ||
                item.category.toLowerCase().includes('pranie') ||
                item.category.toLowerCase().includes('sprzątanie') ||
                item.category.toLowerCase().includes('sprzatanie') ||
                item.category.toLowerCase().includes('tekstylia') ||
                item.category.toLowerCase().includes('środki') ||
                item.category.toLowerCase().includes('srodki'))
        )
        .reduce((sum, item) => sum + item.amount, 0);
}

// Helper function to calculate cleaning costs based on reservations and apartment settings
async function calculateCleaningCosts(
    apartmentId: number,
    reservations: Array<{ adults?: number | null; children?: number | null }>,
    ctx: RecalculateContext
): Promise<number> {
    // Get apartment cleaning costs configuration
    const apartment = await ctx.db.apartment.findUnique({
        where: { id: apartmentId },
        select: { cleaningCosts: true }
    });

    if (!apartment?.cleaningCosts) {
        return 0; // No cleaning costs configured
    }

    const cleaningCosts = apartment.cleaningCosts as Record<string, number>;
    let totalCleaningCost = 0;

    for (const reservation of reservations) {
        const totalGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);

        if (totalGuests > 0) {
            // Find the cleaning cost for this number of guests
            // If exact match not found, use the highest available cost for fewer guests
            let cleaningCost = 0;
            for (let i = totalGuests; i >= 1; i--) {
                if (cleaningCosts[i.toString()] !== undefined) {
                    cleaningCost = cleaningCosts[i.toString()]!;
                    break;
                }
            }
            totalCleaningCost += cleaningCost;
        }
    }

    return totalCleaningCost;
}

// Helper function to calculate laundry costs based on reservations and apartment settings
async function calculateLaundryCosts(
    apartmentId: number,
    reservations: Array<{ start?: Date | null; end?: Date | null }>,
    ctx: RecalculateContext
): Promise<number> {
    // Get apartment laundry costs configuration
    const apartment = await ctx.db.apartment.findUnique({
        where: { id: apartmentId },
        select: { weeklyLaundryCost: true }
    });

    if (!apartment?.weeklyLaundryCost || apartment.weeklyLaundryCost <= 0) {
        return 0; // No laundry costs configured
    }

    const weeklyLaundryCost = apartment.weeklyLaundryCost;

    // Calculate total weeks based on reservations
    let totalWeeks = 0;

    for (const reservation of reservations) {
        if (reservation.start && reservation.end) {
            const startDate = new Date(reservation.start);
            const endDate = new Date(reservation.end);
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const weeks = Math.ceil(diffDays / 7); // Round up to account for partial weeks
            totalWeeks += weeks;
        }
    }

    // If no reservations with dates, fall back to assuming 4 weeks per month
    if (totalWeeks === 0 && reservations.length > 0) {
        totalWeeks = 4;
    }

    return totalWeeks * weeklyLaundryCost;
}

// Helper function to calculate textile costs based on reservations and apartment settings
async function calculateTextileCosts(
    apartmentId: number,
    reservations: Array<{ adults?: number | null; children?: number | null }>,
    ctx: RecalculateContext
): Promise<number> {
    // Get apartment textile costs configuration
    const apartment = await ctx.db.apartment.findUnique({
        where: { id: apartmentId },
        select: {
            cleaningSuppliesCost: true,
            capsuleCostPerGuest: true,
            wineCost: true
        }
    });

    if (!apartment) {
        return 0; // No apartment found
    }

    const cleaningSuppliesCost = apartment.cleaningSuppliesCost ?? 132; // Default 132 PLN
    const capsuleCostPerGuest = apartment.capsuleCostPerGuest ?? 2.5; // Default 2.5 PLN per guest
    const wineCost = apartment.wineCost ?? 250; // Default 250 PLN

    // Calculate variable cost based on guests
    let totalCapsuleCost = 0;

    for (const reservation of reservations) {
        const totalGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);
        totalCapsuleCost += totalGuests * capsuleCostPerGuest;
    }

    // Total cost = fixed costs + variable cost
    return cleaningSuppliesCost + wineCost + totalCapsuleCost;
}

// Funkcja do czyszczenia cache dla raportu
function clearRecalculationCache(reportId: string) {
    recalculationCache.delete(reportId);
    console.log(`[PERF] Wyczyszczono cache dla raportu ${reportId}`);
}

// Cache dla ostatnich przeliczeń - zapobiega zbyt częstym przeliczeniom
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

const recalculationCache = new Map<string, { timestamp: number; data: RecalculationResult }>();
// const RECALCULATION_DEBOUNCE_MS = 1000; // 1 sekunda - WYŁĄCZONE (nie używane)

async function recalculateReportSettlement(reportId: string, ctx: RecalculateContext) {
    const startTime = Date.now();
    console.log(`[PERF] Rozpoczynam przeliczanie raportu: ${reportId}`);

    // Sprawdź cache - jeśli ostatnie przeliczenie było niedawno, zwróć cached result
    // WYŁĄCZONE: cache powoduje problemy z niepoprawnymi wartościami
    // const cached = recalculationCache.get(reportId);
    // if (cached && (Date.now() - cached.timestamp) < RECALCULATION_DEBOUNCE_MS) {
    //     console.log(`[PERF] Używam cached result dla raportu ${reportId} (ostatnie przeliczenie: ${Date.now() - cached.timestamp}ms temu)`);
    //     return cached.data;
    // }

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
                    // Jeśli włączone niestandardowe podsumowanie, nie nadpisujemy finalnych wartości podczas rekalkulacji
                    customSummaryEnabled: true,
                }
            }),
            // Pobierz wszystkie pozycje raportu z rezerwacjami - używamy tej samej logiki co w getById
            ctx.db.reportItem.findMany({
                where: { reportId },
                include: {
                    reservation: {
                        select: { id: true, status: true }
                    }
                }
            }),
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
                select: { paymentType: true, fixedPaymentAmount: true }
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

        // Ujednolicona logika obliczania - taka sama jak w getById
        const revenueItems = items.filter((i) => i.type === "REVENUE" && (!i.reservation || (i.reservation.status !== "Anulowana" && i.reservation.status !== "Odrzucona przez obsługę")));
        const expenseItems = items.filter((i) => ["EXPENSE", "FEE", "TAX"].includes(i.type));
        const commissionItems = items.filter((i) => i.type === "COMMISSION");

        const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
        const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
        const otaCommissions = commissionItems.reduce((sum, i) => sum + i.amount, 0);
        const netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);
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

            // Podatek dochodowy 8.5% - jeśli właściciel jest podatnikiem VAT, liczymy od kwoty netto, w przeciwnym razie od kwoty brutto
            if (actualOwner.vatOption === "VAT_8" || actualOwner.vatOption === "VAT_23") {
                // Właściciel jest podatnikiem VAT - podatek od kwoty netto (baseAmount)
                finalIncomeTax = Math.max(0, baseAmount) * 0.085;
                console.log(`[TAX] Raport ${reportId}: właściciel podatnik VAT - podatek od kwoty netto: settlementType=${settlementType}, baseAmount=${baseAmount}, finalIncomeTax=${finalIncomeTax}`);
            } else {
                // Właściciel nie jest podatnikiem VAT - podatek od kwoty brutto (finalOwnerPayout)
                finalIncomeTax = finalOwnerPayout * 0.085;
                console.log(`[TAX] Raport ${reportId}: właściciel nie podatnik VAT - podatek od kwoty brutto: settlementType=${settlementType}, finalOwnerPayout=${finalOwnerPayout}, finalIncomeTax=${finalIncomeTax}`);
            }
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

        // Zoptymalizowany update - aktualizuj tylko pola związane z rozliczeniem
        const dataToUpdate: {
            totalRevenue: number;
            totalExpenses: number;
            netIncome: number;
            adminCommissionAmount: number;
            afterCommission: number;
            afterRentAndUtilities: number;
            totalAdditionalDeductions: number;
            finalOwnerPayout?: number;
            finalHostPayout?: number;
            finalIncomeTax?: number;
            finalVatAmount?: number;
        } = {
            totalRevenue,
            totalExpenses,
            netIncome,
            adminCommissionAmount,
            afterCommission,
            afterRentAndUtilities,
            totalAdditionalDeductions: totalAdditionalDeductionsGross,
        };

        // Nie nadpisuj finalnych wartości jeśli admin włączył niestandardowe podsumowanie
        if (!report.customSummaryEnabled) {
            dataToUpdate.finalOwnerPayout = finalOwnerPayout;
            dataToUpdate.finalHostPayout = finalHostPayout;
            dataToUpdate.finalIncomeTax = finalIncomeTax;
            dataToUpdate.finalVatAmount = finalVatAmount;
        }

        await ctx.db.monthlyReport.update({
            where: { id: reportId },
            data: dataToUpdate,
        });

        // WYŁĄCZONE: cache powoduje problemy z niepoprawnymi wartościami
        // Zapisz w cache
        // recalculationCache.set(reportId, {
        //     timestamp: Date.now(),
        //     data: updateData,
        // });

        const duration = Date.now() - startTime;
        console.log(`[PERF] Zakończono przeliczanie raportu ${reportId} w ${duration}ms`);

        // Dodaj szczegółowe informacje o wydajności
        if (duration > 500) {
            console.warn(`[PERF] WOLNE: Przeliczanie raportu ${reportId} trwało ${duration}ms`);
            console.log(`[PERF] Szczegóły: ${items.length} typów pozycji, ${additionalDeductions.length} typów odliczeń`);
        } else {
            console.log(`[PERF] SZYBKIE: Przeliczanie raportu ${reportId} w ${duration}ms`);
        }

        return updateData;

    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[ERROR] Błąd podczas przeliczania raportu ${reportId} (${duration}ms):`, error);
        throw error;
    }
}



// Funkcja do natychmiastowej rekalkulacji (dla operacji które tego wymagają)
async function forceRecalculation(reportId: string, ctx: RecalculateContext) {
    // Wykonaj natychmiastową rekalkulację
    clearRecalculationCache(reportId);
    await recalculateReportSettlement(reportId, ctx);
}

export const monthlyReportsRouter = createTRPCRouter({
    // Admin: Get all reports with filters
    getAll: protectedProcedure
        .input(z.object({
            apartmentId: z.number().optional(),
            ownerId: z.string().optional(),
            status: z.enum([ReportStatus.DRAFT, ReportStatus.REVIEW, ReportStatus.APPROVED, ReportStatus.SENT, ReportStatus.DELETED]).optional(),
            year: z.number().optional(),
            month: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view all reports",
                });
            }

            const reports = await ctx.db.monthlyReport.findMany({
                where: {
                    apartmentId: input.apartmentId,
                    ownerId: input.ownerId,
                    status: input.status,
                    year: input.year,
                    month: input.month,
                },
                include: {
                    apartment: {
                        select: { id: true, name: true, address: true },
                    },
                    owner: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    createdByAdmin: {
                        select: { name: true, email: true },
                    },
                    approvedByAdmin: {
                        select: { name: true, email: true },
                    },
                    items: {
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true },
                            },
                        },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                    { createdAt: "desc" },
                ],
            });

            console.log("reportsQuery", reports);
            console.log("reportsQuery.data", reports);

            return reports;
        }),

    // Admin: Update a manual income invoice (revenue) item
    updateIncomeInvoice: protectedProcedure
        .input(z.object({
            itemId: z.string().uuid(),
            amount: z.number().positive().optional(),
            description: z.string().min(1).optional(),
            date: z.date().optional(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }).refine((d) => d.amount !== undefined || d.description !== undefined || d.date !== undefined || d.startDate !== undefined || d.endDate !== undefined, {
            message: "At least one field must be provided",
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can update income invoices" });
            }

            const { itemId, amount, description, date, startDate, endDate } = input;

            const existing = await ctx.db.reportItem.findUnique({
                where: { id: itemId },
                include: { report: true },
            });

            if (!existing) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
            }
            if (existing.report.status === ReportStatus.SENT) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Nie można edytować pozycji w wysłanym raporcie." });
            }
            // Only allow updating manual income invoices (revenue without reservation)
            if (existing.type !== ReportItemType.REVENUE || existing.isAutoGenerated || existing.reservationId) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Można edytować tylko ręczne faktury przychodowe." });
            }

            const updated = await ctx.db.reportItem.update({
                where: { id: itemId },
                data: {
                    amount: amount ?? existing.amount,
                    description: description ?? existing.description,
                    date: date ?? existing.date,
                    notes: startDate && endDate
                        ? `Okres: ${startDate.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)}`
                        : startDate
                            ? `Od: ${startDate.toISOString().slice(0, 10)}`
                            : endDate
                                ? `Do: ${endDate.toISOString().slice(0, 10)}`
                                : existing.notes,
                },
            });

            await recalculateReportSettlement(existing.reportId, ctx);

            await ctx.db.reportHistory.create({
                data: {
                    reportId: existing.reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Zaktualizowano fakturę przychodową: ${updated.description} (${updated.amount.toFixed(2)} PLN)`,
                },
            });

            return { success: true };
        }),

    // Admin: Add a manual income invoice (revenue) to report
    addIncomeInvoice: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            amount: z.number().positive(),
            startDate: z.date().optional(),
            endDate: z.date().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can add income invoices",
                });
            }

            const { reportId, amount, startDate, endDate } = input;

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
                select: { id: true, status: true, year: true, month: true },
            });

            if (!report) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Raport nie został znaleziony" });
            }
            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Nie można edytować wysłanego raportu" });
            }

            // Prefer provided endDate/startDate for item date, fallback to end of report month
            const fallbackDate = new Date(Date.UTC(report.year, report.month, 0));
            const date = endDate ?? startDate ?? fallbackDate;

            const periodNote = startDate && endDate
                ? `Okres: ${startDate.toISOString().slice(0, 10)} - ${endDate.toISOString().slice(0, 10)}`
                : startDate
                    ? `Od: ${startDate.toISOString().slice(0, 10)}`
                    : endDate
                        ? `Do: ${endDate.toISOString().slice(0, 10)}`
                        : undefined;

            const item = await ctx.db.reportItem.create({
                data: {
                    reportId,
                    type: ReportItemType.REVENUE,
                    category: "INCOME_INVOICE",
                    description: "Faktura przychodowa (ręczna)",
                    amount,
                    currency: "PLN",
                    date,
                    notes: periodNote,
                    isAutoGenerated: false,
                },
            });

            await recalculateReportSettlement(reportId, ctx);

            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Dodano fakturę przychodową: ${amount.toFixed(2)} PLN`,
                },
            });

            return { success: true, itemId: item.id };
        }),

    // Admin: Create new monthly report
    create: protectedProcedure
        .input(createReportSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can create reports",
                });
            }

            const { apartmentId, year, month } = input;

            // Check if apartment exists and get owner
            const apartment = await ctx.db.apartment.findUnique({
                where: { id: apartmentId },
                include: {
                    ownerships: {
                        where: { isActive: true },
                        include: { owner: true },
                    },
                },
            });

            if (!apartment || apartment.ownerships.length === 0) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Apartament nie został znaleziony lub nie ma przypisanego właściciela",
                });
            }

            const owner = apartment.ownerships[0]?.owner;
            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel apartamentu nie został znaleziony",
                });
            }

            // Check if report already exists
            const existingReport = await ctx.db.monthlyReport.findUnique({
                where: {
                    apartmentId_year_month: {
                        apartmentId,
                        year,
                        month,
                    },
                },
            });

            if (existingReport) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Raport dla tego apartamentu i okresu już istnieje",
                });
            }

            // --- Robust Date Calculation ---
            // Start of the month in UTC
            const startDate = new Date(Date.UTC(year, month - 1, 1));
            // Start of the *next* month in UTC
            const nextMonthStartDate = new Date(Date.UTC(year, month, 1));

            // Rezerwacje do przychodu: wszystkie, które nachodzą na ten miesiąc
            const reservationsForRevenue = await ctx.db.reservation.findMany({
                where: {
                    apartmentId,
                    start: { lt: nextMonthStartDate },
                    end: { gt: startDate },
                },
                select: {
                    id: true,
                    guest: true,
                    start: true,
                    end: true,
                    currency: true,
                    paymantValue: true,
                    rateCorrection: true,
                    status: true,
                    adults: true,
                    children: true,
                },
            });

            // Rezerwacje dla kosztów (sprzątanie/pranie/tekstylnia): kończące się w tym miesiącu
            const reservationsEndMonth = await ctx.db.reservation.findMany({
                where: {
                    apartmentId,
                    end: {
                        gte: startDate,
                        lt: nextMonthStartDate,
                    },
                },
            });

            // Automatycznie ustaw typ rozliczenia na podstawie ustawień apartamentu
            let finalSettlementType: "COMMISSION" | "FIXED" | "FIXED_MINUS_UTILITIES";
            if (apartment.paymentType === "COMMISSION") {
                finalSettlementType = "COMMISSION";
            } else if (apartment.paymentType === "FIXED_AMOUNT") {
                finalSettlementType = "FIXED";
            } else if (apartment.paymentType === "FIXED_AMOUNT_MINUS_UTILITIES") {
                finalSettlementType = "FIXED_MINUS_UTILITIES";
            } else {
                finalSettlementType = "COMMISSION"; // Domyślnie
            }

            console.log(`🔄 Automatycznie ustawiono typ rozliczenia dla nowego raportu: ${finalSettlementType} (ustawienia apartamentu: ${apartment.paymentType})`);

            // Create report
            const report = await ctx.db.monthlyReport.create({
                data: {
                    apartmentId,
                    ownerId: owner.id,
                    year,
                    month,
                    createdByAdminId: ctx.session.user.id,
                    status: ReportStatus.DRAFT,
                    finalSettlementType, // Automatycznie ustawiony typ rozliczenia
                },
            });

            // Helper do liczenia nocy
            const countNights = (a: Date, b: Date) => {
                const diffMs = Math.abs(b.getTime() - a.getTime());
                const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
                return Math.max(1, nights);
            };

            // Auto-generate revenue items with proportional split
            const revenueItems = reservationsForRevenue
                .filter((reservation) => {
                    const totalGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);
                    return (
                        reservation.status !== "Anulowana" &&
                        reservation.status !== "Odrzucona przez obsługę" &&
                        totalGuests > 0
                    );
                })
                .map((reservation) => {
                    const totalAmount = reservation.rateCorrection ?? reservation.paymantValue;
                    const totalNights = countNights(new Date(reservation.start), new Date(reservation.end));

                    const overlapStart = new Date(Math.max(new Date(reservation.start).getTime(), startDate.getTime()));
                    const overlapEnd = new Date(Math.min(new Date(reservation.end).getTime(), nextMonthStartDate.getTime()));
                    const nightsInThisMonth = countNights(overlapStart, overlapEnd);

                    const pricePerNight = Math.floor((totalAmount / totalNights) * 100) / 100;
                    const amountForThisMonth = Number((pricePerNight * nightsInThisMonth).toFixed(2));

                    const otherNights = totalNights - nightsInThisMonth;
                    const note = `Kwota bazowa ${totalAmount.toFixed(2)} / ${totalNights} nocy = ${pricePerNight.toFixed(2)} za noc. W tym raporcie: ${nightsInThisMonth} nocy; pozostałe ${otherNights} nocy rozliczane w sąsiednim miesiącu.`;

                    return {
                        reportId: report.id,
                        type: ReportItemType.REVENUE,
                        category: "Booking",
                        description: `Rezerwacja - ${reservation.guest} (podział proporcjonalny)`,
                        amount: amountForThisMonth,
                        currency: reservation.currency ?? "PLN",
                        date: new Date(reservation.start),
                        reservationId: reservation.id,
                        isAutoGenerated: true,
                        notes: note,
                    };
                })
                .filter((item) => item.amount > 0);

            if (revenueItems.length > 0) {
                await ctx.db.reportItem.createMany({
                    data: revenueItems,
                });
            }

            // Auto-generate cleaning cost items
            const cleaningCost = await calculateCleaningCosts(apartmentId, reservationsEndMonth, ctx);
            if (cleaningCost > 0) {
                await ctx.db.reportItem.create({
                    data: {
                        reportId: report.id,
                        type: ReportItemType.EXPENSE,
                        category: "Sprzątanie",
                        description: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                        amount: cleaningCost,
                        currency: "PLN",
                        date: new Date(),
                        expenseCategory: ExpenseCategory.SPRZATANIE,
                        isAutoGenerated: true,
                        notes: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                    },
                });
            }

            // Auto-generate laundry cost items
            const laundryCost = await calculateLaundryCosts(apartmentId, reservationsEndMonth, ctx);
            if (laundryCost > 0) {
                await ctx.db.reportItem.create({
                    data: {
                        reportId: report.id,
                        type: ReportItemType.EXPENSE,
                        category: "Pranie",
                        description: `Usługi prania tekstyliów - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                        amount: laundryCost,
                        currency: "PLN",
                        date: new Date(),
                        expenseCategory: ExpenseCategory.PRANIE,
                        isAutoGenerated: true,
                        notes: `Usługi prania tekstyliów - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                    },
                });
            }

            // Auto-generate textile cost items
            const textileCost = await calculateTextileCosts(apartmentId, reservationsEndMonth, ctx);
            if (textileCost > 0) {
                await ctx.db.reportItem.create({
                    data: {
                        reportId: report.id,
                        type: ReportItemType.EXPENSE,
                        category: "Tekstylia",
                        description: `Tekstylia, wino i środki czystości - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                        amount: textileCost,
                        currency: "PLN",
                        date: new Date(),
                        expenseCategory: ExpenseCategory.TEKSTYLIA,
                        isAutoGenerated: true,
                        notes: `Tekstylia i środki czystości - wyliczenie na bazie ${reservationsEndMonth.length} rezerwacji`,
                    },
                });
            }

            // Calculate totals
            const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);
            const ownerPayoutAmount = calculateOwnerPayout(
                totalRevenue,
                apartment.paymentType,
                apartment.fixedPaymentAmount,
                owner.vatOption
            );

            await ctx.db.monthlyReport.update({
                where: { id: report.id },
                data: {
                    totalRevenue,
                    ownerPayoutAmount,
                },
            });

            // Przelicz raport z uwzględnieniem nowego typu rozliczenia
            await recalculateReportSettlement(report.id, ctx);

            // Add history entry
            await ctx.db.reportHistory.create({
                data: {
                    reportId: report.id,
                    adminId: ctx.session.user.id,
                    action: "created",
                    newStatus: ReportStatus.DRAFT,
                    notes: `Raport utworzony automatycznie z ${reservationsEndMonth.length} rezerwacjami`,
                },
            });

            return { success: true, reportId: report.id, totalRevenue, ownerPayoutAmount };
        }),

    // Admin: Get single report details
    getById: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            console.log("🔍 getById called with reportId:", input.reportId);
            console.log("🔍 User type:", ctx.session.user.type);

            if (ctx.session.user.type !== UserType.ADMIN) {
                console.log("❌ Access denied - user is not admin");
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view report details",
                });
            }

            console.log("🔍 Searching for report in database...");
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            defaultRentAmount: true,
                            defaultUtilitiesAmount: true,
                            weeklyLaundryCost: true,
                            cleaningSuppliesCost: true,
                            capsuleCostPerGuest: true,
                            wineCost: true,
                            cleaningCosts: true,
                            paymentType: true,
                            fixedPaymentAmount: true
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            vatOption: true,
                        },
                    },
                    createdByAdmin: {
                        select: { name: true, email: true },
                    },
                    approvedByAdmin: {
                        select: { name: true, email: true },
                    },
                    sentByAdmin: {
                        select: { name: true, email: true },
                    },
                    items: {
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true, source: true, adults: true, children: true, status: true, createDate: true },
                            },
                        },
                        orderBy: [{ type: "asc" }, { date: "asc" }],
                    },
                    history: {
                        include: {
                            admin: {
                                select: { name: true, email: true },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    },
                    additionalDeductions: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (!report) {
                console.log("❌ Report not found in database");
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            console.log("✅ Report found:", { id: report.id, month: report.month, year: report.year, status: report.status });
            // Debug: policz ilość pozycji po typach
            try {
                const counts = report.items.reduce((acc: Record<string, number>, it) => {
                    acc[it.type] = (acc[it.type] ?? 0) + 1;
                    return acc;
                }, {});
                const revenueWithRes = report.items.filter(i => i.type === "REVENUE" && i.reservation).length;
                const revenueWithoutRes = report.items.filter(i => i.type === "REVENUE" && !i.reservation).length;
                console.log("📊 Report items counts:", counts, { revenueWithRes, revenueWithoutRes, totalItems: report.items.length });
            } catch (e) {
                console.warn("[WARN] Failed to log items summary", e);
            }

            // Pobierz sugerowane wartości z ostatniego zatwierdzonego raportu
            const lastApprovedReport = await ctx.db.monthlyReport.findFirst({
                where: {
                    apartmentId: report.apartmentId,
                    status: ReportStatus.SENT,
                    id: { not: report.id },
                },
                orderBy: { createdAt: "desc" },
                select: {
                    rentAmount: true,
                    utilitiesAmount: true,
                    parkingAdminRent: true as unknown as boolean,
                    parkingRentalIncome: true as unknown as boolean,
                    parkingProfit: true as unknown as boolean,
                },
            });



            // Calculations similar to getOwnerReportById
            const revenueItems = report.items.filter((i) => i.type === "REVENUE" && (!i.reservation || (i.reservation.status !== "Anulowana" && i.reservation.status !== "Odrzucona przez obsługę")));
            const expenseItems = report.items.filter((i) => ["EXPENSE", "FEE", "TAX"].includes(i.type));
            const commissionItems = report.items.filter((i) => i.type === "COMMISSION");

            const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
            const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
            const otaCommissions = commissionItems.reduce((sum, i) => sum + i.amount, 0);
            const netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);

            const adminCommissionRate = 0.25;
            const adminCommissionAmount = netIncome * adminCommissionRate;
            const afterCommission = netIncome - adminCommissionAmount;

            const totalAdditionalDeductions = (report.additionalDeductions ?? []).reduce(
                (sum, d) => sum + (d.vatOption === "VAT_23" ? d.amount * 1.23 : d.vatOption === "VAT_8" ? d.amount * 1.08 : d.amount),
                0
            );

            const rentAndUtilitiesTotal = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
            const afterRentAndUtilities = afterCommission - rentAndUtilitiesTotal;

            const isVatExempt = report.owner.vatOption === "NO_VAT";

            // Calculate final payouts based on settlement type
            let finalOwnerPayout = 0;
            let finalHostPayout = 0;
            let finalIncomeTax = 0;
            let taxBase = 0; // Podstawa opodatkowania

            if (report.finalSettlementType === "COMMISSION") {
                // Commission-based settlement
                const commissionNetBaseAfterUtilities = afterRentAndUtilities - totalAdditionalDeductions;
                const commissionGrossAfterUtilities = isVatExempt
                    ? commissionNetBaseAfterUtilities
                    : getGrossAmount(commissionNetBaseAfterUtilities, report.owner.vatOption);

                finalOwnerPayout = isVatExempt
                    ? commissionNetBaseAfterUtilities
                    : commissionGrossAfterUtilities;
                finalHostPayout = adminCommissionAmount;

                // Podstawa opodatkowania = kwota po prowizji ZW (netto po prowizji admina)
                // Nie odejmujemy czynszu, mediów ani dodatkowych odliczeń
                taxBase = isVatExempt ? finalOwnerPayout : afterCommission;
                finalIncomeTax = taxBase * 0.085; // 8.5% income tax od podstawy opodatkowania
            } else if (report.finalSettlementType === "FIXED") {
                // Fixed amount settlement
                const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                finalOwnerPayout = isVatExempt
                    ? fixedBaseAmount
                    : getGrossAmount(fixedBaseAmount, report.owner.vatOption);
                finalHostPayout = Math.max(0, netIncome - fixedBaseAmount);

                // Podstawa opodatkowania - dla podatników VAT to kwota netto, dla zwolnionych to brutto
                taxBase = isVatExempt ? finalOwnerPayout : fixedBaseAmount;
                finalIncomeTax = taxBase * 0.085; // 8.5% income tax od podstawy opodatkowania
            } else if (report.finalSettlementType === "FIXED_MINUS_UTILITIES") {
                // Fixed amount minus utilities settlement
                const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                const netBaseAfterUtilities = fixedBaseAmount - rentAndUtilitiesTotal - totalAdditionalDeductions;
                finalOwnerPayout = isVatExempt
                    ? netBaseAfterUtilities
                    : getGrossAmount(netBaseAfterUtilities, report.owner.vatOption);
                finalHostPayout = Math.max(0, netIncome - fixedBaseAmount);

                // Podstawa opodatkowania - dla podatników VAT to kwota netto, dla zwolnionych to brutto
                taxBase = isVatExempt ? finalOwnerPayout : netBaseAfterUtilities;
                finalIncomeTax = taxBase * 0.085; // 8.5% income tax od podstawy opodatkowania
            }

            // Local, backward-compatible access to optional custom summary fields
            const custom = report as unknown as {
                customSummaryEnabled?: boolean | null;
                customTaxBase?: number | null;
                customOwnerPayout?: number | null;
                customHostPayout?: number | null;
                customIncomeTax?: number | null;
            };

            return {
                ...report,
                finalSettlementType: report.finalSettlementType,
                // Dodaj sugerowane wartości
                suggestedRent: lastApprovedReport?.rentAmount ?? report.apartment.defaultRentAmount ?? 0,
                suggestedUtilities: lastApprovedReport?.utilitiesAmount ?? report.apartment.defaultUtilitiesAmount ?? 0,
                ...getParkingSuggestionsFromReport(lastApprovedReport),
                // Dodaj kalkulacje
                totalRevenue: totalRevenue, // Przeliczona wartość przychodów
                totalExpenses: totalExpenses, // Przeliczona wartość wydatków
                netIncome,
                adminCommissionAmount,
                afterCommission,
                afterRentAndUtilities,
                finalOwnerPayout,
                finalHostPayout,
                finalIncomeTax,
                taxBase, // Podstawa opodatkowania
                // Custom summary override fields (przekazujemy do klienta, aby UI mogło je wykorzystać)
                customSummaryEnabled: custom.customSummaryEnabled ?? null,
                customTaxBase: custom.customTaxBase ?? null,
                customOwnerPayout: custom.customOwnerPayout ?? null,
                customHostPayout: custom.customHostPayout ?? null,
                customIncomeTax: custom.customIncomeTax ?? null,
            };
        }),



    // Admin: Update settlement details for a report
    updateSettlementDetails: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            finalSettlementType: z.nativeEnum(SettlementType),
            rentAmount: z.number().optional(),
            utilitiesAmount: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const { reportId, finalSettlementType, rentAmount, utilitiesAmount } = input;

            const report = await ctx.db.monthlyReport.findUnique({ where: { id: reportId } });
            if (!report) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            // (Removed stray unused locals here; real flags declared in owner query below)

            // Nie zeruj zachowanych wartości czynszu/mediów przy zmianie typu rozliczenia.
            // Aktualizuj je tylko, jeśli przekazano nowe wartości.
            const updateData: {
                finalSettlementType: SettlementType;
                rentAmount?: number;
                utilitiesAmount?: number;
            } = { finalSettlementType };

            if (finalSettlementType === 'COMMISSION' || finalSettlementType === 'FIXED_MINUS_UTILITIES') {
                if (typeof rentAmount === 'number') {
                    updateData.rentAmount = rentAmount;
                }
                if (typeof utilitiesAmount === 'number') {
                    updateData.utilitiesAmount = utilitiesAmount;
                }
            }

            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data: updateData
            });

            // Natychmiastowa rekalkulacja dla zmiany typu rozliczenia
            await forceRecalculation(reportId, ctx);

            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Zaktualizowano szczegóły rozliczenia. Typ: ${finalSettlementType}.`
                }
            });

            return { success: true };
        }),

    // Admin: Update parking section values
    updateParking: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            parkingAdminRent: z.number().min(0),
            parkingRentalIncome: z.number().min(0),
            parkingProfit: z.number().min(0),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const { reportId, parkingAdminRent, parkingRentalIncome, parkingProfit } = input;

            const report = await ctx.db.monthlyReport.findUnique({ where: { id: reportId } });
            if (!report) {
                throw new TRPCError({ code: "NOT_FOUND" });
            }
            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Nie można edytować wysłanego raportu." });
            }

            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data: {
                    parkingAdminRent: parkingAdminRent as unknown as number,
                    parkingRentalIncome: parkingRentalIncome as unknown as number,
                    parkingProfit: parkingProfit as unknown as number,
                },
            });

            // Net income should include parking profit
            await forceRecalculation(reportId, ctx);

            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Zaktualizowano sekcję Parking.`
                }
            });

            return { success: true };
        }),

    // Admin: Add item to report
    addItem: protectedProcedure
        .input(addReportItemSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can add report items",
                });
            }

            const { reportId, ...itemData } = input;

            // Check if report exists and is editable
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Nie można edytować wysłanego raportu",
                });
            }

            // Add item
            const item = await ctx.db.reportItem.create({
                data: {
                    ...itemData,
                    reportId,
                    currency: "PLN",
                    isAutoGenerated: false,
                },
            });

            // Natychmiastowa rekalkulacja dla lepszego UX
            await recalculateReportSettlement(reportId, ctx);

            // Add history entry
            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Dodano pozycję: ${itemData.category} - ${itemData.description}`,
                },
            });

            return { success: true, itemId: item.id };
        }),

    // Admin: Update or add item to report (for quick expenses)
    updateOrAddItem: protectedProcedure
        .input(addReportItemSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can update report items",
                });
            }

            const { reportId, ...itemData } = input;

            // Check if report exists and is editable
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Nie można edytować wysłanego raportu",
                });
            }

            // Check if item with this category already exists
            const existingItem = await ctx.db.reportItem.findFirst({
                where: {
                    reportId,
                    category: itemData.category,
                    type: ReportItemType.EXPENSE,
                    isAutoGenerated: false,
                },
            });

            let item;
            if (existingItem) {
                // Update existing item
                item = await ctx.db.reportItem.update({
                    where: { id: existingItem.id },
                    data: {
                        ...itemData,
                        currency: "PLN",
                        isAutoGenerated: false,
                    },
                });
            } else {
                // Create new item
                item = await ctx.db.reportItem.create({
                    data: {
                        ...itemData,
                        reportId,
                        currency: "PLN",
                        isAutoGenerated: false,
                    },
                });
            }

            // Natychmiastowa rekalkulacja dla lepszego UX
            await recalculateReportSettlement(reportId, ctx);

            // Add history entry
            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: existingItem ? "updated" : "created",
                    notes: `${existingItem ? "Zaktualizowano" : "Dodano"} pozycję: ${itemData.category} - ${itemData.description}`,
                },
            });

            return { success: true, itemId: item.id, wasUpdated: !!existingItem };
        }),

    // Admin: Update report status
    updateStatus: protectedProcedure
        .input(updateReportStatusSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can update report status",
                });
            }

            const { reportId, status, notes } = input;

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            const previousStatus = report.status;
            const updateData: {
                status: ReportStatus;
                approvedAt?: Date;
                approvedByAdminId?: string;
                sentAt?: Date;
            } = { status };

            if (status === ReportStatus.APPROVED) {
                // Sprawdź czy raport ma ustawiony typ rozliczenia przed zatwierdzeniem
                if (!report.finalSettlementType) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Nie można zatwierdzić raportu bez ustawionego typu rozliczenia. Ustaw typ rozliczenia przed zatwierdzeniem.",
                    });
                }

                // Sprawdź czy apartament ma ustawioną kwotę stałą dla typów FIXED
                if ((report.finalSettlementType === 'FIXED' || report.finalSettlementType === 'FIXED_MINUS_UTILITIES')) {
                    const apartment = await ctx.db.apartment.findUnique({
                        where: { id: report.apartmentId },
                        select: { fixedPaymentAmount: true, name: true }
                    });

                    if (!apartment?.fixedPaymentAmount) {
                        throw new TRPCError({
                            code: "BAD_REQUEST",
                            message: `Nie można zatwierdzić raportu z typem rozliczenia ${report.finalSettlementType}. Apartament ${apartment?.name ?? 'nieznany'} nie ma ustawionej kwoty stałej (fixedPaymentAmount).`,
                        });
                    }
                }

                updateData.approvedAt = new Date();
                updateData.approvedByAdminId = ctx.session.user.id;
            } else if (status === ReportStatus.SENT) {
                updateData.sentAt = new Date();
            }

            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data: updateData,
            });

            // Add history entry
            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: status === ReportStatus.APPROVED ? "approved" : status === ReportStatus.SENT ? "sent" : "updated",
                    previousStatus,
                    newStatus: status,
                    notes,
                },
            });

            if (status === ReportStatus.APPROVED) {
                await recalculateReportSettlement(reportId, ctx);
            }

            return { success: true };
        }),

    sendReport: protectedProcedure
        .input(sendReportSchema)
        .mutation(async ({ input, ctx }) => {
            const { reportId } = input;

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
                include: { owner: true }
            });

            if (!report) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Raport nie został znaleziony" });
            }

            if (report.status !== ReportStatus.APPROVED) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Można wysłać tylko zatwierdzony raport" });
            }

            // Aktualizuj raport - oznacz jako wysłany i zapisz informacje o użytkowniku
            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data: {
                    status: ReportStatus.SENT,
                    sentAt: new Date(),
                    sentByAdminId: ctx.session.user.id
                }
            });

            // Utwórz historyczną kopię raportu (po wygenerowaniu migracji)
            try {
                await createHistoricalReportCopy(reportId, ctx);
            } catch (error) {
                console.error("Error creating historical copy:", error);
                // Nie przerywamy procesu wysyłania, jeśli tworzenie kopii się nie powiedzie
            }

            await ctx.db.reportHistory.create({
                data: {
                    reportId,
                    adminId: ctx.session.user.id,
                    action: "sent",
                    previousStatus: report.status,
                    newStatus: ReportStatus.SENT,
                    notes: `Raport wysłany przez ${ctx.session.user.name ?? ctx.session.user.email}`,
                },
            });

            return { success: true, message: "Raport został oznaczony jako wysłany." };
        }),

    // Admin: Delete item from report
    deleteItem: protectedProcedure
        .input(z.object({ itemId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete report items.",
                });
            }

            const { itemId } = input;

            // Find the item to get the reportId and check its status
            const itemToDelete = await ctx.db.reportItem.findUnique({
                where: { id: itemId },
                include: { report: true },
            });

            if (!itemToDelete) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Report item not found.",
                });
            }

            // Prevent deletion if the report is sent (only SENT reports are immutable)
            if (itemToDelete.report.status === ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot delete items from a sent report.",
                });
            }

            // Prevent deleting auto-generated revenue items
            if (itemToDelete.isAutoGenerated && itemToDelete.type === 'REVENUE') {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot delete auto-generated revenue items linked to reservations.",
                });
            }

            await ctx.db.reportItem.delete({
                where: { id: itemId },
            });

            // Recalculate report totals after deletion
            await recalculateReportSettlement(itemToDelete.reportId, ctx);

            return { success: true, message: "Report item deleted successfully." };
        }),

    // Admin: Update the order of additional deductions
    updateDeductionsOrder: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            orderedDeductions: z.array(z.object({
                id: z.string().uuid(),
                order: z.number(),
            })),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can reorder deductions.",
                });
            }

            const { reportId, orderedDeductions } = input;

            // Use a transaction to update all orders at once
            const updatePromises = orderedDeductions.map(deduction =>
                ctx.db.additionalDeduction.update({
                    where: { id: deduction.id, reportId: reportId },
                    data: { order: deduction.order },
                })
            );

            try {
                await ctx.db.$transaction(updatePromises);
                await recalculateReportSettlement(reportId, ctx);
                return { success: true, message: "Order updated successfully." };
            } catch (error) {
                console.error("Failed to update deduction order:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to update order.",
                });
            }
        }),

    // Owner: Get approved/sent reports for their apartments
    getOwnerReports: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            const reports = await ctx.db.monthlyReport.findMany({
                where: {
                    ownerId: owner.id,
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                select: {
                    id: true,
                    month: true,
                    year: true,
                    status: true,
                    totalRevenue: true,
                    totalExpenses: true,
                    netIncome: true,
                    finalOwnerPayout: true,
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            images: {
                                where: { isPrimary: true },
                                select: { url: true, alt: true },
                                take: 1,
                            },
                        },
                    },
                    items: {
                        select: {
                            id: true,
                            type: true,
                            category: true,
                            description: true,
                            amount: true,
                            date: true,
                            expenseCategory: true,
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true, source: true, status: true },
                            },
                        },
                        orderBy: [{ type: "asc" }, { date: "asc" }],
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            // Process reports differently based on status
            const reportsWithNumbers = await Promise.all(reports.map(async (report) => {
                let finalOwnerPayout: number | null;
                let totalRevenue: number;
                let totalExpenses: number;
                let netIncome: number;

                if (report.status === "SENT") {
                    // For SENT reports - use frozen values from database (immutable)
                    finalOwnerPayout = report.finalOwnerPayout ? Number(report.finalOwnerPayout) : null;
                    totalRevenue = report.totalRevenue ?? 0;
                    totalExpenses = report.totalExpenses ?? 0;
                    netIncome = report.netIncome ?? 0;
                } else {
                    // For APPROVED reports - recalculate dynamically to reflect any changes
                    const revenueItems = report.items.filter((i) => i.type === "REVENUE" && (!i.reservation || (i.reservation.status !== "Anulowana" && i.reservation.status !== "Odrzucona przez obsługę")));
                    const expenseItems = report.items.filter((i) => ["EXPENSE", "FEE", "TAX"].includes(i.type));
                    const commissionItems = report.items.filter((i) => i.type === "COMMISSION");

                    totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
                    totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
                    const otaCommissions = commissionItems.reduce((sum, i) => sum + i.amount, 0);
                    netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);

                    // Recalculate finalOwnerPayout for APPROVED reports
                    const settlementResult = await recalculateReportSettlement(report.id, ctx);
                    finalOwnerPayout = settlementResult.finalOwnerPayout;
                }

                return {
                    ...report,
                    finalOwnerPayout,
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                    fixedCosts: calculateFixedCosts(report.items),
                };
            }));

            // Debug logging
            console.log(`[DEBUG] Found ${reportsWithNumbers.length} reports for owner ${owner.id}`);
            console.log(`[DEBUG] Owner email: ${input.ownerEmail}`);
            reportsWithNumbers.forEach((report, index) => {
                console.log(`[DEBUG] Report ${index + 1}: ID=${report.id}, Month=${report.month}/${report.year}, finalOwnerPayout=${report.finalOwnerPayout}`);
            });

            return reportsWithNumbers;
        }),

    // Owner: Get the latest approved/sent report for charts
    getFirstOwnerReport: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                return null;
            }

            const report = await ctx.db.monthlyReport.findFirst({
                where: {
                    ownerId: owner.id,
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                include: {
                    items: {
                        where: { type: 'REVENUE' },
                        select: { category: true, amount: true, type: true },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            if (!report) {
                return null;
            }

            return {
                month: report.month,
                year: report.year,
                items: report.items,
                calculated: {
                    totalRevenue: report.totalRevenue ?? 0,
                    totalExpenses: report.totalExpenses ?? 0,
                    netIncome: report.netIncome ?? 0,
                    adminCommission: report.adminCommissionAmount ?? 0,
                    ownerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : 0,
                    finalIncomeTax: report.finalIncomeTax ? Number(report.finalIncomeTax) : 0,
                }
            };
        }),

    // Admin: Get suggested commission items based on reservation channels
    getSuggestedCommissions: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view suggested commissions",
                });
            }

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    items: {
                        where: { type: ReportItemType.REVENUE },
                        include: {
                            reservation: {
                                select: { source: true },
                            },
                        },
                    },
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            // Get channels with their revenue totals
            const channelsMap = new Map<string, number>();
            report.items.forEach((item) => {
                if (item.reservation?.source) {
                    const channel = item.reservation.source;
                    const currentTotal = channelsMap.get(channel) ?? 0;
                    channelsMap.set(channel, currentTotal + item.amount);
                }
            });

            // Check which commissions already exist
            const existingCommissions = await ctx.db.reportItem.findMany({
                where: {
                    reportId: input.reportId,
                    type: ReportItemType.COMMISSION,
                },
            });

            const existingChannels = new Set(
                existingCommissions.map((item) => item.category.toLowerCase())
            );

            // Generate suggested commission items for channels that don't have commissions yet
            const suggestions = Array.from(channelsMap.entries())
                .filter(([channel]) => !existingChannels.has(channel.toLowerCase()))
                .map(([channel, totalRevenue]) => ({
                    type: ReportItemType.COMMISSION,
                    category: channel,
                    description: `Prowizja - ${channel}`,
                    amount: 0, // Będzie obliczona jako procent
                    totalRevenue, // Dodajemy sumę przychodów z tego kanału
                    date: new Date(), // Domyślnie dzisiaj
                    notes: `Sugerowana pozycja prowizji dla kanału ${channel}`,
                    isAutoGenerated: false,
                }));

            return {
                suggestions,
                existingChannels: Array.from(existingChannels),
                allChannels: Array.from(channelsMap.keys()),
            };
        }),
    updateSettlementData: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            rentAmount: z.number().optional(),
            utilitiesAmount: z.number().optional(),
            finalSettlementType: z.enum([SettlementType.COMMISSION, SettlementType.FIXED, SettlementType.FIXED_MINUS_UTILITIES]).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can update settlement data.",
                });
            }

            const { reportId, ...data } = input;

            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data,
            });

            await recalculateReportSettlement(reportId, ctx);

            return { success: true, message: "Dane rozliczeniowe zaktualizowane." };
        }),

    // TYMCZASOWE: Do jednorazowego przeliczenia starych raportów
    recalculateAllApprovedReports: protectedProcedure
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const reportsToRecalculate = await ctx.db.monthlyReport.findMany({
                where: {
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] }
                },
                select: { id: true }
            });

            let successCount = 0;
            let errorCount = 0;

            for (const report of reportsToRecalculate) {
                try {
                    await recalculateReportSettlement(report.id, ctx);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to recalculate report ${report.id}:`, error);
                    errorCount++;
                }
            }

            return {
                message: `Przeliczono ${successCount} raportów. ${errorCount} zakończyło się błędem.`,
                total: reportsToRecalculate.length,
                successCount,
                errorCount
            };
        }),

    recalculateSingleReport: publicProcedure
        .input(z.object({
            reportId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                const result = await recalculateReportSettlement(input.reportId, ctx);
                return {
                    success: true,
                    reportId: input.reportId,
                    data: result,
                };
            } catch (error) {
                console.error(`Failed to recalculate report ${input.reportId}:`, error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Failed to recalculate report: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    // Funkcja diagnostyczna do sprawdzania stanu raportu
    diagnoseReport: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            fixedPaymentAmount: true,
                            paymentType: true,
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            email: true,
                            vatOption: true,
                        },
                    },
                    items: true,
                    additionalDeductions: true,
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            const totalRevenue = report.items.filter(i => i.type === "REVENUE").reduce((s, i) => s + i.amount, 0);
            const totalExpenses = report.items.filter(i => ["EXPENSE", "FEE", "TAX"].includes(i.type)).reduce((s, i) => s + i.amount, 0);
            const otaCommissions = report.items.filter(i => i.type === "COMMISSION").reduce((s, i) => s + i.amount, 0);
            const netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);
            const adminCommissionAmount = netIncome * 0.25;
            const afterCommission = netIncome - adminCommissionAmount;
            const rentAndUtilities = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
            const afterRentAndUtilities = afterCommission - rentAndUtilities;
            const totalAdditionalDeductionsGross = report.additionalDeductions.reduce((s, d) => s + getGrossAmount(d.amount, d.vatOption), 0);

            const issues = [];
            const warnings = [];

            // Sprawdź typ rozliczenia
            if (!report.finalSettlementType) {
                issues.push("Brak ustawionego typu rozliczenia (finalSettlementType)");
            }

            // Sprawdź kwotę stałą dla typów FIXED
            if ((report.finalSettlementType === 'FIXED' || report.finalSettlementType === 'FIXED_MINUS_UTILITIES') && !report.apartment.fixedPaymentAmount) {
                issues.push(`Właściciel ${report.owner.email} nie ma ustawionej kwoty stałej (fixedPaymentAmount) dla typu rozliczenia ${report.finalSettlementType}`);
            }

            // Sprawdź czy finalOwnerPayout jest obliczony
            if (report.finalOwnerPayout === null || report.finalOwnerPayout === 0) {
                if (report.finalSettlementType) {
                    issues.push("finalOwnerPayout jest null/0 mimo ustawionego typu rozliczenia");
                }
            }

            // Ostrzeżenia
            if (totalRevenue === 0) {
                warnings.push("Brak przychodów w raporcie");
            }

            if (report.additionalDeductions.length === 0) {
                warnings.push("Brak dodatkowych odliczeń");
            }

            return {
                reportId: report.id,
                status: report.status,
                finalSettlementType: report.finalSettlementType,
                finalOwnerPayout: report.finalOwnerPayout,
                owner: {
                    email: report.owner.email,
                    fixedPaymentAmount: report.apartment.fixedPaymentAmount ? Number(report.apartment.fixedPaymentAmount) : null,
                    vatOption: report.owner.vatOption,
                    paymentType: report.apartment.paymentType,
                },
                calculations: {
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                    adminCommissionAmount,
                    afterCommission,
                    rentAndUtilities,
                    afterRentAndUtilities,
                    totalAdditionalDeductionsGross,
                },
                issues,
                warnings,
                canBeApproved: issues.length === 0,
            };
        }),

    addAirbnbCommissionWithDiscount: protectedProcedure
        .input(
            z.object({
                reportId: z.string().uuid(),
                reservationId: z.number(),
                commission: z.object({
                    category: z.string(),
                    description: z.string(),
                    amount: z.number(),
                    date: z.date(),
                    notes: z.string(),
                }),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can perform this action",
                });
            }
            const { reportId, commission, reservationId } = input;

            const reservation = await ctx.db.reservation.findUnique({
                where: { id: reservationId },
            });

            if (!reservation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Nie znaleziono rezerwacji.",
                });
            }

            const discountAmount = reservation.paymantValue + (reservation.paymantValue * 0.1 * 1.23);

            // Use a transaction to ensure both items are created or neither
            return ctx.db.$transaction(async (prisma) => {
                // Add commission
                await prisma.reportItem.create({
                    data: {
                        reportId,
                        ...commission,
                        type: "COMMISSION",
                    },
                });

                // Add discount
                await prisma.reportItem.create({
                    data: {
                        reportId,
                        type: "EXPENSE",
                        category: "Rabat 10%",
                        description: "Rabat 10% + 23% VAT (Airbnb)",
                        amount: discountAmount,
                        date: new Date(commission.date),
                        notes: "Rabat od przychodu z Airbnb oferta bezzwrotna",
                    },
                });
            });
        }),

    // Dodaj nową mutację do zapisywania czynszu i mediów
    updateRentAndUtilities: publicProcedure
        .input(z.object({
            reportId: z.string(),
            rentAmount: z.number().min(0),
            utilitiesAmount: z.number().min(0),
        }))
        .mutation(async ({ input, ctx }) => {
            await ctx.db.monthlyReport.update({
                where: { id: input.reportId },
                data: {
                    rentAmount: input.rentAmount,
                    utilitiesAmount: input.utilitiesAmount,
                },
            });

            // Natychmiastowa rekalkulacja po aktualizacji czynszu i mediów
            await recalculateReportSettlement(input.reportId, ctx);

            return { success: true };
        }),

    // Admin: Rebuild auto-generated revenue items for a report
    rebuildRevenueItems: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                select: { id: true, apartmentId: true, month: true, year: true }
            });
            if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Raport nie istnieje" });

            const apartment = await ctx.db.apartment.findUnique({ where: { id: report.apartmentId }, select: { id: true } });
            if (!apartment) throw new TRPCError({ code: "NOT_FOUND", message: "Apartament nie istnieje" });

            const startDate = new Date(report.year, report.month - 1, 1);
            const nextMonthStartDate = new Date(report.year, report.month, 1);

            const reservations = await ctx.db.reservation.findMany({
                where: {
                    apartmentId: apartment.id,
                    start: { lt: nextMonthStartDate },
                    end: { gt: startDate },
                },
                select: {
                    id: true, guest: true, start: true, end: true, currency: true,
                    paymantValue: true, rateCorrection: true, status: true, adults: true, children: true,
                }
            });

            await ctx.db.reportItem.deleteMany({
                where: { reportId: report.id, type: ReportItemType.REVENUE, isAutoGenerated: true }
            });

            const countNights = (a: Date, b: Date) => {
                const diffMs = Math.abs(b.getTime() - a.getTime());
                const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
                return Math.max(1, nights);
            };

            const revenueItems = reservations
                .filter(r => {
                    const totalGuests = (r.adults ?? 0) + (r.children ?? 0);
                    return (
                        r.status !== "Anulowana" &&
                        r.status !== "Odrzucona przez obsługę" &&
                        totalGuests > 0
                    );
                })
                .map(r => {
                    const totalAmount = r.rateCorrection ?? r.paymantValue ?? 0;
                    const totalNights = countNights(new Date(r.start), new Date(r.end));
                    const overlapStart = new Date(Math.max(new Date(r.start).getTime(), startDate.getTime()));
                    const overlapEnd = new Date(Math.min(new Date(r.end).getTime(), nextMonthStartDate.getTime()));
                    const nightsInThisMonth = countNights(overlapStart, overlapEnd);
                    const pricePerNight = Math.floor((totalAmount / totalNights) * 100) / 100;
                    const amountForThisMonth = Number((pricePerNight * nightsInThisMonth).toFixed(2));
                    const otherNights = totalNights - nightsInThisMonth;
                    const note = `Kwota bazowa ${totalAmount.toFixed(2)} / ${totalNights} nocy = ${pricePerNight.toFixed(2)} za noc. W tym raporcie: ${nightsInThisMonth} nocy; pozostałe ${otherNights} nocy rozliczane w sąsiednim miesiącu.`;
                    return {
                        reportId: report.id,
                        type: ReportItemType.REVENUE,
                        category: "Booking",
                        description: `Rezerwacja - ${r.guest ?? "gość"} (podział proporcjonalny)`,
                        amount: amountForThisMonth,
                        currency: r.currency ?? "PLN",
                        date: new Date(r.start),
                        reservationId: r.id,
                        isAutoGenerated: true,
                        notes: note,
                    };
                })
                .filter(i => i.amount > 0);

            if (revenueItems.length > 0) {
                await ctx.db.reportItem.createMany({ data: revenueItems });
            }

            await recalculateReportSettlement(report.id, ctx);
            return { success: true, created: revenueItems.length };
        }),

    // Owner: Get single report by ID (if approved/sent and owner is active)
    getOwnerReportById: publicProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            paymentType: true,
                            fixedPaymentAmount: true,
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            isActive: true,
                            vatOption: true,
                        },
                    },
                    items: {
                        include: {
                            reservation: true,
                        },
                        orderBy: {
                            date: 'asc',
                        },
                    },
                    additionalDeductions: {
                        orderBy: {
                            order: 'asc',
                        },
                    },
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            // Different logic for APPROVED vs SENT reports
            let totalRevenue: number;
            let totalExpenses: number;
            let netIncome: number;
            let adminCommissionAmount: number;
            let afterCommission: number;
            let totalAdditionalDeductions: number;
            let afterRentAndUtilities: number;
            let finalOwnerPayout: number;
            let finalHostPayout: number;
            let finalIncomeTax: number;
            let finalVatAmount: number;
            let taxBase: number;

            // Track custom summary visibility and note for owner across branches
            let customEnabledForOwner = false;
            let customNoteForOwner: string | null = null;

            if (report.status === "SENT") {
                // For SENT reports - use frozen values from database (immutable)
                totalRevenue = report.totalRevenue ?? 0;
                totalExpenses = report.totalExpenses ?? 0;
                netIncome = report.netIncome ?? 0;
                adminCommissionAmount = report.adminCommissionAmount ?? 0;
                afterCommission = report.afterCommission ?? 0;
                totalAdditionalDeductions = report.totalAdditionalDeductions ?? 0;
                afterRentAndUtilities = report.afterRentAndUtilities ?? 0;
                // Jeśli admin włączył niestandardowe podsumowanie, pokażemy je właścicielowi
                const customSent = report as unknown as {
                    customSummaryEnabled?: boolean | null;
                    customTaxBase?: number | null;
                    customOwnerPayout?: number | null;
                    customHostPayout?: number | null;
                    customIncomeTax?: number | null;
                    customSummaryNote?: string | null;
                };
                const useCustom = customSent.customSummaryEnabled === true;
                finalOwnerPayout = useCustom ? (customSent.customOwnerPayout ?? 0) : (report.finalOwnerPayout ?? 0);
                finalHostPayout = useCustom ? (customSent.customHostPayout ?? 0) : (report.finalHostPayout ?? 0);
                finalIncomeTax = useCustom ? (customSent.customIncomeTax ?? 0) : (report.finalIncomeTax ?? 0);
                finalVatAmount = report.finalVatAmount ?? 0;
                // Fallback: jeśli w wysłanym raporcie nie zapisano podstawy, policz ją tak jak w APPROVED
                if (useCustom) {
                    taxBase = customSent.customTaxBase ?? 0;
                } else {
                    const storedBase = report.taxBase ?? 0;
                    if (storedBase && storedBase > 0) {
                        taxBase = storedBase;
                    } else {
                        const isVatExempt = report.owner.vatOption === "NO_VAT";
                        const rentAndUtilitiesTotal = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
                        const totalAdditional = report.totalAdditionalDeductions ?? 0;
                        if (report.finalSettlementType === "COMMISSION") {
                            taxBase = isVatExempt ? (finalOwnerPayout ?? 0) : afterRentAndUtilities;
                        } else if (report.finalSettlementType === "FIXED") {
                            const fixedAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                            taxBase = isVatExempt ? (finalOwnerPayout ?? 0) : fixedAmount;
                        } else if (report.finalSettlementType === "FIXED_MINUS_UTILITIES") {
                            const fixedAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                            const netBaseAfterUtilities = fixedAmount - rentAndUtilitiesTotal - totalAdditional;
                            taxBase = isVatExempt ? (finalOwnerPayout ?? 0) : netBaseAfterUtilities;
                        } else {
                            taxBase = 0;
                        }
                    }
                }
                customEnabledForOwner = useCustom;
                customNoteForOwner = customSent.customSummaryNote ?? null;
            } else {
                // For APPROVED reports - recalculate dynamically to reflect any changes
                const revenueItems = report.items.filter((i) => i.type === "REVENUE" && (!i.reservation || (i.reservation.status !== "Anulowana" && i.reservation.status !== "Odrzucona przez obsługę")));
                const expenseItems = report.items.filter((i) => ["EXPENSE", "FEE", "TAX"].includes(i.type));
                const commissionItems = report.items.filter((i) => i.type === "COMMISSION");

                totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
                totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
                const otaCommissions = commissionItems.reduce((sum, i) => sum + i.amount, 0);
                netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);
                adminCommissionAmount = netIncome * 0.25;
                afterCommission = netIncome - adminCommissionAmount;

                // Calculate additional deductions dynamically
                totalAdditionalDeductions = (report.additionalDeductions ?? []).reduce(
                    (sum, d) => sum + getVatAmount(d.amount, d.vatOption), 0
                );

                const rentAndUtilitiesTotal = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
                afterRentAndUtilities = afterCommission - rentAndUtilitiesTotal;

                // Recalculate final values based on settlement type
                const settlementResult = await recalculateReportSettlement(report.id, ctx);
                finalOwnerPayout = settlementResult.finalOwnerPayout;
                finalHostPayout = settlementResult.finalHostPayout;
                finalIncomeTax = settlementResult.finalIncomeTax;
                finalVatAmount = settlementResult.finalVatAmount;

                // Calculate taxBase dynamically for APPROVED reports
                const isVatExempt = report.owner.vatOption === "NO_VAT";
                if (report.finalSettlementType === "COMMISSION") {
                    // Podstawa opodatkowania = kwota po prowizji ZW (netto po prowizji admina)
                    taxBase = isVatExempt ? finalOwnerPayout : afterCommission;
                } else if (report.finalSettlementType === "FIXED") {
                    const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                    taxBase = isVatExempt ? finalOwnerPayout : fixedBaseAmount;
                } else if (report.finalSettlementType === "FIXED_MINUS_UTILITIES") {
                    const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
                    const netBaseAfterUtilities = fixedBaseAmount - rentAndUtilitiesTotal - totalAdditionalDeductions;
                    taxBase = isVatExempt ? finalOwnerPayout : netBaseAfterUtilities;
                } else {
                    taxBase = 0;
                }

                // Propagate custom summary visibility and note for APPROVED reports as well
                customEnabledForOwner = Boolean((report as unknown as { customSummaryEnabled?: boolean | null }).customSummaryEnabled);
                customNoteForOwner = (report as unknown as { customSummaryNote?: string | null }).customSummaryNote ?? null;
            }

            // const otaCommissions = report.items.filter((i) => i.type === "COMMISSION").reduce((sum, i) => sum + i.amount, 0);
            const adminCommissionRate = 0.25; // Still needed for some calculations
            const rentAndUtilitiesTotal = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);

            const commissionNetBase = afterRentAndUtilities - totalAdditionalDeductions;
            const commissionVat = getVatAmount(commissionNetBase, report.owner.vatOption);
            const commissionGross = commissionNetBase + commissionVat;


            const commissionNetBaseAfterUtilities = netIncome * (1 - adminCommissionRate) - rentAndUtilitiesTotal - totalAdditionalDeductions;
            const commissionVatAfterUtilities = getVatAmount(commissionNetBaseAfterUtilities, report.owner.vatOption);
            const commissionGrossAfterUtilities = commissionNetBaseAfterUtilities + commissionVatAfterUtilities;

            let fixedNetBase: number | undefined;
            let fixedVat: number | undefined;
            let fixedGross: number | undefined;
            let fixedMinusUtilitiesNetBase: number | undefined;
            let fixedMinusUtilitiesVat: number | undefined;
            let fixedMinusUtilitiesGross: number | undefined;

            if (report.apartment.fixedPaymentAmount) {
                const fixedAmount = Number(report.apartment.fixedPaymentAmount);

                fixedNetBase = fixedAmount - totalAdditionalDeductions;
                fixedVat = getVatAmount(fixedNetBase, report.owner.vatOption);
                fixedGross = fixedNetBase + fixedVat;

                fixedMinusUtilitiesNetBase = fixedNetBase - rentAndUtilitiesTotal;
                fixedMinusUtilitiesVat = getVatAmount(fixedMinusUtilitiesNetBase, report.owner.vatOption);
                fixedMinusUtilitiesGross = fixedMinusUtilitiesNetBase + fixedMinusUtilitiesVat;
            }



            return {
                ...report,
                netIncome,
                adminCommissionAmount,
                afterCommission,
                afterRentAndUtilities,
                commissionNetBase,
                commissionVat,
                commissionGross,
                commissionNetBaseAfterUtilities,
                commissionVatAfterUtilities,
                commissionGrossAfterUtilities,
                fixedNetBase,
                fixedVat,
                fixedGross,
                fixedMinusUtilitiesNetBase,
                fixedMinusUtilitiesVat,
                fixedMinusUtilitiesGross,
                totalAdditionalDeductions,
                finalOwnerPayout,
                finalHostPayout,
                finalIncomeTax,
                finalVatAmount,
                taxBase, // Podstawa opodatkowania
                // Przekaż informację o custom summary do klienta
                customSummaryEnabled: customEnabledForOwner,
                customSummaryNote: customNoteForOwner,
            };
        }),

    // Admin: Zapis niestandardowego podsumowania rozliczenia
    setCustomSummary: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            enabled: z.boolean(),
            taxBase: z.number().nullable(),
            ownerPayout: z.number().nullable(),
            hostPayout: z.number().nullable(),
            incomeTax: z.number().nullable(),
            note: z.string().nullable().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN" });
            }

            const report = await ctx.db.monthlyReport.findUnique({ where: { id: input.reportId } });
            if (!report) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Raport nie został znaleziony" });
            }
            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({ code: "BAD_REQUEST", message: "Nie można edytować wysłanego raportu." });
            }

            await ctx.db.monthlyReport.update({
                where: { id: input.reportId },
                data: {
                    customSummaryEnabled: input.enabled,
                    customTaxBase: input.taxBase,
                    customOwnerPayout: input.ownerPayout,
                    customHostPayout: input.hostPayout,
                    customIncomeTax: input.incomeTax,
                    customSummaryNote: input.note ?? null,
                    // W momencie zapisu niestandardowego podsumowania utrwalamy te wartości również jako finalne,
                    // aby były widoczne we wszystkich raportach i nie zostały nadpisane przez rekalkulacje.
                    // Dodatkowo rekalkulacja (patrz wyżej) nie nadpisuje wartości finalnych, gdy customSummaryEnabled=true.
                    ...(input.enabled
                        ? {
                            taxBase: input.taxBase ?? null,
                            finalOwnerPayout: input.ownerPayout ?? null,
                            finalHostPayout: input.hostPayout ?? null,
                            finalIncomeTax: input.incomeTax ?? null,
                        }
                        : {}),
                },
            });

            await ctx.db.reportHistory.create({
                data: {
                    reportId: input.reportId,
                    adminId: ctx.session.user.id,
                    action: input.enabled ? "set_custom_summary" : "unset_custom_summary",
                    notes: input.enabled ?
                        `Ustawiono niestandardowe podsumowanie: podstawa=${input.taxBase ?? "-"}, właściciel=${input.ownerPayout ?? "-"}, administrator=${input.hostPayout ?? "-"}, podatek=${input.incomeTax ?? "-"}`
                        : "Wyłączono niestandardowe podsumowanie",
                },
            });

            return { success: true };
        }),

    // Admin: Delete report by ID (old version - kept for backward compatibility)
    deleteReport: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete reports",
                });
            }

            // Sprawdź czy raport istnieje
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            // Usuń powiązane rekordy (items, history, additional deductions)
            await ctx.db.reportItem.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.reportHistory.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.additionalDeduction.deleteMany({ where: { reportId: input.reportId } });

            // Usuń raport
            await ctx.db.monthlyReport.delete({ where: { id: input.reportId } });
            return { success: true };
        }),

    // Admin: Archive and delete sent report with reason
    archiveAndDeleteSentReport: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            deletionReason: z.string().min(1, "Przyczyna usunięcia jest wymagana")
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can archive and delete reports",
                });
            }

            // Sprawdź czy raport istnieje i jest wysłany
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    items: true,
                    additionalDeductions: true,
                }
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            if (report.status !== ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Tylko wysłane raporty mogą być archiwizowane i usuwane",
                });
            }

            // Sprawdź czy już istnieje historyczna kopia (sprawdź po year, month, ownerId, apartmentId)
            const existingHistorical = await ctx.db.historicalReport.findFirst({
                where: {
                    year: report.year,
                    month: report.month,
                    ownerId: report.ownerId,
                    apartmentId: report.apartmentId,
                    status: ReportStatus.DELETED
                }
            });

            if (existingHistorical) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Raport został już zarchiwizowany",
                });
            }

            // Utwórz historyczną kopię raportu
            const historicalReport = await ctx.db.historicalReport.create({
                data: {
                    originalReportId: report.id,
                    year: report.year,
                    month: report.month,
                    ownerId: report.ownerId,
                    apartmentId: report.apartmentId,
                    status: ReportStatus.DELETED, // Zmień status na DELETED
                    totalRevenue: report.totalRevenue ?? 0,
                    totalExpenses: report.totalExpenses ?? 0,
                    netIncome: report.netIncome ?? 0,
                    ownerPayoutAmount: report.ownerPayoutAmount ?? 0,
                    currency: report.currency,
                    rentAmount: report.rentAmount,
                    utilitiesAmount: report.utilitiesAmount,
                    finalSettlementType: report.finalSettlementType,
                    finalOwnerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : null,
                    finalHostPayout: report.finalHostPayout ? Number(report.finalHostPayout) : null,
                    finalIncomeTax: report.finalIncomeTax ? Number(report.finalIncomeTax) : null,
                    finalVatAmount: report.finalVatAmount ? Number(report.finalVatAmount) : null,
                    taxBase: report.taxBase ? Number(report.taxBase) : null,
                    adminCommissionAmount: report.adminCommissionAmount ? Number(report.adminCommissionAmount) : null,
                    afterCommission: report.afterCommission ? Number(report.afterCommission) : null,
                    afterRentAndUtilities: report.afterRentAndUtilities ? Number(report.afterRentAndUtilities) : null,
                    totalAdditionalDeductions: report.totalAdditionalDeductions ? Number(report.totalAdditionalDeductions) : null,
                    sentAt: report.sentAt ?? new Date(),
                    frozenAt: new Date(), // Moment zamrożenia raportu
                    deletedAt: new Date(),
                    deletedByAdminId: ctx.session.user.id,
                    deletionReason: input.deletionReason,
                    createdByAdminId: report.createdByAdminId,
                    approvedByAdminId: report.approvedByAdminId,
                    sentByAdminId: report.sentByAdminId,
                }
            });

            // Skopiuj pozycje raportu
            for (const item of report.items) {
                await ctx.db.historicalReportItem.create({
                    data: {
                        historicalReportId: historicalReport.id,
                        type: item.type,
                        category: item.category,
                        description: item.description,
                        amount: item.amount,
                        currency: item.currency,
                        expenseCategory: item.expenseCategory,
                        portal: item.portal,
                        date: item.date,
                        notes: item.notes,
                        isAutoGenerated: item.isAutoGenerated,
                        reservationId: item.reservationId,
                    }
                });
            }

            // Skopiuj dodatkowe odliczenia
            for (const deduction of report.additionalDeductions) {
                await ctx.db.historicalAdditionalDeduction.create({
                    data: {
                        historicalReportId: historicalReport.id,
                        name: deduction.name,
                        amount: deduction.amount,
                        vatOption: deduction.vatOption,
                        order: deduction.order,
                    }
                });
            }

            // Usuń oryginalny raport i powiązane dane
            await ctx.db.reportItem.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.reportHistory.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.additionalDeduction.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.monthlyReport.delete({ where: { id: input.reportId } });

            return {
                success: true,
                historicalReportId: historicalReport.id,
                message: "Raport został zarchiwizowany i usunięty"
            };
        }),

    setFinalSettlementType: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            finalSettlementType: z.enum(["COMMISSION", "FIXED", "FIXED_MINUS_UTILITIES"]),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can set settlement type",
                });
            }

            // Sprawdź czy raport istnieje i nie jest wysłany
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
            }

            if (report.status === ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Nie można edytować wysłanego raportu",
                });
            }

            // Ustaw typ rozliczenia
            await ctx.db.monthlyReport.update({
                where: { id: input.reportId },
                data: { finalSettlementType: input.finalSettlementType },
            });

            // Dodaj wpis do historii
            await ctx.db.reportHistory.create({
                data: {
                    reportId: input.reportId,
                    adminId: ctx.session.user.id,
                    action: "updated",
                    notes: `Ustawiono typ rozliczenia: ${input.finalSettlementType}`,
                },
            });

            // Automatycznie przelicz raport po ustawieniu typu rozliczenia
            await recalculateReportSettlement(input.reportId, ctx);

            return { success: true };
        }),

    addAdditionalDeduction: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            name: z.string().min(1),
            amount: z.number().min(0),
            vatOption: z.enum(["NO_VAT", "VAT_8", "VAT_23"]),
        }))
        .mutation(async ({ input, ctx }) => {
            await ctx.db.additionalDeduction.create({
                data: {
                    reportId: input.reportId,
                    name: input.name,
                    amount: input.amount,
                    vatOption: input.vatOption,
                },
            });

            // Natychmiastowa rekalkulacja po dodaniu odliczenia
            await recalculateReportSettlement(input.reportId, ctx);

            return { success: true };
        }),

    updateAdditionalDeduction: protectedProcedure
        .input(
            z.object({
                deductionId: z.string().uuid(),
                name: z.string().min(1, "Nazwa jest wymagana"),
                amount: z.number().positive("Kwota musi być dodatnia"),
                vatOption: z.nativeEnum(VATOption),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą aktualizować odliczenia.",
                });
            }

            const { deductionId, name, amount, vatOption } = input;

            const deduction = await ctx.db.additionalDeduction.findUnique({
                where: { id: deductionId },
            });
            if (!deduction) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Odliczenie nie zostało znalezione",
                });
            }

            const updatedDeduction = await ctx.db.additionalDeduction.update({
                where: { id: deductionId },
                data: {
                    name,
                    amount,
                    vatOption,
                },
            });

            // Natychmiastowa rekalkulacja po aktualizacji odliczenia
            await recalculateReportSettlement(deduction.reportId, ctx);

            return updatedDeduction;
        }),

    deleteAdditionalDeduction: protectedProcedure
        .input(z.object({
            deductionId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Pobierz reportId przed usunięciem
            const deduction = await ctx.db.additionalDeduction.findUnique({
                where: { id: input.deductionId },
                select: { reportId: true }
            });

            await ctx.db.additionalDeduction.delete({
                where: { id: input.deductionId },
            });

            // Natychmiastowa rekalkulacja po usunięciu odliczenia
            if (deduction) {
                await recalculateReportSettlement(deduction.reportId, ctx);
            }

            return { success: true };
        }),

    addReservationDiscount: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            reservationId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can perform this action",
                });
            }

            const { reportId, reservationId } = input;

            const reservation = await ctx.db.reservation.findUnique({
                where: { id: reservationId },
            });

            if (!reservation) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Nie znaleziono rezerwacji.",
                });
            }

            // Calculate 10% discount + 23% VAT on the discount amount
            const discountAmount = reservation.paymantValue * 0.1 * 1.23;

            await ctx.db.reportItem.create({
                data: {
                    reportId,
                    type: "EXPENSE",
                    category: "Rabat 10%",
                    description: `Rabat 10% + 23% VAT (dla rezerwacji #${reservation.id})`,
                    amount: discountAmount,
                    date: new Date(),
                    notes: `Rabat od przychodu z Airbnb (oferta bezzwrotna) dla rezerwacji gościa: ${reservation.guest}`,
                    reservationId: reservation.id,
                },
            });

            // Natychmiastowa rekalkulacja po dodaniu rabatu
            await recalculateReportSettlement(reportId, ctx);

            return { success: true };
        }),

    // Debug endpoint to test database query
    debugOwnerReports: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            // Test 1: Get all APPROVED/SENT reports for this owner (filtered like getOwnerReports)
            const allReports = await ctx.db.monthlyReport.findMany({
                where: {
                    ownerId: owner.id,
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                select: {
                    id: true,
                    month: true,
                    year: true,
                    status: true,
                    finalOwnerPayout: true,
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            // Convert Decimal to number for all reports
            const allReportsWithNumbers = allReports.map(report => ({
                ...report,
                finalOwnerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : null,
            }));

            // Test 2: Get only APPROVED/SENT reports
            const approvedReports = await ctx.db.monthlyReport.findMany({
                where: {
                    ownerId: owner.id,
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                select: {
                    id: true,
                    month: true,
                    year: true,
                    status: true,
                    finalOwnerPayout: true,
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            // Convert Decimal to number for approved reports
            const approvedReportsWithNumbers = approvedReports.map(report => ({
                ...report,
                finalOwnerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : null,
            }));

            // Test 3: Aggregate sum for current year
            const startOfYear = new Date(new Date().getFullYear(), 0, 1);
            const currentYearSum = await ctx.db.monthlyReport.aggregate({
                where: {
                    ownerId: owner.id,
                    year: startOfYear.getFullYear(),
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                _sum: {
                    finalOwnerPayout: true,
                },
            });

            // Test 4: Exact same query as getOwnerReports but simplified
            const exactQueryReports = await ctx.db.monthlyReport.findMany({
                where: {
                    ownerId: owner.id,
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                select: {
                    id: true,
                    month: true,
                    year: true,
                    status: true,
                    finalOwnerPayout: true,
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            // Convert Decimal to number for exact query reports
            const exactQueryReportsWithNumbers = exactQueryReports.map(report => ({
                ...report,
                finalOwnerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : null,
            }));

            // Test 5: Manual sum calculation
            const manualSum = exactQueryReportsWithNumbers.reduce((sum, report) => sum + (report.finalOwnerPayout ?? 0), 0);

            // Test 6: Detailed analysis of 6/2025 report
            const june2025Report = await ctx.db.monthlyReport.findFirst({
                where: {
                    ownerId: owner.id,
                    month: 6,
                    year: 2025
                },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            fixedPaymentAmount: true,
                            paymentType: true,
                        },
                    },
                    owner: {
                        select: {
                            vatOption: true,
                            email: true
                        }
                    },
                    additionalDeductions: true,
                    items: true
                }
            });

            let june2025Analysis = null;
            if (june2025Report) {
                const totalRevenue = june2025Report.items.filter(i => i.type === "REVENUE").reduce((s, i) => s + i.amount, 0);
                const totalExpenses = june2025Report.items.filter(i => ["EXPENSE", "FEE", "TAX"].includes(i.type)).reduce((s, i) => s + i.amount, 0);
                const otaCommissions = june2025Report.items.filter(i => i.type === "COMMISSION").reduce((s, i) => s + i.amount, 0);
                const netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(june2025Report);
                const adminCommissionAmount = netIncome * 0.25;
                const afterCommission = netIncome - adminCommissionAmount;
                const rentAndUtilities = (june2025Report.rentAmount ?? 0) + (june2025Report.utilitiesAmount ?? 0);
                const afterRentAndUtilities = afterCommission - rentAndUtilities;
                const totalAdditionalDeductionsGross = june2025Report.additionalDeductions.reduce((s, d) => s + getGrossAmount(d.amount, d.vatOption), 0);

                june2025Analysis = {
                    reportId: june2025Report.id,
                    status: june2025Report.status,
                    finalSettlementType: june2025Report.finalSettlementType,
                    finalOwnerPayout: june2025Report.finalOwnerPayout ? Number(june2025Report.finalOwnerPayout) : null,
                    ownerFixedPaymentAmount: june2025Report.apartment.fixedPaymentAmount ? Number(june2025Report.apartment.fixedPaymentAmount) : null,
                    ownerVatOption: june2025Report.owner.vatOption,
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                    adminCommissionAmount,
                    afterCommission,
                    rentAndUtilities,
                    afterRentAndUtilities,
                    totalAdditionalDeductionsGross,
                    itemsCount: june2025Report.items.length,
                    additionalDeductionsCount: june2025Report.additionalDeductions.length
                };
            }

            return {
                ownerId: owner.id,
                ownerEmail: input.ownerEmail,
                allReportsCount: allReportsWithNumbers.length,
                allReports: allReportsWithNumbers, // Only APPROVED/SENT reports
                approvedReportsCount: approvedReportsWithNumbers.length,
                approvedReports: approvedReportsWithNumbers,
                currentYearSum: currentYearSum._sum.finalOwnerPayout ? Number(currentYearSum._sum.finalOwnerPayout) : null,
                currentYear: startOfYear.getFullYear(),
                exactQueryReportsCount: exactQueryReportsWithNumbers.length,
                exactQueryReports: exactQueryReportsWithNumbers,
                manualSum: manualSum,
                june2025Analysis
            };
        }),

    // Owner: Get filtered reports for dashboard charts
    getOwnerFilteredReports: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
            apartmentId: z.number().optional(),
            year: z.number().optional(),
            month: z.number().optional(),
            reportId: z.string().uuid().optional(),
            viewType: z.enum(['yearly', 'monthly', 'single']).default('yearly'),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                return null;
            }

            const whereClause = {
                ownerId: owner.id,
                status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                ...(input.apartmentId && { apartmentId: input.apartmentId }),
                ...(input.year && { year: input.year }),
                ...(input.month && { month: input.month }),
                ...(input.reportId && { id: input.reportId }),
            };

            const reports = await ctx.db.monthlyReport.findMany({
                where: whereClause,
                select: {
                    id: true,
                    year: true,
                    month: true,
                    totalRevenue: true,
                    // Parking section fields needed for dashboard charts
                    parkingAdminRent: true as unknown as boolean,
                    parkingRentalIncome: true as unknown as boolean,
                    parkingProfit: true as unknown as boolean,
                    adminCommissionAmount: true,
                    rentAmount: true,
                    utilitiesAmount: true,
                    finalSettlementType: true,
                    // Pola niestandardowego podsumowania – jeśli są włączone, użyjemy ich do wykresów
                    customSummaryEnabled: true as unknown as boolean,
                    customOwnerPayout: true as unknown as boolean,
                    customHostPayout: true as unknown as boolean,
                    customIncomeTax: true as unknown as boolean,
                    customTaxBase: true as unknown as boolean,
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            paymentType: true,
                            fixedPaymentAmount: true
                        },
                    },
                    owner: {
                        select: {
                            vatOption: true
                        }
                    },
                    items: {
                        select: {
                            category: true,
                            amount: true,
                            type: true,
                            expenseCategory: true,
                            reservation: {
                                select: { source: true }
                            }
                        },
                    },
                    additionalDeductions: {
                        select: {
                            amount: true,
                            vatOption: true
                        }
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            // Funkcja pomocnicza do obliczania wartości rozliczenia
            function calculateSettlementValues(report: {
                totalRevenue: number | null;
                items: Array<{ type: string; amount: number; category: string }>;
                additionalDeductions: Array<{ amount: number; vatOption: string }>;
                rentAmount: number | null;
                utilitiesAmount: number | null;
                finalSettlementType: string | null;
                owner: { vatOption: string };
                apartment: { paymentType: string; fixedPaymentAmount: unknown };
                // Pola niestandardowego podsumowania
                customSummaryEnabled?: boolean | null;
                customOwnerPayout?: number | null;
                customHostPayout?: number | null;
                customIncomeTax?: number | null;
                customTaxBase?: number | null;
            }) {
                const totalRevenue = report.totalRevenue ?? 0;
                const totalExpenses = report.items
                    .filter((i) => ["EXPENSE", "FEE", "TAX"].includes(i.type))
                    .reduce((sum: number, i) => sum + i.amount, 0);
                const otaCommissions = report.items
                    .filter((i) => i.type === "COMMISSION")
                    .reduce((sum: number, i) => sum + i.amount, 0);

                const netIncome = totalRevenue - totalExpenses - otaCommissions + getParkingProfit(report);
                const adminCommissionAmount = netIncome * 0.25;
                const afterCommission = netIncome - adminCommissionAmount;
                const rentAndUtilities = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
                const afterRentAndUtilities = afterCommission - rentAndUtilities;

                const totalAdditionalDeductionsGross = report.additionalDeductions.reduce((sum: number, d) => {
                    const vatMultiplier = d.vatOption === "VAT_23" ? 1.23 : d.vatOption === "VAT_8" ? 1.08 : 1;
                    return sum + (d.amount * vatMultiplier);
                }, 0);

                let finalOwnerPayout = 0;
                let finalHostPayout = 0;

                // 1) Jeżeli admin włączył niestandardowe podsumowanie – używamy tych wartości wprost
                if (report.customSummaryEnabled) {
                    finalOwnerPayout = Number(report.customOwnerPayout ?? 0);
                    finalHostPayout = Number(report.customHostPayout ?? 0);
                    return { finalOwnerPayout, finalHostPayout };
                }

                if (report.finalSettlementType) {
                    let baseAmount = 0;
                    const settlementType = report.finalSettlementType;

                    if (settlementType === 'FIXED' || settlementType === 'FIXED_MINUS_UTILITIES') {
                        if (report.apartment.fixedPaymentAmount !== null && report.apartment.fixedPaymentAmount !== undefined) {
                            const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount);

                            if (settlementType === 'FIXED') {
                                baseAmount = fixedBaseAmount;
                            } else { // FIXED_MINUS_UTILITIES
                                baseAmount = fixedBaseAmount - rentAndUtilities - totalAdditionalDeductionsGross;
                            }
                        }
                    } else if (settlementType === 'COMMISSION') {
                        baseAmount = afterRentAndUtilities - totalAdditionalDeductionsGross;
                    }

                    // Obliczenia VAT
                    const vatRate = report.owner.vatOption === "VAT_23" ? 0.23 : report.owner.vatOption === "VAT_8" ? 0.08 : 0;
                    const finalVatAmount = Math.max(0, baseAmount) * vatRate;
                    finalOwnerPayout = Math.max(0, baseAmount) + finalVatAmount;

                    // Obliczanie finalHostPayout
                    const fixedAmount = report.apartment.fixedPaymentAmount ? Number(report.apartment.fixedPaymentAmount) : 0;

                    if (settlementType === 'COMMISSION') {
                        finalHostPayout = adminCommissionAmount;
                    } else if (settlementType === 'FIXED' || settlementType === 'FIXED_MINUS_UTILITIES') {
                        finalHostPayout = Math.max(0, netIncome - fixedAmount);
                    }
                }

                return { finalOwnerPayout, finalHostPayout };
            }

            // Transform data based on view type
            type ChartDataItem = {
                name: string;
                Przychód: number;
                Sprzątanie: number;
                Pranie: number;
                Tekstylia: number;
                Czynsz: number;
                Media: number;
                "Parking przychód": number;
                "Parking czynsz": number;
                "Parking zysk": number;
                "Złote Wynajmy Prowizja": number;
                "Prowizje OTA": number;
                "Dodatkowe odliczenia": number;
                "Wypłata Właściciela": number;
                "Koszty stałe": number;
                "Inne wydatki": number;
            };

            let chartData: ChartDataItem[] = [];

            if (input.viewType === 'yearly') {
                // Group by year and sum the values
                const yearlyData = new Map<number, ChartDataItem>();
                reports.forEach(report => {
                    const year = report.year;
                    if (!yearlyData.has(year)) {
                        yearlyData.set(year, {
                            name: `Rok ${year}`,
                            Przychód: 0,
                            Sprzątanie: 0,
                            Pranie: 0,
                            Tekstylia: 0,
                            Czynsz: 0,
                            Media: 0,
                            "Parking przychód": 0,
                            "Parking czynsz": 0,
                            "Parking zysk": 0,
                            "Złote Wynajmy Prowizja": 0,
                            "Prowizje OTA": 0,
                            "Dodatkowe odliczenia": 0,
                            "Wypłata Właściciela": 0,
                            "Koszty stałe": 0,
                            "Inne wydatki": 0,
                        });
                    }
                    const data = yearlyData.get(year)!;
                    // Przychód zgodnie z widokiem raportu: suma pozycji REVENUE + przychód z parkingu
                    const reportRevenue = report.items
                        .filter(i => i.type === "REVENUE")
                        .reduce((s, i) => s + i.amount, 0);
                    const parkingRevenue = safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome);
                    data.Przychód += reportRevenue + parkingRevenue;
                    data.Sprzątanie += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki")))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Pranie += report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("pranie"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Tekstylia += report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("tekstylia"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Czynsz += (report.rentAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            i.category.toLowerCase().includes("czynsz"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Media += (report.utilitiesAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0);
                    // Parking
                    data["Parking przychód"] += safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome);
                    data["Parking czynsz"] += safeNumber((report as unknown as { parkingAdminRent?: number }).parkingAdminRent);
                    data["Parking zysk"] += getParkingProfit(report);
                    // Oblicz wartości na nowo zamiast pobierać z bazy
                    const calculatedValues = calculateSettlementValues(report);
                    data["Złote Wynajmy Prowizja"] += calculatedValues.finalHostPayout;
                    data["Prowizje OTA"] += report.items.filter(i => i.type === "COMMISSION").reduce((s, i) => s + i.amount, 0);

                    data["Wypłata Właściciela"] += calculatedValues.finalOwnerPayout;
                    // Sumuj dodatkowe odliczenia (brutto)
                    data["Dodatkowe odliczenia"] += report.additionalDeductions.reduce((sum: number, d) => {
                        const vatMultiplier = d.vatOption === "VAT_23" ? 1.23 : d.vatOption === "VAT_8" ? 1.08 : 1;
                        return sum + d.amount * vatMultiplier;
                    }, 0);
                    data["Koszty stałe"] += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia")))
                        .reduce((s, i) => s + i.amount, 0);

                    // Calculate "Inne wydatki" - all EXPENSE items not classified in known categories
                    data["Inne wydatki"] += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            !(i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia") ||
                                i.category.toLowerCase().includes("czynsz") ||
                                i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0);
                });
                chartData = Array.from(yearlyData.values());
            } else if (input.viewType === 'monthly') {
                // Group by month and sum the values
                const monthlyData = new Map<string, ChartDataItem>();
                reports.forEach(report => {
                    const monthKey = `${report.year}-${report.month.toString().padStart(2, '0')}`;
                    const monthName = new Date(report.year, report.month - 1).toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
                    if (!monthlyData.has(monthKey)) {
                        monthlyData.set(monthKey, {
                            name: monthName,
                            Przychód: 0,
                            Sprzątanie: 0,
                            Pranie: 0,
                            Tekstylia: 0,
                            Czynsz: 0,
                            Media: 0,
                            "Parking przychód": 0,
                            "Parking czynsz": 0,
                            "Parking zysk": 0,
                            "Złote Wynajmy Prowizja": 0,
                            "Prowizje OTA": 0,
                            "Dodatkowe odliczenia": 0,
                            "Wypłata Właściciela": 0,
                            "Koszty stałe": 0,
                            "Inne wydatki": 0,
                        });
                    }
                    const data = monthlyData.get(monthKey)!;
                    // Przychód zgodnie z widokiem raportu: suma pozycji REVENUE + przychód z parkingu
                    const reportRevenue = report.items
                        .filter(i => i.type === "REVENUE")
                        .reduce((s, i) => s + i.amount, 0);
                    const parkingRevenue = safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome);
                    data.Przychód += reportRevenue + parkingRevenue;
                    data.Sprzątanie += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki")))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Pranie += report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("pranie"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Tekstylia += report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("tekstylia"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Czynsz += (report.rentAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            i.category.toLowerCase().includes("czynsz"))
                        .reduce((s, i) => s + i.amount, 0);
                    data.Media += (report.utilitiesAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0);
                    // Parking
                    data["Parking przychód"] += safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome);
                    data["Parking czynsz"] += safeNumber((report as unknown as { parkingAdminRent?: number }).parkingAdminRent);
                    data["Parking zysk"] += getParkingProfit(report);
                    // Oblicz wartości na nowo zamiast pobierać z bazy
                    const calculatedValues = calculateSettlementValues(report);
                    data["Złote Wynajmy Prowizja"] += calculatedValues.finalHostPayout;
                    data["Prowizje OTA"] += report.items.filter(i => i.type === "COMMISSION").reduce((s, i) => s + i.amount, 0);

                    data["Wypłata Właściciela"] += calculatedValues.finalOwnerPayout;
                    // Sumuj dodatkowe odliczenia (brutto)
                    data["Dodatkowe odliczenia"] += report.additionalDeductions.reduce((sum: number, d) => {
                        const vatMultiplier = d.vatOption === "VAT_23" ? 1.23 : d.vatOption === "VAT_8" ? 1.08 : 1;
                        return sum + d.amount * vatMultiplier;
                    }, 0);
                    data["Koszty stałe"] += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia")))
                        .reduce((s, i) => s + i.amount, 0);

                    // Calculate "Inne wydatki" - all EXPENSE items not classified in known categories
                    data["Inne wydatki"] += report.items
                        .filter(i => i.type === "EXPENSE" &&
                            !(i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia") ||
                                i.category.toLowerCase().includes("czynsz") ||
                                i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0);
                });
                chartData = Array.from(monthlyData.values()).sort((a, b) => {
                    const [yearA, monthA] = a.name.split(' ');
                    const [yearB, monthB] = b.name.split(' ');
                    if (!yearA || !monthA || !yearB || !monthB) return 0;
                    const dateA = new Date(parseInt(yearA), parseInt(monthA));
                    const dateB = new Date(parseInt(yearB), parseInt(monthB));
                    return dateA.getTime() - dateB.getTime();
                });
            } else {
                // Single report view
                chartData = reports.map(report => ({
                    name: `${report.apartment.name} - ${report.month}/${report.year}`,
                    // Przychód zgodnie z widokiem raportu: suma pozycji REVENUE + przychód z parkingu
                    Przychód: (() => {
                        const r = report.items
                            .filter(i => i.type === "REVENUE")
                            .reduce((s, i) => s + i.amount, 0);
                        const pr = safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome);
                        return r + pr;
                    })(),
                    Sprzątanie: report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki")))
                        .reduce((s, i) => s + i.amount, 0),
                    Pranie: report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("pranie"))
                        .reduce((s, i) => s + i.amount, 0),
                    Tekstylia: report.items
                        .filter(i => i.type === "EXPENSE" && i.category.toLowerCase().includes("tekstylia"))
                        .reduce((s, i) => s + i.amount, 0),
                    Czynsz: (report.rentAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            i.category.toLowerCase().includes("czynsz"))
                        .reduce((s, i) => s + i.amount, 0),
                    Media: (report.utilitiesAmount ?? 0) + report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0),
                    "Parking przychód": safeNumber((report as unknown as { parkingRentalIncome?: number }).parkingRentalIncome),
                    "Parking czynsz": safeNumber((report as unknown as { parkingAdminRent?: number }).parkingAdminRent),
                    "Parking zysk": getParkingProfit(report),
                    // Oblicz wartości na nowo zamiast pobierać z bazy
                    ...(() => {
                        const calculatedValues = calculateSettlementValues(report);
                        return {
                            "Złote Wynajmy Prowizja": calculatedValues.finalHostPayout,
                            "Prowizje OTA": report.items.filter(i => i.type === "COMMISSION").reduce((s, i) => s + i.amount, 0),
                            "Wypłata Właściciela": calculatedValues.finalOwnerPayout,
                        };
                    })(),
                    // Dodatkowe odliczenia (brutto)
                    "Dodatkowe odliczenia": report.additionalDeductions.reduce((sum: number, d) => {
                        const vatMultiplier = d.vatOption === "VAT_23" ? 1.23 : d.vatOption === "VAT_8" ? 1.08 : 1;
                        return sum + d.amount * vatMultiplier;
                    }, 0),
                    "Koszty stałe": report.items
                        .filter(i => i.type === "EXPENSE" &&
                            (i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia")))
                        .reduce((s, i) => s + i.amount, 0),
                    "Inne wydatki": report.items
                        .filter(i => i.type === "EXPENSE" &&
                            !(i.category.toLowerCase().includes("sprzątanie") ||
                                i.category.toLowerCase().includes("sprzatanie") ||
                                i.category.toLowerCase().includes("środki") ||
                                i.category.toLowerCase().includes("srodki") ||
                                i.category.toLowerCase().includes("pranie") ||
                                i.category.toLowerCase().includes("tekstylia") ||
                                i.category.toLowerCase().includes("czynsz") ||
                                i.category.toLowerCase().includes("prąd") ||
                                i.category.toLowerCase().includes("prad")))
                        .reduce((s, i) => s + i.amount, 0),
                }));
            }

            return {
                reports,
                chartData,
                apartments: await ctx.db.apartment.findMany({
                    where: {
                        ownerships: {
                            some: {
                                ownerId: owner.id,
                                isActive: true,
                            },
                        },
                    },
                    select: { id: true, name: true, slug: true },
                }),
            };
        }),

    // Owner: Get available years for filtering
    getOwnerAvailableYears: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
            apartmentId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                return [];
            }

            const whereClause: {
                ownerId: string;
                status: { in: ReportStatus[] };
                apartmentId?: number;
            } = {
                ownerId: owner.id,
                status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
            };

            if (input.apartmentId) {
                whereClause.apartmentId = input.apartmentId;
            }

            const years = await ctx.db.monthlyReport.findMany({
                where: whereClause,
                select: { year: true },
                distinct: ['year'],
                orderBy: { year: 'desc' },
            });

            return years.map(y => y.year);
        }),

    // Owner: Get available months for filtering
    getOwnerAvailableMonths: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
            apartmentId: z.number().optional(),
            year: z.number(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                return [];
            }

            const whereClause = {
                ownerId: owner.id,
                status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                year: input.year,
                ...(input.apartmentId && { apartmentId: input.apartmentId }),
            };

            const months = await ctx.db.monthlyReport.findMany({
                where: whereClause,
                select: { month: true },
                distinct: ['month'],
                orderBy: { month: 'desc' },
            });

            return months.map(m => m.month);
        }),

    // Owner: Get available reports for filtering
    getOwnerAvailableReports: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
            apartmentId: z.number().optional(),
            year: z.number().optional(),
            month: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                return [];
            }

            const whereClause = {
                ownerId: owner.id,
                status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                ...(input.apartmentId && { apartmentId: input.apartmentId }),
                ...(input.year && { year: input.year }),
                ...(input.month && { month: input.month }),
            };

            const reports = await ctx.db.monthlyReport.findMany({
                where: whereClause,
                select: {
                    id: true,
                    month: true,
                    year: true,
                    apartment: {
                        select: { name: true }
                    }
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            return reports.map(report => ({
                id: report.id,
                name: `${report.apartment.name} - ${report.month}/${report.year}`,
                month: report.month,
                year: report.year,
            }));
        }),

    // Admin: Add cleaning costs to existing report
    addCleaningCosts: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can add cleaning costs",
                });
            }

            // Get report with apartment and reservations
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: true,
                    items: {
                        where: {
                            type: ReportItemType.REVENUE,
                            isAutoGenerated: true,
                        },
                        include: {
                            reservation: {
                                select: {
                                    adults: true,
                                    children: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Report not found",
                });
            }

            // Check if cleaning costs already exist
            const existingCleaningCost = await ctx.db.reportItem.findFirst({
                where: {
                    reportId: input.reportId,
                    category: "Sprzątanie",
                    isAutoGenerated: true,
                },
            });

            // Get reservations for this report period
            const startDate = new Date(Date.UTC(report.year, report.month - 1, 1));
            const nextMonthStartDate = new Date(Date.UTC(report.year, report.month, 1));

            const reservations = await ctx.db.reservation.findMany({
                where: {
                    apartmentId: report.apartmentId,
                    end: {
                        gte: startDate,
                        lt: nextMonthStartDate,
                    },
                },
                select: {
                    adults: true,
                    children: true,
                },
            });

            // Calculate cleaning costs
            const cleaningCost = await calculateCleaningCosts(report.apartmentId, reservations, ctx);

            if (cleaningCost > 0) {
                if (existingCleaningCost) {
                    // Update existing cleaning cost
                    await ctx.db.reportItem.update({
                        where: { id: existingCleaningCost.id },
                        data: {
                            description: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservations.length} rezerwacji`,
                            amount: cleaningCost,
                            date: new Date(),
                            notes: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservations.length} rezerwacji`,
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "cleaning_costs_updated",
                            notes: `Zaktualizowano automatyczne koszty sprzątania: ${cleaningCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po aktualizacji
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, cleaningCost, reservationsCount: reservations.length, wasUpdated: true };
                } else {
                    // Create new cleaning cost
                    await ctx.db.reportItem.create({
                        data: {
                            reportId: input.reportId,
                            type: ReportItemType.EXPENSE,
                            category: "Sprzątanie",
                            description: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservations.length} rezerwacji`,
                            amount: cleaningCost,
                            currency: "PLN",
                            date: new Date(),
                            expenseCategory: ExpenseCategory.SPRZATANIE,
                            isAutoGenerated: true,
                            notes: `Usługi sprzątania apartamentu - wyliczenie na bazie ${reservations.length} rezerwacji`,
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "cleaning_costs_added",
                            notes: `Dodano automatyczne koszty sprzątania: ${cleaningCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po dodaniu
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, cleaningCost, reservationsCount: reservations.length, wasUpdated: false };
                }
            } else {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No cleaning costs to add (apartment not configured or no reservations)",
                });
            }
        }),

    // Admin: Add laundry costs to existing report
    addLaundryCosts: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can add laundry costs",
                });
            }

            // Get report
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: true,
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Report not found",
                });
            }

            // Check if laundry costs already exist
            const existingLaundryCost = await ctx.db.reportItem.findFirst({
                where: {
                    reportId: input.reportId,
                    category: "Pranie",
                    isAutoGenerated: true,
                },
            });

            // Calculate laundry costs from apartment settings
            const laundryCostPerWeek = report.apartment.weeklyLaundryCost ?? 120; // Fallback to 120 if not set
            const daysPerWeek = 7;
            const daysInMonth = new Date(report.year, report.month, 0).getDate();
            const weeksInMonth = Math.round((daysInMonth / daysPerWeek) * 100) / 100;
            const totalLaundryCost = weeksInMonth * laundryCostPerWeek;

            if (totalLaundryCost > 0) {
                if (existingLaundryCost) {
                    // Update existing laundry cost
                    await ctx.db.reportItem.update({
                        where: { id: existingLaundryCost.id },
                        data: {
                            description: "Pranie pościeli i ręczników - średnie zużycie za miesiąc",
                            amount: totalLaundryCost,
                            date: new Date(),
                            notes: "Pranie pościeli i ręczników - średnie zużycie za miesiąc",
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "laundry_costs_updated",
                            notes: `Zaktualizowano automatyczne koszty prania: ${totalLaundryCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po aktualizacji
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, laundryCost: totalLaundryCost, weeksInMonth, wasUpdated: true };
                } else {
                    // Create new laundry cost
                    await ctx.db.reportItem.create({
                        data: {
                            reportId: input.reportId,
                            type: ReportItemType.EXPENSE,
                            category: "Pranie",
                            description: "Pranie pościeli i ręczników - średnie zużycie za miesiąc",
                            amount: totalLaundryCost,
                            currency: "PLN",
                            date: new Date(),
                            expenseCategory: ExpenseCategory.PRANIE,
                            isAutoGenerated: true,
                            notes: "Pranie pościeli i ręczników - średnie zużycie za miesiąc",
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "laundry_costs_added",
                            notes: `Dodano automatyczne koszty prania: ${totalLaundryCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po dodaniu
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, laundryCost: totalLaundryCost, weeksInMonth, wasUpdated: false };
                }
            } else {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No laundry costs to add",
                });
            }
        }),

    // Admin: Add textile costs to existing report
    addTextileCosts: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can add textile costs",
                });
            }

            // Get report with reservations
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: true,
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Report not found",
                });
            }

            // Check if textile costs already exist
            const existingTextileCost = await ctx.db.reportItem.findFirst({
                where: {
                    reportId: input.reportId,
                    category: "Tekstylia",
                    isAutoGenerated: true,
                },
            });

            // Get reservations for this report period
            const startDate = new Date(Date.UTC(report.year, report.month - 1, 1));
            const nextMonthStartDate = new Date(Date.UTC(report.year, report.month, 1));

            const reservations = await ctx.db.reservation.findMany({
                where: {
                    apartmentId: report.apartmentId,
                    end: {
                        gte: startDate,
                        lt: nextMonthStartDate,
                    },
                },
            });

            // Calculate textile costs from apartment settings
            const totalTextileCost = await calculateTextileCosts(report.apartmentId, reservations, ctx);

            if (totalTextileCost > 0) {
                if (existingTextileCost) {
                    // Update existing textile cost
                    await ctx.db.reportItem.update({
                        where: { id: existingTextileCost.id },
                        data: {
                            description: "Tekstylia, wino i środki czystości - koszt stały + kapsułki na gość",
                            amount: totalTextileCost,
                            date: new Date(),
                            notes: "Tekstylia, wino i środki czystości - koszt stały + kapsułki na gość",
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "textile_costs_updated",
                            notes: `Zaktualizowano automatyczne koszty tekstyliów: ${totalTextileCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po aktualizacji
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, textileCost: totalTextileCost, reservationsCount: reservations.length, wasUpdated: true };
                } else {
                    // Create new textile cost
                    await ctx.db.reportItem.create({
                        data: {
                            reportId: input.reportId,
                            type: ReportItemType.EXPENSE,
                            category: "Tekstylia",
                            description: "Tekstylia, wino i środki czystości - koszt stały + kapsułki na gość",
                            amount: totalTextileCost,
                            currency: "PLN",
                            date: new Date(),
                            expenseCategory: "TEKSTYLIA" as ExpenseCategory,
                            isAutoGenerated: true,
                            notes: "Tekstylia, wino i środki czystości - koszt stały + kapsułki na gość",
                        },
                    });

                    // Add history entry
                    await ctx.db.reportHistory.create({
                        data: {
                            reportId: input.reportId,
                            adminId: ctx.session.user.id,
                            action: "textile_costs_added",
                            notes: `Dodano automatyczne koszty tekstyliów: ${totalTextileCost} PLN`,
                        },
                    });

                    // Natychmiastowa rekalkulacja po dodaniu
                    await recalculateReportSettlement(input.reportId, ctx);

                    return { success: true, textileCost: totalTextileCost, reservationsCount: reservations.length, wasUpdated: false };
                }
            } else {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "No textile costs to add (no reservations)",
                });
            }
        }),

    // Owner: Get income tax history with aggregation levels
    getOwnerIncomeTaxHistory: publicProcedure
        .input(z.object({
            ownerEmail: z.string().email(),
            aggregation: z.enum(["report", "monthly", "yearly"]).default("report"),
            year: z.number().optional(),
            apartmentId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.ownerEmail },
            });

            if (!owner?.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Owner not found or inactive",
                });
            }

            const whereClause = {
                ownerId: owner.id,
                status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                ...(input.year && { year: input.year }),
                ...(input.apartmentId && { apartmentId: input.apartmentId }),
            };

            const reports = await ctx.db.monthlyReport.findMany({
                where: whereClause,
                include: {
                    apartment: {
                        select: { id: true, name: true, slug: true },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                ],
            });

            if (input.aggregation === "report") {
                // Per report view
                return {
                    aggregation: "report" as const,
                    data: reports.map(report => ({
                        id: report.id,
                        apartmentName: report.apartment.name,
                        month: report.month,
                        year: report.year,
                        totalRevenue: report.totalRevenue ?? 0,
                        finalOwnerPayout: report.finalOwnerPayout ? Number(report.finalOwnerPayout) : 0,
                        finalIncomeTax: report.finalIncomeTax ? Number(report.finalIncomeTax) : 0,
                        taxRate: 8.5, // 8.5% tax rate
                        status: report.status,
                        sentAt: report.sentAt,
                    })),
                    totals: {
                        totalRevenue: reports.reduce((sum, r) => sum + (r.totalRevenue ?? 0), 0),
                        totalPayout: reports.reduce((sum, r) => sum + (r.finalOwnerPayout ? Number(r.finalOwnerPayout) : 0), 0),
                        totalTax: reports.reduce((sum, r) => sum + (r.finalIncomeTax ? Number(r.finalIncomeTax) : 0), 0),
                    }
                };
            } else if (input.aggregation === "monthly") {
                // Per month aggregation
                const monthlyData = new Map<string, {
                    month: number;
                    year: number;
                    reportsCount: number;
                    totalRevenue: number;
                    totalPayout: number;
                    totalTax: number;
                    apartments: Set<string>;
                }>();

                reports.forEach(report => {
                    const key = `${report.year}-${report.month}`;
                    if (!monthlyData.has(key)) {
                        monthlyData.set(key, {
                            month: report.month,
                            year: report.year,
                            reportsCount: 0,
                            totalRevenue: 0,
                            totalPayout: 0,
                            totalTax: 0,
                            apartments: new Set(),
                        });
                    }
                    const data = monthlyData.get(key)!;
                    data.reportsCount++;
                    data.totalRevenue += report.totalRevenue ?? 0;
                    data.totalPayout += report.finalOwnerPayout ? Number(report.finalOwnerPayout) : 0;
                    data.totalTax += report.finalIncomeTax ? Number(report.finalIncomeTax) : 0;
                    data.apartments.add(report.apartment.name);
                });

                return {
                    aggregation: "monthly" as const,
                    data: Array.from(monthlyData.values()).map(item => ({
                        ...item,
                        apartments: Array.from(item.apartments),
                        averageTaxRate: item.totalRevenue > 0 ? (item.totalTax / item.totalRevenue * 100) : 0,
                    })).sort((a, b) => b.year - a.year || b.month - a.month),
                    totals: {
                        totalRevenue: Array.from(monthlyData.values()).reduce((sum, item) => sum + item.totalRevenue, 0),
                        totalPayout: Array.from(monthlyData.values()).reduce((sum, item) => sum + item.totalPayout, 0),
                        totalTax: Array.from(monthlyData.values()).reduce((sum, item) => sum + item.totalTax, 0),
                    }
                };
            } else {
                // Per year aggregation
                const yearlyData = new Map<number, {
                    year: number;
                    reportsCount: number;
                    monthsCount: number;
                    totalRevenue: number;
                    totalPayout: number;
                    totalTax: number;
                    apartments: Set<string>;
                    months: Set<number>;
                }>();

                reports.forEach(report => {
                    const year = report.year;
                    if (!yearlyData.has(year)) {
                        yearlyData.set(year, {
                            year,
                            reportsCount: 0,
                            monthsCount: 0,
                            totalRevenue: 0,
                            totalPayout: 0,
                            totalTax: 0,
                            apartments: new Set(),
                            months: new Set(),
                        });
                    }
                    const data = yearlyData.get(year)!;
                    data.reportsCount++;
                    data.totalRevenue += report.totalRevenue ?? 0;
                    data.totalPayout += report.finalOwnerPayout ? Number(report.finalOwnerPayout) : 0;
                    data.totalTax += report.finalIncomeTax ? Number(report.finalIncomeTax) : 0;
                    data.apartments.add(report.apartment.name);
                    data.months.add(report.month);
                });

                return {
                    aggregation: "yearly" as const,
                    data: Array.from(yearlyData.values()).map(item => ({
                        ...item,
                        monthsCount: item.months.size,
                        apartments: Array.from(item.apartments),
                        averageTaxRate: item.totalRevenue > 0 ? (item.totalTax / item.totalRevenue * 100) : 0,
                    })).sort((a, b) => b.year - a.year),
                    totals: {
                        totalRevenue: Array.from(yearlyData.values()).reduce((sum, item) => sum + item.totalRevenue, 0),
                        totalPayout: Array.from(yearlyData.values()).reduce((sum, item) => sum + item.totalPayout, 0),
                        totalTax: Array.from(yearlyData.values()).reduce((sum, item) => sum + item.totalTax, 0),
                    }
                };
            }
        }),

    // Admin: Get all historical reports with filters
    getAllHistorical: protectedProcedure
        .input(z.object({
            apartmentId: z.number().optional(),
            ownerId: z.string().optional(),
            year: z.number().optional(),
            month: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view historical reports",
                });
            }

            const historicalReports = await ctx.db.historicalReport.findMany({
                where: {
                    apartmentId: input.apartmentId,
                    ownerId: input.ownerId,
                    year: input.year,
                    month: input.month,
                },
                include: {
                    apartment: {
                        select: { id: true, name: true, address: true },
                    },
                    owner: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    createdByAdmin: {
                        select: { name: true, email: true },
                    },
                    approvedByAdmin: {
                        select: { name: true, email: true },
                    },
                    deletedByAdmin: {
                        select: { name: true, email: true },
                    },
                    items: {
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true },
                            },
                        },
                    },
                    _count: {
                        select: { items: true },
                    },
                },
                orderBy: [
                    { year: "desc" },
                    { month: "desc" },
                    { createdAt: "desc" },
                ],
            });

            return historicalReports;
        }),

    // Admin: Get single historical report details
    getHistoricalById: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view historical report details",
                });
            }

            const report = await ctx.db.historicalReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            defaultRentAmount: true,
                            defaultUtilitiesAmount: true,
                            weeklyLaundryCost: true,
                            cleaningSuppliesCost: true,
                            capsuleCostPerGuest: true,
                            wineCost: true,
                            cleaningCosts: true,
                            paymentType: true,
                            fixedPaymentAmount: true
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            vatOption: true,
                        },
                    },
                    createdByAdmin: {
                        select: { name: true, email: true },
                    },
                    approvedByAdmin: {
                        select: { name: true, email: true },
                    },
                    sentByAdmin: {
                        select: { name: true, email: true },
                    },
                    deletedByAdmin: {
                        select: { name: true, email: true },
                    },
                    items: {
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true, source: true, adults: true, children: true, status: true },
                            },
                        },
                        orderBy: [{ type: "asc" }, { date: "asc" }],
                    },
                    additionalDeductions: {
                        orderBy: { order: "asc" },
                    },
                },
            });

            if (!report) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Historyczny raport nie został znaleziony",
                });
            }

            return report;
        }),
});

// Eksport funkcji do testów
export { recalculateReportSettlement };