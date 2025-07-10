import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Decimal } from "@prisma/client/runtime/library";
import { ReportStatus, ReportItemType, PaymentType, VATOption, UserType, ExpenseCategory, ReservationPortal } from "@prisma/client";

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
        ExpenseCategory.SRODKI_CZYSTOSCI
    ]).optional(),
    portal: z.enum([
        ReservationPortal.BOOKING,
        ReservationPortal.AIRBNB,
        ReservationPortal.IDOBOOKING,
        ReservationPortal.CHANEL_MANAGER
    ]).optional(),
});

const updateReportStatusSchema = z.object({
    reportId: z.string().uuid(),
    status: z.enum([ReportStatus.DRAFT, ReportStatus.REVIEW, ReportStatus.APPROVED, ReportStatus.SENT]),
    notes: z.string().optional(),
});

// Helper function to calculate owner payout amount
function calculateOwnerPayout(
    netIncome: number,
    paymentType: PaymentType,
    fixedPaymentAmount: Decimal | null,
    vatOption: VATOption
): number {
    let baseAmount = 0;

    if (paymentType === PaymentType.FIXED_AMOUNT && fixedPaymentAmount) {
        baseAmount = Number(fixedPaymentAmount);
    } else if (paymentType === PaymentType.COMMISSION) {
        // For commission, we'll calculate it based on net income
        // This can be customized with commission percentages in the future
        baseAmount = netIncome; // For now, owner gets all net income
    }

    // Apply VAT if applicable
    switch (vatOption) {
        case VATOption.VAT_8:
            return baseAmount * 1.08;
        case VATOption.VAT_23:
            return baseAmount * 1.23;
        case VATOption.NO_VAT:
        default:
            return baseAmount;
    }
}

