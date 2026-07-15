import { z } from "zod";
import { ReportStatus, UserType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";
import {
    buildCommissionBalance,
    calculateFixedAmountAdjustment,
    formatMonthLabel,
    getHostPayoutFromSummary,
    isFixedPaymentApartment,
    isFixedSettlementType,
    isMonthInRange,
    monthKey,
    type MonthlyCommissionEntry,
} from "@/lib/company-statistics";

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2100);

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
                    /** Docelowy zysk ZW przy korekcie kwoty stałej (domyślnie 550 PLN). */
                    targetProfit: z.number().default(550),
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
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    paymentType: true,
                    fixedPaymentAmount: true,
                },
            });

            if (!apartment) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Apartament nie został znaleziony",
                });
            }

            // Wszystkie raporty oprócz DELETED — szkice też mają „Prowizję Złote Wynajmy”
            // w podsumowaniu (np. 12/2025, 04–06/2026 przy liczeniu ręcznym).
            const [activeReports, historicalReports] = await Promise.all([
                ctx.db.monthlyReport.findMany({
                    where: {
                        apartmentId: input.apartmentId,
                        status: { not: ReportStatus.DELETED },
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
                        netIncome: true,
                        adminCommissionAmount: true,
                        finalHostPayout: true,
                        finalSettlementType: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                    },
                }),
            ]);

            const monthlyMap = new Map<string, MonthlyCommissionEntry>();
            const monthsWithActiveReports = new Set<string>();
            let fixedWeight = 0;
            let fixedMonthCount = 0;

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

            const trackFixedWeight = (
                year: number,
                month: number,
                settlementType: string | null | undefined,
                customSummaryEnabled: boolean | null | undefined,
                prorateEnabled: boolean | null | undefined,
                activeDays: number | null | undefined,
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
                if (customSummaryEnabled) return;
                if (!isFixedSettlementType(settlementType)) return;

                const weight = getFixedPayoutProrateFactor(
                    year,
                    month,
                    prorateEnabled,
                    activeDays,
                );
                fixedWeight += weight;
                fixedMonthCount += 1;
            };

            for (const report of activeReports) {
                const key = monthKey(report.year, report.month);
                monthsWithActiveReports.add(key);
                addCommission(
                    report.year,
                    report.month,
                    getHostPayoutFromSummary(report),
                );
                trackFixedWeight(
                    report.year,
                    report.month,
                    report.finalSettlementType,
                    report.customSummaryEnabled,
                    report.fixedPayoutProrateEnabled,
                    report.fixedPayoutActiveDays,
                );
            }

            // Historyczne tylko gdy nie ma już aktywnego raportu za ten miesiąc
            // (unikamy podwójnego zliczenia po re-archiwizacji / nowym raporcie).
            for (const report of historicalReports) {
                const key = monthKey(report.year, report.month);
                if (monthsWithActiveReports.has(key)) {
                    continue;
                }

                addCommission(
                    report.year,
                    report.month,
                    getHostPayoutFromSummary({
                        ...report,
                        fixedPayoutProrateEnabled: null,
                        fixedPayoutActiveDays: null,
                        customSummaryEnabled: false,
                        customHostPayout: null,
                    }),
                );
                trackFixedWeight(
                    report.year,
                    report.month,
                    report.finalSettlementType,
                    false,
                    null,
                    null,
                );
            }

            const balance = buildCommissionBalance([...monthlyMap.values()]);
            const currentFixedAmount = Number(apartment.fixedPaymentAmount ?? 0);

            const fixedAdjustment =
                isFixedPaymentApartment(apartment.paymentType) &&
                currentFixedAmount > 0
                    ? calculateFixedAmountAdjustment({
                          balance: balance.balance,
                          currentFixedAmount,
                          fixedWeight,
                          monthCount: fixedMonthCount,
                          targetProfit: input.targetProfit,
                      })
                    : null;

            return {
                apartment: {
                    id: apartment.id,
                    name: apartment.name,
                    slug: apartment.slug,
                    paymentType: apartment.paymentType,
                    fixedPaymentAmount: apartment.fixedPaymentAmount
                        ? Number(apartment.fixedPaymentAmount)
                        : null,
                },
                period: {
                    startYear: input.startYear,
                    startMonth: input.startMonth,
                    endYear: input.endYear,
                    endMonth: input.endMonth,
                    startLabel: formatMonthLabel(input.startYear, input.startMonth),
                    endLabel: formatMonthLabel(input.endYear, input.endMonth),
                },
                ...balance,
                fixedAdjustment,
            };
        }),
});
