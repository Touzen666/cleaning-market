import { z } from "zod";
import { ReportStatus, UserType } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";
import {
    buildCommissionBalance,
    calculateFixedAmountAdjustment,
    doesSettlementDeductRentAndUtilities,
    formatMonthLabel,
    getHostPayoutFromSummary,
    getSettlementTypeLabel,
    isFixedPaymentApartment,
    isFixedSettlementType,
    isMonthInRange,
    monthKey,
    roundPln,
    type MonthSettlementDetail,
    type MonthlyCommissionEntry,
} from "@/lib/company-statistics";

const monthSchema = z.number().int().min(1).max(12);
const yearSchema = z.number().int().min(2000).max(2100);

const periodInputSchema = z
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
    );

export const companyStatisticsRouter = createTRPCRouter({
    getApartmentCommissionBalance: protectedProcedure
        .input(
            periodInputSchema.and(
                z.object({
                    /** Docelowy miesięczny zysk ZW przy korekcie kwoty stałej (domyślnie 550 PLN). */
                    targetMonthlyProfit: z.number().default(550),
                }),
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
                          targetMonthlyProfit: input.targetMonthlyProfit,
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

    getApartmentSettlementDetails: protectedProcedure
        .input(periodInputSchema)
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
                        rentAmount: true,
                        utilitiesAmount: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                    },
                    orderBy: [{ year: "asc" }, { month: "asc" }],
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
                        rentAmount: true,
                        utilitiesAmount: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                    },
                    orderBy: [{ year: "asc" }, { month: "asc" }],
                }),
            ]);

            type DetailReport = MonthSettlementDetail["reports"][number];
            const monthsWithActive = new Set<string>();
            const byMonth = new Map<
                string,
                {
                    year: number;
                    month: number;
                    label: string;
                    commission: number;
                    reports: DetailReport[];
                }
            >();

            const pushReport = (
                year: number,
                month: number,
                report: {
                    id: string;
                    netIncome: number | null;
                    adminCommissionAmount: number | null;
                    finalHostPayout: number | null;
                    finalSettlementType: string | null;
                    fixedPayoutProrateEnabled?: boolean | null;
                    fixedPayoutActiveDays?: number | null;
                    customSummaryEnabled?: boolean | null;
                    customHostPayout?: number | null;
                    rentAmount: number | null;
                    utilitiesAmount: number | null;
                    apartment: {
                        paymentType: string;
                        fixedPaymentAmount: unknown;
                    };
                },
                isHistorical: boolean,
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

                const hostPayout = getHostPayoutFromSummary({
                    year,
                    month,
                    netIncome: report.netIncome,
                    adminCommissionAmount: report.adminCommissionAmount,
                    finalHostPayout: report.finalHostPayout,
                    finalSettlementType: report.finalSettlementType,
                    fixedPayoutProrateEnabled: report.fixedPayoutProrateEnabled ?? null,
                    fixedPayoutActiveDays: report.fixedPayoutActiveDays ?? null,
                    customSummaryEnabled: report.customSummaryEnabled ?? false,
                    customHostPayout: report.customHostPayout ?? null,
                    apartment: report.apartment,
                });
                const rentAmount = Number(report.rentAmount ?? 0);
                const utilitiesAmount = Number(report.utilitiesAmount ?? 0);
                const settlementType = report.finalSettlementType;
                const rentAndUtilitiesDeducted =
                    doesSettlementDeductRentAndUtilities(settlementType);
                const fixedPaymentAmount =
                    report.apartment.fixedPaymentAmount != null
                        ? Number(report.apartment.fixedPaymentAmount)
                        : null;

                const detail: DetailReport = {
                    id: report.id,
                    isHistorical,
                    settlementType,
                    settlementLabel: getSettlementTypeLabel(settlementType),
                    rentAndUtilitiesDeducted,
                    rentAmount: roundPln(rentAmount),
                    utilitiesAmount: roundPln(utilitiesAmount),
                    rentAndUtilitiesTotal: roundPln(rentAmount + utilitiesAmount),
                    netIncome: roundPln(Number(report.netIncome ?? 0)),
                    hostPayout: roundPln(hostPayout),
                    fixedPaymentAmount:
                        fixedPaymentAmount != null ? roundPln(fixedPaymentAmount) : null,
                };

                const key = monthKey(year, month);
                const existing = byMonth.get(key);
                if (existing) {
                    existing.commission = roundPln(existing.commission + hostPayout);
                    existing.reports.push(detail);
                    return;
                }

                byMonth.set(key, {
                    year,
                    month,
                    label: formatMonthLabel(year, month),
                    commission: roundPln(hostPayout),
                    reports: [detail],
                });
            };

            for (const report of activeReports) {
                monthsWithActive.add(monthKey(report.year, report.month));
                pushReport(report.year, report.month, report, false);
            }

            for (const report of historicalReports) {
                const key = monthKey(report.year, report.month);
                if (monthsWithActive.has(key)) continue;
                pushReport(report.year, report.month, report, true);
            }

            const months: MonthSettlementDetail[] = [...byMonth.values()]
                .sort((a, b) => a.year * 12 + a.month - (b.year * 12 + b.month))
                .map((entry) => {
                    const deductionFlags = entry.reports.map(
                        (r) => r.rentAndUtilitiesDeducted,
                    );
                    const allSame = deductionFlags.every((f) => f === deductionFlags[0]);
                    return {
                        ...entry,
                        mixedSettlement: !allSame,
                        rentAndUtilitiesDeducted: allSame
                            ? (deductionFlags[0] ?? null)
                            : null,
                    };
                });

            const withDeduction = months.filter(
                (m) => m.rentAndUtilitiesDeducted === true,
            ).length;
            const withoutDeduction = months.filter(
                (m) => m.rentAndUtilitiesDeducted === false,
            ).length;
            const mixed = months.filter((m) => m.mixedSettlement).length;

            return {
                apartment: {
                    id: apartment.id,
                    name: apartment.name,
                    paymentType: apartment.paymentType,
                    fixedPaymentAmount: apartment.fixedPaymentAmount
                        ? Number(apartment.fixedPaymentAmount)
                        : null,
                },
                months,
                summary: {
                    withDeduction,
                    withoutDeduction,
                    mixed,
                    totalMonths: months.length,
                },
                note: "Prowizja Złote Wynajmy przy kwocie stałej = zysk netto − kwota stała. Odjęcie czynszu i mediów dotyczy wypłaty właściciela (tryb „kwota stała minus media”), a nie wzoru samej prowizji ZW — warto jednak wiedzieć, który tryb był użyty w raporcie.",
            };
        }),
});
