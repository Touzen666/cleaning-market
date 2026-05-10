import { type TerminationCostSide } from "@prisma/client";

export type AgreementTerminationNoticeFields = {
    agreementTerminationNoticeDate?: Date | string | null;
    agreementTerminationNoticeParty?: TerminationCostSide | null;
    agreementTerminationNoticeDocumentUrl?: string | null;
    agreementTerminationNoticeDeliveryNote?: string | null;
};

export function terminationNoticePartyLabel(side: TerminationCostSide): string {
    switch (side) {
        case "OWNER_SIDE":
            return "Właściciel";
        case "HOST_COMPANY":
            return "Złote Wynajmy";
        default:
            return String(side);
    }
}

export function isAgreementTerminationNoticeComplete(
    report: AgreementTerminationNoticeFields,
): boolean {
    const hasDate = report.agreementTerminationNoticeDate != null;
    const hasParty = report.agreementTerminationNoticeParty != null;
    const hasDoc =
        (report.agreementTerminationNoticeDocumentUrl?.trim() ?? "").length > 0;
    const hasDelivery =
        (report.agreementTerminationNoticeDeliveryNote?.trim() ?? "").length > 0;
    return hasDate && hasParty && hasDoc && hasDelivery;
}

export function hasAnyAgreementTerminationNoticeData(
    report: AgreementTerminationNoticeFields,
): boolean {
    return (
        report.agreementTerminationNoticeDate != null ||
        report.agreementTerminationNoticeParty != null ||
        (report.agreementTerminationNoticeDocumentUrl?.trim() ?? "").length > 0 ||
        (report.agreementTerminationNoticeDeliveryNote?.trim() ?? "").length > 0
    );
}

export function toDateInputValue(d: Date | string | null | undefined): string {
    if (d == null) return "";
    const x = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(x.getTime())) return "";
    return x.toISOString().slice(0, 10);
}
