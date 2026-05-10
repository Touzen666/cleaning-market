import { ReportStatus } from "@prisma/client";

export type TerminationReportLite = {
    ownerId: string;
    apartmentId: number;
    year: number;
    month: number;
    status: ReportStatus;
};

const TERMINATION_STATUSES: ReportStatus[] = [
    ReportStatus.AGREEMENT_TERMINATION,
    ReportStatus.AGREEMENT_SETTLED,
];

function ymKey(y: number, m: number): number {
    return y * 100 + m;
}

/** Stan „rozwiązania umowy” wg ostatniego miesiąca raportu (tylko statusy rozwiązania). */
export function classifyApartmentTerminationState(
    reports: TerminationReportLite[],
): "none" | "in_notice" | "settled" {
    const rel = reports.filter((r) => TERMINATION_STATUSES.includes(r.status));
    if (rel.length === 0) return "none";
    let maxKey = -1;
    for (const r of rel) {
        const k = ymKey(r.year, r.month);
        if (k > maxKey) maxKey = k;
    }
    const y = Math.floor(maxKey / 100);
    const m = maxKey % 100;
    const atMax = rel.filter((r) => r.year === y && r.month === m);
    if (atMax.some((r) => r.status === ReportStatus.AGREEMENT_TERMINATION)) {
        return "in_notice";
    }
    if (atMax.some((r) => r.status === ReportStatus.AGREEMENT_SETTLED)) {
        return "settled";
    }
    return "none";
}

export function computeOwnerContractTerminationStats(
    ownerId: string,
    activeOwnedApartmentIds: number[],
    allReports: TerminationReportLite[],
): {
    inNoticeApartments: number;
    completedNoticeApartments: number;
    /** Wszystkie umowy z procesem rozwiązania są już zamknięte (żadnej w toku). */
    allNoticeContractsFinished: boolean;
} {
    const ids = new Set(activeOwnedApartmentIds);
    let inNotice = 0;
    let settled = 0;
    let withProcess = 0;

    for (const aptId of ids) {
        const forApt = allReports.filter(
            (r) => r.ownerId === ownerId && r.apartmentId === aptId,
        );
        const st = classifyApartmentTerminationState(forApt);
        if (st === "none") continue;
        withProcess += 1;
        if (st === "in_notice") inNotice += 1;
        if (st === "settled") settled += 1;
    }

    return {
        inNoticeApartments: inNotice,
        completedNoticeApartments: settled,
        allNoticeContractsFinished:
            withProcess > 0 && inNotice === 0 && settled === withProcess,
    };
}
