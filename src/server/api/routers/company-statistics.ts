import { z } from "zod";
import { ReportStatus, UserType, type VATOption } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";
import {
    addContributionToMonthlyEntry,
    buildCommissionBalance,
    calculateFixedAmountAdjustment,
    createEmptyMonthlyEntry,
    doesSettlementDeductRentAndUtilities,
    formatMonthLabel,
    getReportBalanceContribution,
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

const dateRangeObjectSchema = z.object({
    startYear: yearSchema,
    startMonth: monthSchema,
    endYear: yearSchema,
    endMonth: monthSchema,
});

function refineDateRange<T extends { startYear: number; startMonth: number; endYear: number; endMonth: number }>(
    schema: z.ZodType<T>,
) {
    return schema.refine(
        (input) => {
            const start = input.startYear * 12 + input.startMonth;
            const end = input.endYear * 12 + input.endMonth;
            return start <= end;
        },
        {
            message: "Data początkowa nie może być późniejsza niż końcowa",
        },
    );
}

const dateRangeSchema = refineDateRange(dateRangeObjectSchema);
const periodInputSchema = refineDateRange(
    dateRangeObjectSchema.extend({
        apartmentId: z.number().int().positive(),
    }),
);

const reportCommissionSelect = {
    id: true,
    year: true,
    month: true,
    apartmentId: true,
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
            id: true,
            name: true,
            paymentType: true,
            fixedPaymentAmount: true,
        },
    },
    additionalDeductions: {
        select: {
            amount: true,
            vatOption: true,
        },
    },
} as const;

const historicalCommissionSelect = {
    id: true,
    year: true,
    month: true,
    apartmentId: true,
    netIncome: true,
    adminCommissionAmount: true,
    finalHostPayout: true,
    finalSettlementType: true,
    rentAmount: true,
    utilitiesAmount: true,
    apartment: {
        select: {
            id: true,
            name: true,
            paymentType: true,
            fixedPaymentAmount: true,
        },
    },
    additionalDeductions: {
        select: {
            amount: true,
            vatOption: true,
        },
    },
} as const;

