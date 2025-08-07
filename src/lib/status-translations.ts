import { type ReportStatus } from "@prisma/client";

/**
 * Słownik tłumaczeń statusów raportów
 */
export const REPORT_STATUS_TRANSLATIONS: Record<ReportStatus, string> = {
    DRAFT: "Szkic",
    REVIEW: "Do przeglądu",
    APPROVED: "Zatwierdzony",
    SENT: "Wysłany",
    DELETED: "Usunięty",
};

/**
 * Słownik tłumaczeń typów elementów raportu
 */
export const REPORT_ITEM_TYPE_TRANSLATIONS: Record<string, string> = {
    REVENUE: "Przychód",
    EXPENSE: "Wydatek",
    FEE: "Opłata",
    TAX: "Podatek",
    COMMISSION: "Prowizja",
};

/**
 * Funkcja do tłumaczenia statusu raportu
 * @param status - Status raportu z bazy danych
 * @returns Przetłumaczony status
 */
export function translateReportStatus(status: ReportStatus): string {
    return REPORT_STATUS_TRANSLATIONS[status] ?? status;
}

/**
 * Funkcja do tłumaczenia typu elementu raportu
 * @param type - Typ elementu raportu
 * @returns Przetłumaczony typ
 */
export function translateReportItemType(type: string): string {
    return REPORT_ITEM_TYPE_TRANSLATIONS[type] ?? type;
}

/**
 * Funkcja do pobierania kolorów dla statusów
 * @param status - Status raportu
 * @returns Klasy CSS dla kolorów
 */
export function getReportStatusColor(status: ReportStatus): string {
    switch (status) {
        case "DRAFT":
            return "bg-gray-100 text-gray-800";
        case "REVIEW":
            return "bg-yellow-100 text-yellow-800";
        case "APPROVED":
            return "bg-green-100 text-green-800";
        case "SENT":
            return "bg-blue-100 text-blue-800";
        case "DELETED":
            return "bg-red-100 text-red-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
}

/**
 * Funkcja do pobierania kolorów dla typów elementów raportu
 * @param type - Typ elementu raportu
 * @returns Klasy CSS dla kolorów
 */
export function getReportItemTypeColor(type: string): string {
    switch (type) {
        case "REVENUE":
            return "bg-green-100 text-green-800";
        case "EXPENSE":
            return "bg-red-100 text-red-800";
        case "FEE":
            return "bg-orange-100 text-orange-800";
        case "TAX":
            return "bg-purple-100 text-purple-800";
        case "COMMISSION":
            return "bg-blue-100 text-blue-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
} 