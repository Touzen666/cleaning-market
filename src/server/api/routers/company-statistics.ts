import { z } from "zod";
import { ReportStatus, UserType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
    buildCommissionBalance,
    formatMonthLabel,
    getHostPayoutFromSummary,
    isMonthInRange,
    monthKey,
    type MonthlyCommissionEntry,
} from "@/lib/company-statistics";

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2100);

const finalizedReportStatuses = [
    ReportStatus.APPROVED,
    ReportStatus.SENT,
    ReportStatus.AGREEMENT_SETTLED,
    ReportStatus.AGREEMENT_TERMINATION,
] as const;

export const companyStatisticsRouter = createTRPCRouter({
    getApartmentCommissionBalance: protectedProcedure
        .input(
            z
                .object({
                    apartmentId: z.number().int().positive(),
                    startYear: yearSchema,
                    startMonth: monthSchema,
                    endYear: yearSchema,
                    endMonth: monthSchema,
                })
                .refine(
                    (input) => {
                        const start = input.startYear * 12 + input.startMonth;
                        const end = input.endYear * 12 + input.endMonth;
                        return start <= end;
                    },
                    {
                        message: "Data początkowa nie może być późniejsza niż końcowa",
                    },
                ),
        )
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla administratora",
                });
            }

            const apartment = await ctx.db.apartment.findUnique({
                where: { id: input.apartmentId },
                select: { id: true, name: true, slug: true },
            });

            if (!apartment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Apartament nie został znaleziony",
                });
            }

            const [activeReports, historicalReports] = await Promise.all([
                ctx.db.monthlyReport.findMany({
                    where: {
                        apartmentId: input.apartmentId,
                        status: { in: [...finalizedReportStatuses] },
                    },
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        netIncome: true,
                        adminCommissionAmount: true,
                        finalHostPayout: true,
                        finalSettlementType: true,
                        fixedPayoutProrateEnabled: true,
                        fixedPayoutActiveDays: true,
                        customSummaryEnabled: true,
                        customHostPayout: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                    },
                }),
                ctx.db.historicalReport.findMany({
                    where: {
                        apartmentId: input.apartmentId,
                    },
                    select: {
                        id: true,
                        year: true,
                        month: true,
                        finalHostPayout: true,
                    },
                }),
            ]);

            const monthlyMap = new Map<string, MonthlyCommissionEntry>();

            const addCommission = (
                year: number,
                month: number,
                commission: number,
            ) => {
                if (
                    !isMonthInRange(
                        year,
                        month,
                        input.startYear,
                        input.startMonth,
                        input.endYear,
                        input.endMonth,
                    )
                ) {
                    return;
                }

                const key = monthKey(year, month);
                const existing = monthlyMap.get(key);

                if (existing) {
                    existing.commission += commission;
                    existing.reportCount += 1;
                    return;
                }

                monthlyMap.set(key, {
                    year,
                    month,
                    label: formatMonthLabel(year, month),
                    commission,
                    reportCount: 1,
                });
            };

            for (const report of activeReports) {
                const commission = getHostPayoutFromSummary(report);
                addCommission(report.year, report.month, commission);
            }

            for (const report of historicalReports) {
                const commission = Number(report.finalHostPayout ?? 0);
                addCommission(report.year, report.month, commission);
            }

            const balance = buildCommissionBalance([...monthlyMap.values()]);

            return {
                apartment,
                period: {
                    startYear: input.startYear,
                    startMonth: input.startMonth,
                    endYear: input.endYear,
                    endMonth: input.endMonth,
                    startLabel: formatMonthLabel(input.startYear, input.startMonth),
                    endLabel: formatMonthLabel(input.endYear, input.endMonth),
                },
                ...balance,
            };
        }),
});
