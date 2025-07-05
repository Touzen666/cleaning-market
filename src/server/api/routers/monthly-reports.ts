import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Decimal } from "@prisma/client/runtime/library";

// Zod schemas
const createReportSchema = z.object({
    apartmentId: z.number(),
    year: z.number().min(2020).max(2030),
    month: z.number().min(1).max(12),
});

const addReportItemSchema = z.object({
    reportId: z.string().uuid(),
    type: z.enum(["REVENUE", "EXPENSE", "FEE", "TAX", "COMMISSION"]),
    category: z.string().min(1),
    description: z.string().min(1),
    amount: z.number(),
    date: z.date(),
    notes: z.string().optional(),
    reservationId: z.number().optional(),
});

const updateReportStatusSchema = z.object({
    reportId: z.string().uuid(),
    status: z.enum(["DRAFT", "REVIEW", "APPROVED", "SENT"]),
    notes: z.string().optional(),
});

// Helper function to calculate owner payout amount
function calculateOwnerPayout(
    netIncome: number,
    paymentType: "COMMISSION" | "FIXED_AMOUNT",
    fixedPaymentAmount: Decimal | null,
    vatOption: "NO_VAT" | "VAT_8" | "VAT_23"
): number {
    let baseAmount = 0;

    if (paymentType === "FIXED_AMOUNT" && fixedPaymentAmount) {
        baseAmount = Number(fixedPaymentAmount);
    } else if (paymentType === "COMMISSION") {
        // For commission, we'll calculate it based on net income
        // This can be customized with commission percentages in the future
        baseAmount = netIncome; // For now, owner gets all net income
    }

    // Apply VAT if applicable
    switch (vatOption) {
        case "VAT_8":
            return baseAmount * 1.08;
        case "VAT_23":
            return baseAmount * 1.23;
        case "NO_VAT":
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
            status: z.enum(["DRAFT", "REVIEW", "APPROVED", "SENT"]).optional(),
            year: z.number().optional(),
            month: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
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

            return reports;
        }),

    // Admin: Create new monthly report
    create: protectedProcedure
        .input(createReportSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
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

            // Get reservations for this month to auto-generate revenue items
            const startDate = new Date(year, month - 1, 1); // pierwszy dzień miesiąca
            const endDate = new Date(year, month, 0, 23, 59, 59); // ostatni dzień miesiąca, 23:59:59

            // Uwzględniamy rezerwacje które:
            // 1. Zaczynają się w tym miesiącu LUB
            // 2. Kończą się w tym miesiącu LUB  
            // 3. Trwają przez cały miesiąc (start przed, end po)
            const reservations = await ctx.db.reservation.findMany({
                where: {
                    apartmentId,
                    OR: [
                        // Zaczyna się w tym miesiącu
                        {
                            start: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                        // Kończy się w tym miesiącu
                        {
                            end: {
                                gte: startDate,
                                lte: endDate,
                            },
                        },
                        // Trwa przez cały miesiąc (start przed, end po)
                        {
                            AND: [
                                { start: { lt: startDate } },
                                { end: { gt: endDate } },
                            ],
                        },
                    ],
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
                    status: "DRAFT",
                },
            });

            // Auto-generate revenue items from reservations
            const revenueItems = reservations.map((reservation) => ({
                reportId: report.id,
                type: "REVENUE" as const,
                category: "Booking",
                description: `Rezerwacja - ${reservation.guest}`,
                amount: reservation.paymantValue,
                currency: reservation.currency,
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
                    newStatus: "DRAFT",
                    notes: `Raport utworzony automatycznie z ${reservations.length} rezerwacjami`,
                },
            });

            return { success: true, reportId: report.id };
        }),

    // Admin: Get single report details
    getById: protectedProcedure
        .input(z.object({ reportId: z.string().uuid() }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
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
                    status: "SENT",
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
                // Dodaj sugerowane wartości
                suggestedRent: lastApprovedReport?.rentAmount ?? report.apartment.defaultRentAmount ?? 0,
                suggestedUtilities: lastApprovedReport?.utilitiesAmount ?? report.apartment.defaultUtilitiesAmount ?? 0,
            };
        }),

    // Admin: Add item to report
    addItem: protectedProcedure
        .input(addReportItemSchema)
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
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

            if (report.status === "SENT") {
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
                .filter((item) => item.type === "REVENUE")
                .reduce((sum, item) => sum + item.amount, 0);

            const totalExpenses = allItems
                .filter((item) => ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(item.type))
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
            if (ctx.session.user.type !== "ADMIN") {
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
            const updateData = { status } as {
                status: string;
                approvedAt?: Date;
                approvedByAdminId?: string;
                sentAt?: Date;
            };

            if (status === "APPROVED") {
                updateData.approvedAt = new Date();
                updateData.approvedByAdminId = ctx.session.user.id;
            } else if (status === "SENT") {
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
                    action: status === "APPROVED" ? "approved" : status === "SENT" ? "sent" : "updated",
                    previousStatus,
                    newStatus: status,
                    notes,
                },
            });

            return { success: true };
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
                    status: { in: ["APPROVED", "SENT"] },
                },
                include: {
                    apartment: {
                        select: { id: true, name: true, address: true },
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
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view suggested commissions",
                });
            }

            const report = await ctx.db.monthlyReport.findUnique({
                where: { id: input.reportId },
                include: {
                    items: {
                        where: { type: "REVENUE" },
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
                    type: "COMMISSION",
                },
            });

            const existingChannels = new Set(
                existingCommissions.map((item) => item.category.toLowerCase())
            );

            // Generate suggested commission items for channels that don't have commissions yet
            const suggestions = Array.from(channelsMap.entries())
                .filter(([channel]) => !existingChannels.has(channel.toLowerCase()))
                .map(([channel, totalRevenue]) => ({
                    type: "COMMISSION" as const,
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
}); 