export const monthlyReportsRouter = createTRPCRouter({
    // Admin: Get all reports with filters
    getAll: protectedProcedure
        .input(z.object({
            apartmentId: z.number().optional(),
            ownerId: z.string().optional(),
            status: z.enum([ReportStatus.DRAFT, ReportStatus.REVIEW, ReportStatus.APPROVED, ReportStatus.SENT]).optional(),
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

            // Zgodnie z nowymi zasadami, raport za dany miesiąc uwzględnia tylko
            // rezerwacje, które KOŃCZĄ SIĘ w tym miesiącu.
            // Używamy >= startDate i < nextMonthStartDate, aby uniknąć problemów
            // ze strefami czasowymi i godziną zakończenia rezerwacji (np. 23:59).
            const reservations = await ctx.db.reservation.findMany({
                where: {
                    apartmentId,
                    end: {
                        gte: startDate,
                        lt: nextMonthStartDate, // Używamy "less than" startu kolejnego miesiąca
                    },
                },
            });

            // Create report
            const report = await ctx.db.monthlyReport.create({
                data: {
                    apartmentId,
                    ownerId: owner.id,
                    year,
                    month,
                    createdByAdminId: ctx.session.user.id,
                    status: ReportStatus.DRAFT,
                },
            });

            // Auto-generate revenue items from reservations
            const revenueItems = reservations.map((reservation) => ({
                reportId: report.id,
                type: ReportItemType.REVENUE,
                category: "Booking",
                description: `Rezerwacja - ${reservation.guest}`,
                amount: reservation.rateCorrection ?? reservation.paymantValue,
                currency: reservation.currency ?? "PLN",
                date: reservation.start,
                reservationId: reservation.id,
                isAutoGenerated: true,
            }));

            if (revenueItems.length > 0) {
                await ctx.db.reportItem.createMany({
                    data: revenueItems,
                });
            }

            // Calculate totals
            const totalRevenue = revenueItems.reduce((sum, item) => sum + item.amount, 0);

            await ctx.db.monthlyReport.update({
                where: { id: report.id },
                data: {
                    totalRevenue,
                    netIncome: totalRevenue,
                },
            });

            // Add history entry
            await ctx.db.reportHistory.create({
                data: {
                    reportId: report.id,
                    adminId: ctx.session.user.id,
                    action: "created",
                    newStatus: ReportStatus.DRAFT,
                    notes: `Raport utworzony automatycznie z ${reservations.length} rezerwacjami`,
                },
            });

            return { success: true, reportId: report.id };
        }),

    // Admin: Get single report details
    getById: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view report details",
                });
            }

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            address: true,
                            defaultRentAmount: true,
                            defaultUtilitiesAmount: true
                        },
                    },
                    owner: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            paymentType: true,
                            fixedPaymentAmount: true,
                            vatOption: true,
                        },
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
                                select: { id: true, guest: true, start: true, end: true, source: true },
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
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Raport nie został znaleziony",
                });
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
                },
            });



            return {
                ...report,
                finalSettlementType: report.finalSettlementType,
                // Dodaj sugerowane wartości
                suggestedRent: lastApprovedReport?.rentAmount ?? report.apartment.defaultRentAmount ?? 0,
                suggestedUtilities: lastApprovedReport?.utilitiesAmount ?? report.apartment.defaultUtilitiesAmount ?? 0,
            };
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

            // Recalculate totals
            const allItems = await ctx.db.reportItem.findMany({
                where: { reportId },
            });

            const totalRevenue = allItems
                .filter((item) => item.type === ReportItemType.REVENUE)
                .reduce((sum, item) => sum + item.amount, 0);

            const totalExpenses = allItems
                .filter((item) => ([ReportItemType.EXPENSE, ReportItemType.FEE, ReportItemType.TAX, ReportItemType.COMMISSION] as string[]).includes(item.type as string))
                .reduce((sum, item) => sum + item.amount, 0);

            const netIncome = totalRevenue - totalExpenses;

            // Get owner information for payout calculation
            const reportWithOwner = await ctx.db.monthlyReport.findUnique({
                where: { id: reportId },
                include: {
                    owner: {
                        select: {
                            paymentType: true,
                            fixedPaymentAmount: true,
                            vatOption: true,
                        },
                    },
                },
            });

            const ownerPayoutAmount = reportWithOwner?.owner
                ? calculateOwnerPayout(
                    netIncome,
                    reportWithOwner.owner.paymentType,
                    reportWithOwner.owner.fixedPaymentAmount,
                    reportWithOwner.owner.vatOption
                )
                : 0;

            await ctx.db.monthlyReport.update({
                where: { id: reportId },
                data: {
                    totalRevenue,
                    totalExpenses,
                    netIncome,
                    ownerPayoutAmount,
                },
            });

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

            return { success: true };
        }),

    // Admin: Delete a report item
    deleteReportItem: protectedProcedure
        .input(z.object({
            reportItemId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete report items.",
                });
            }

            const { reportItemId } = input;

            // Find the item to get the reportId and check its status
            const itemToDelete = await ctx.db.reportItem.findUnique({
                where: { id: reportItemId },
                include: { report: true },
            });

            if (!itemToDelete) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Report item not found.",
                });
            }

            // Prevent deletion if the report is approved or sent
            if (itemToDelete.report.status === ReportStatus.APPROVED || itemToDelete.report.status === ReportStatus.SENT) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Cannot delete items from an approved or sent report.",
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
                where: { id: reportItemId },
            });

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
                include: {
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
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true, source: true },
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

            return reports;
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

            return { success: true };
        }),

    // Owner: Get single report by ID (if approved/sent and owner is active)
    getOwnerReportById: publicProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    apartment: { select: { id: true, name: true, address: true } },
                    owner: { select: { id: true, isActive: true, paymentType: true, fixedPaymentAmount: true, vatOption: true } },
                    items: {
                        include: {
                            reservation: {
                                select: { id: true, guest: true, start: true, end: true, source: true },
                            },
                        },
                        orderBy: [{ type: "asc" }, { date: "asc" }],
                    },
                    additionalDeductions: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });
            if (!report?.owner?.isActive || !([ReportStatus.APPROVED, ReportStatus.SENT] as string[]).includes(report.status as string)) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Raport nie został znaleziony lub nie jest dostępny." });
            }

            // Wyliczenia identyczne jak w panelu admina
            const revenueItems = report.items.filter((i) => i.type === "REVENUE");
            const expenseItems = report.items.filter((i) => ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(i.type));
            const totalRevenue = revenueItems.reduce((sum, i) => sum + i.amount, 0);
            const totalExpenses = expenseItems.reduce((sum, i) => sum + i.amount, 0);
            const netIncome = totalRevenue - totalExpenses;
            const adminCommissionRate = 0.25;
            const commissionNetBase = Number((netIncome - netIncome * adminCommissionRate).toFixed(2));
            const commissionVat = report.owner.vatOption === "VAT_23" ? Number((commissionNetBase * 0.23).toFixed(2)) : report.owner.vatOption === "VAT_8" ? Number((commissionNetBase * 0.08).toFixed(2)) : 0;
            const commissionGross = Number((commissionNetBase + commissionVat).toFixed(2));

            // SUMA DODATKOWYCH ODPISÓW (netto)
            const totalAdditionalDeductions = (report.additionalDeductions ?? []).reduce((sum, d) => sum + d.amount, 0);

            let fixedNetBase: number | undefined = undefined;
            let fixedVat: number | undefined = undefined;
            let fixedGross: number | undefined = undefined;
            let fixedMinusUtilitiesNetBase: number | undefined = undefined;
            let fixedMinusUtilitiesVat: number | undefined = undefined;
            let fixedMinusUtilitiesGross: number | undefined = undefined;

            if (report.owner.fixedPaymentAmount !== null && report.owner.fixedPaymentAmount !== undefined) {
                fixedNetBase = Number(report.owner.fixedPaymentAmount) - totalAdditionalDeductions;
                fixedVat = report.owner.vatOption === "VAT_23" ? Number((fixedNetBase * 0.23).toFixed(2)) : report.owner.vatOption === "VAT_8" ? Number((fixedNetBase * 0.08).toFixed(2)) : 0;
                fixedGross = Number((fixedNetBase + fixedVat).toFixed(2));
                if (report.utilitiesAmount !== null && report.utilitiesAmount !== undefined) {
                    fixedMinusUtilitiesNetBase = Number((fixedNetBase - report.utilitiesAmount).toFixed(2));
                    fixedMinusUtilitiesVat = report.owner.vatOption === "VAT_23" ? Number((fixedMinusUtilitiesNetBase * 0.23).toFixed(2)) : report.owner.vatOption === "VAT_8" ? Number((fixedMinusUtilitiesNetBase * 0.08).toFixed(2)) : 0;
                    fixedMinusUtilitiesGross = Number((fixedMinusUtilitiesNetBase + fixedMinusUtilitiesVat).toFixed(2));
                }
            }

            // Dodatkowe obliczenia dla podsumowania
            const adminCommissionAmount = netIncome * adminCommissionRate;
            const afterCommission = netIncome - adminCommissionAmount;
            const rentAndUtilitiesTotal = (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
            const afterRentAndUtilities = afterCommission - rentAndUtilitiesTotal;

            // Nowe: kwota prowizyjna po odjęciu czynszu i mediów ORAZ dodatkowych odliczeń
            const commissionNetBaseAfterUtilities = commissionNetBase - rentAndUtilitiesTotal - totalAdditionalDeductions;
            const commissionVatAfterUtilities = report.owner.vatOption === "VAT_23"
                ? Number((commissionNetBaseAfterUtilities * 0.23).toFixed(2))
                : report.owner.vatOption === "VAT_8"
                    ? Number((commissionNetBaseAfterUtilities * 0.08).toFixed(2))
                    : 0;
            const commissionGrossAfterUtilities = Number((commissionNetBaseAfterUtilities + commissionVatAfterUtilities).toFixed(2));

            return {
                ...report,
                finalSettlementType: report.finalSettlementType,
                commissionNetBase,
                commissionVat,
                commissionGross,
                fixedNetBase,
                fixedVat,
                fixedGross,
                fixedMinusUtilitiesNetBase,
                fixedMinusUtilitiesVat,
                fixedMinusUtilitiesGross,
                adminCommissionAmount,
                afterCommission,
                afterRentAndUtilities,
                commissionNetBaseAfterUtilities,
                commissionVatAfterUtilities,
                commissionGrossAfterUtilities,
                additionalDeductions: report.additionalDeductions,
                totalAdditionalDeductions,
            };
        }),

    // Admin: Delete report by ID
    deleteReport: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete reports",
                });
            }
            // Usuń powiązane rekordy (items, history)
            await ctx.db.reportItem.deleteMany({ where: { reportId: input.reportId } });
            await ctx.db.reportHistory.deleteMany({ where: { reportId: input.reportId } });
            // Usuń raport
            await ctx.db.monthlyReport.delete({ where: { id: input.reportId } });
            return { success: true };
        }),

    setFinalSettlementType: protectedProcedure
        .input(z.object({
            reportId: z.string().uuid(),
            finalSettlementType: z.enum(["COMMISSION", "FIXED", "FIXED_MINUS_UTILITIES"]),
        }))
        .mutation(async ({ input, ctx }) => {
            // (opcjonalnie: sprawdź uprawnienia admina)
            await ctx.db.monthlyReport.update({
                where: { id: input.reportId },
                data: { finalSettlementType: input.finalSettlementType },
            });
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

            return updatedDeduction;
        }),

    deleteAdditionalDeduction: protectedProcedure
        .input(z.object({
            deductionId: z.string().uuid(),
        }))
        .mutation(async ({ input, ctx }) => {
            await ctx.db.additionalDeduction.delete({
                where: { id: input.deductionId },
            });
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

            return { success: true };
        }),
}); 