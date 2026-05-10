import { ReportStatus } from "@prisma/client";

/** Raport zablokowany do edycji (jak wysłany). */
export function isReportLockedForEditing(status: ReportStatus): boolean {
    return (
        status === ReportStatus.SENT ||
        status === ReportStatus.AGREEMENT_SETTLED
    );
}

/** Wartości z bazy zamrożone jak przy „Wysłanym” (bez dynamicznego przeliczania list). */
export function isReportFrozenFinancialSnapshot(status: ReportStatus): boolean {
    return isReportLockedForEditing(status);
}

/** Raport widoczny dla właściciela w panelu i API (bez warunku „udostępnienia” przy rozwiązaniu umowy). */
export const OWNER_VISIBLE_REPORT_STATUSES: ReportStatus[] = [
    ReportStatus.APPROVED,
    ReportStatus.SENT,
    ReportStatus.AGREEMENT_TERMINATION,
    ReportStatus.AGREEMENT_SETTLED,
];

/** Statusy widoczne dla właściciela bez dodatkowych pól (wszystkie oprócz rozwiązania umowy). */
export const OWNER_ALWAYS_VISIBLE_REPORT_STATUSES: ReportStatus[] = [
    ReportStatus.APPROVED,
    ReportStatus.SENT,
    ReportStatus.AGREEMENT_SETTLED,
];

/** Czy pojedynczy raport może być odczytany przez właściciela (lista + szczegóły). */
export function ownerCanViewMonthlyReportRow(report: {
    status: ReportStatus;
    agreementTerminationVisibleToOwner?: boolean | null;
}): boolean {
    if (report.status === ReportStatus.AGREEMENT_TERMINATION) {
        return report.agreementTerminationVisibleToOwner === true;
    }
    return OWNER_ALWAYS_VISIBLE_REPORT_STATUSES.includes(report.status);
}

/** Statusy, z których można wysłać raport do właściciela (email / zmiana na SENT). */
export function canSendReportFromStatus(status: ReportStatus): boolean {
    return (
        status === ReportStatus.APPROVED ||
        status === ReportStatus.AGREEMENT_TERMINATION
    );
}

/** Statusy wymagające pełnej konfiguracji rozliczenia jak przy zatwierdzeniu. */
export function statusRequiresSettlementLikeApproval(status: ReportStatus): boolean {
    return (
        status === ReportStatus.APPROVED ||
        status === ReportStatus.AGREEMENT_TERMINATION ||
        status === ReportStatus.AGREEMENT_SETTLED
    );
}

/** Archiwizacja z repliką historyczną — tylko po wysłaniu lub po formalnym zamknięciu umowy. */
export function canArchiveMonthlyReport(status: ReportStatus): boolean {
    return (
        status === ReportStatus.SENT ||
        status === ReportStatus.AGREEMENT_SETTLED
    );
}