export const companyStatisticsRouter = createTRPCRouter({
    getCompanyCommissionBalance: protectedProcedure
        .input(dateRangeSchema)
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla administratora",
                });
            }

            const [activeReports, historicalReports] = await Promise.all([
                ctx.db.monthlyReport.findMany({
                    where: {
                        status: { not: ReportStatus.DELETED },
                    },
                    select: reportCommissionSelect,
                }),
                ctx.db.historicalReport.findMany({
                    select: historicalCommissionSelect,
                }),
            ]);

            const monthlyMap = new Map<string, MonthlyCommissionEntry>();
            const apartmentMonthly = new Map<
                number,
                Map<string, MonthlyCommissionEntry>
            >();
            const apartmentNames = new Map<number, string>();
            const activeKeys = new Set<string>();

            const addToMaps = (
                apartmentId: number,
                apartmentName: string,
                year: number,
                month: number,
                contribution: ReturnType<typeof getReportBalanceContribution>,
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

                apartmentNames.set(apartmentId, apartmentName);

                const key = monthKey(year, month);
                const companyExisting = monthlyMap.get(key);
                if (companyExisting) {
                    addContributionToMonthlyEntry(companyExisting, contribution);
                } else {
                    const entry = createEmptyMonthlyEntry(year, month);
                    addContributionToMonthlyEntry(entry, contribution);
                    monthlyMap.set(key, entry);
                }

                let aptMap = apartmentMonthly.get(apartmentId);
                if (!aptMap) {
                    aptMap = new Map();
                    apartmentMonthly.set(apartmentId, aptMap);
                }
                const aptExisting = aptMap.get(key);
                if (aptExisting) {
                    addContributionToMonthlyEntry(aptExisting, contribution);
                } else {
                    const entry = createEmptyMonthlyEntry(year, month);
                    addContributionToMonthlyEntry(entry, contribution);
                    aptMap.set(key, entry);
                }
            };

            for (const report of activeReports) {
                activeKeys.add(
                    `${report.apartmentId}:${monthKey(report.year, report.month)}`,
                );
                addToMaps(
                    report.apartmentId,
                    report.apartment.name,
                    report.year,
                    report.month,
                    getReportBalanceContribution(report, report.additionalDeductions),
                );
            }

            for (const report of historicalReports) {
                const dupKey = `${report.apartmentId}:${monthKey(report.year, report.month)}`;
                if (activeKeys.has(dupKey)) continue;

                addToMaps(
                    report.apartmentId,
                    report.apartment.name,
                    report.year,
                    report.month,
                    getReportBalanceContribution(
                        {
                            ...report,
                            fixedPayoutProrateEnabled: null,
                            fixedPayoutActiveDays: null,
                            customSummaryEnabled: false,
                            customHostPayout: null,
                        },
                        report.additionalDeductions,
                    ),
                );
            }

            const companyBalance = buildCommissionBalance([...monthlyMap.values()]);

            const apartmentBalances = [...apartmentMonthly.entries()]
                .map(([apartmentId, months]) => {
                    const aptBalance = buildCommissionBalance([...months.values()]);
                    return {
                        apartmentId,
                        name: apartmentNames.get(apartmentId) ?? `Apartament #${apartmentId}`,
                        monthCount: aptBalance.monthlyEntries.length,
                        reportCount: aptBalance.monthlyEntries.reduce(
                            (sum, entry) => sum + entry.reportCount,
                            0,
                        ),
                        positiveTotal: aptBalance.positiveTotal,
                        negativeTotal: aptBalance.negativeTotal,
                        balance: aptBalance.balance,
                    };
                })
                .sort((a, b) => a.balance - b.balance);

            return {
                period: {
                    startYear: input.startYear,
                    startMonth: input.startMonth,
                    endYear: input.endYear,
                    endMonth: input.endMonth,
                    startLabel: formatMonthLabel(input.startYear, input.startMonth),
                    endLabel: formatMonthLabel(input.endYear, input.endMonth),
                },
                ...companyBalance,
                apartmentBalances,
                summary: {
                    apartmentsWithReports: apartmentBalances.length,
                    apartmentsWithProfit: apartmentBalances.filter((a) => a.balance > 0)
                        .length,
                    apartmentsWithLoss: apartmentBalances.filter((a) => a.balance < 0)
                        .length,
                    totalReports: apartmentBalances.reduce(
                        (sum, a) => sum + a.reportCount,
                        0,
                    ),
                },
            };
        }),

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
                        rentAmount: true,
                        utilitiesAmount: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                        additionalDeductions: {
                            select: {
                                amount: true,
                                vatOption: true,
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
                        rentAmount: true,
                        utilitiesAmount: true,
                        apartment: {
                            select: {
                                paymentType: true,
                                fixedPaymentAmount: true,
                            },
                        },
                        additionalDeductions: {
                            select: {
                                amount: true,
                                vatOption: true,
                            },
                        },
                    },
                }),
            ]);

            const monthlyMap = new Map<string, MonthlyCommissionEntry>();
            const monthsWithActiveReports = new Set<string>();
            let fixedWeight = 0;
            let fixedMonthCount = 0;
            let rentUtilitiesSum = 0;
            let rentUtilitiesMonthCount = 0;

            const addCommission = (
                year: number,
                month: number,
                contribution: ReturnType<typeof getReportBalanceContribution>,
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
                    addContributionToMonthlyEntry(existing, contribution);
                    return;
                }

                const entry = createEmptyMonthlyEntry(year, month);
                addContributionToMonthlyEntry(entry, contribution);
                monthlyMap.set(key, entry);
            };

            const trackFixedWeight = (
                year: number,
                month: number,
                settlementType: string | null | undefined,
                customSummaryEnabled: boolean | null | undefined,
                prorateEnabled: boolean | null | undefined,
                activeDays: number | null | undefined,
                rentAmount: number | null | undefined,
                utilitiesAmount: number | null | undefined,
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

                // Średni czynsz+media: liczymy gdy w raporcie odejmowano je od kwoty stałej
                // (albo gdy jest jakakolwiek kwota — do oceny netto właściciela).
                const rent = Number(rentAmount ?? 0);
                const utilities = Number(utilitiesAmount ?? 0);
                if (
                    settlementType === "FIXED_MINUS_UTILITIES" ||
                    rent > 0 ||
                    utilities > 0
                ) {
                    rentUtilitiesSum += rent + utilities;
                    rentUtilitiesMonthCount += 1;
                }
            };

            for (const report of activeReports) {
                const key = monthKey(report.year, report.month);
                monthsWithActiveReports.add(key);
                addCommission(
                    report.year,
                    report.month,
                    getReportBalanceContribution(report, report.additionalDeductions),
                );
                trackFixedWeight(
                    report.year,
                    report.month,
                    report.finalSettlementType,
                    report.customSummaryEnabled,
                    report.fixedPayoutProrateEnabled,
                    report.fixedPayoutActiveDays,
                    report.rentAmount,
                    report.utilitiesAmount,
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
                    getReportBalanceContribution(
                        {
                            ...report,
                            fixedPayoutProrateEnabled: null,
                            fixedPayoutActiveDays: null,
                            customSummaryEnabled: false,
                            customHostPayout: null,
                        },
                        report.additionalDeductions,
                    ),
                );
                trackFixedWeight(
                    report.year,
                    report.month,
                    report.finalSettlementType,
                    false,
                    null,
                    null,
                    report.rentAmount,
                    report.utilitiesAmount,
                );
            }

            const balance = buildCommissionBalance([...monthlyMap.values()]);
            const currentFixedAmount = Number(apartment.fixedPaymentAmount ?? 0);
            const averageRentAndUtilities =
                rentUtilitiesMonthCount > 0
                    ? rentUtilitiesSum / rentUtilitiesMonthCount
                    : 0;

            const fixedAdjustment =
                isFixedPaymentApartment(apartment.paymentType) &&
                currentFixedAmount > 0
                    ? calculateFixedAmountAdjustment({
                          // Korekta kwoty stałej zależy tylko od prowizji ZW
                          // (5% odliczeń nie zmienia się przy obniżce kwoty stałej).
                          balance: balance.hostPayoutTotal,
                          currentFixedAmount,
                          fixedWeight,
                          monthCount: fixedMonthCount,
                          targetMonthlyProfit: input.targetMonthlyProfit,
                          averageRentAndUtilities,
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
                        additionalDeductions: {
                            select: {
                                amount: true,
                                vatOption: true,
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
                        additionalDeductions: {
                            select: {
                                amount: true,
                                vatOption: true,
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
                    hostPayout: number;
                    additionalDeductionsTotal: number;
                    additionalDeductionsProfit: number;
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
                    additionalDeductions: Array<{ amount: number; vatOption: VATOption }>;
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

                const contribution = getReportBalanceContribution(
                    {
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
                        rentAmount: report.rentAmount ?? 0,
                        utilitiesAmount: report.utilitiesAmount ?? 0,
                        apartment: report.apartment,
                    },
                    report.additionalDeductions,
                );
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
                    additionalDeductionsTotal: contribution.additionalDeductionsTotal,
                    additionalDeductionsProfit: contribution.additionalDeductionsProfit,
                    netIncome: roundPln(Number(report.netIncome ?? 0)),
                    hostPayout: contribution.hostPayout,
                    fixedPaymentAmount:
                        fixedPaymentAmount != null ? roundPln(fixedPaymentAmount) : null,
                };

                const key = monthKey(year, month);
                const existing = byMonth.get(key);
                if (existing) {
                    existing.commission = roundPln(
                        existing.commission + contribution.commission,
                    );
                    existing.hostPayout = roundPln(
                        existing.hostPayout + contribution.hostPayout,
                    );
                    existing.additionalDeductionsTotal = roundPln(
                        existing.additionalDeductionsTotal +
                            contribution.additionalDeductionsTotal,
                    );
                    existing.additionalDeductionsProfit = roundPln(
                        existing.additionalDeductionsProfit +
                            contribution.additionalDeductionsProfit,
                    );
                    existing.reports.push(detail);
                    return;
                }

                byMonth.set(key, {
                    year,
                    month,
                    label: formatMonthLabel(year, month),
                    commission: contribution.commission,
                    hostPayout: contribution.hostPayout,
                    additionalDeductionsTotal: contribution.additionalDeductionsTotal,
                    additionalDeductionsProfit: contribution.additionalDeductionsProfit,
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
                note: "Bilans obejmuje prowizję Złote Wynajmy oraz 5% dodatkowych odliczeń (brutto) traktowanych jako zysk ZW. Przy kwocie stałej prowizja ZW = zysk netto − kwota stała. Odjęcie czynszu i mediów dotyczy wypłaty właściciela (tryb „kwota stała minus media”).",
            };
        }),
});
