import type { Prisma } from "@prisma/client";
import { ReportStatus } from "@prisma/client";

/**
 * Właściciel widzi raport finansowy, gdy jest zapisany jako `ownerId` na raporcie
 * lub ma aktywną współwłasność apartamentu (np. drugi współwłaściciel, gdy przy tworzeniu
 * raportu został przypisany pierwszy rekord z `ApartmentOwnership`).
 */
export function ownerHasReportFinancialAccess(
    ownerId: string,
): Pick<Prisma.MonthlyReportWhereInput, "AND"> {
    return {
        AND: [
            { apartment: { archived: false } },
            {
                OR: [
                    { ownerId },
                    {
                        apartment: {
                            ownerships: {
                                some: { ownerId, isActive: true },
                            },
                        },
                    },
                ],
            },
        ],
    };
}

export function ownerMonthlyReportApprovedOrSentWhere(
    ownerId: string,
): Prisma.MonthlyReportWhereInput {
    return {
        status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
        ...ownerHasReportFinancialAccess(ownerId),
    };
}
