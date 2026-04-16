// Helper functions dla enumów z Prisma
// Importujemy enumy bezpośrednio z Prisma

import {
    ReportStatus,
    ReportItemType,
    PaymentType,
    VATOption,
    UserType,
    ExpenseCategory,
    ReservationPortal
} from "@prisma/client";

// Helper functions dla konwersji enumów na tekst
export const getReportStatusText = (status: ReportStatus): string => {
    switch (status) {
        case ReportStatus.DRAFT:
            return "Szkic";
        case ReportStatus.REVIEW:
            return "Do przeglądu";
        case ReportStatus.APPROVED:
            return "Zatwierdzony";
        case ReportStatus.SENT:
            return "Wysłany";
        default:
            return status;
    }
};

export const getReportStatusColor = (status: ReportStatus): string => {
    switch (status) {
        case ReportStatus.DRAFT:
            return "bg-gray-100 text-gray-800";
        case ReportStatus.REVIEW:
            return "bg-yellow-100 text-yellow-800";
        case ReportStatus.APPROVED:
            return "bg-green-100 text-green-800";
        case ReportStatus.SENT:
            return "bg-blue-100 text-blue-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

export const getItemTypeText = (type: ReportItemType): string => {
    switch (type) {
        case ReportItemType.REVENUE:
            return "Przychód";
        case ReportItemType.EXPENSE:
            return "Wydatek";
        case ReportItemType.FEE:
            return "Opłata";
        case ReportItemType.TAX:
            return "Podatek";
        case ReportItemType.COMMISSION:
            return "Prowizja";
        default:
            return type;
    }
};

export const getItemTypeColor = (type: ReportItemType): string => {
    switch (type) {
        case ReportItemType.REVENUE:
            return "bg-green-100 text-green-800";
        case ReportItemType.EXPENSE:
            return "bg-red-100 text-red-800";
        case ReportItemType.FEE:
            return "bg-orange-100 text-orange-800";
        case ReportItemType.TAX:
            return "bg-purple-100 text-purple-800";
        case ReportItemType.COMMISSION:
            return "bg-blue-100 text-blue-800";
        default:
            return "bg-gray-100 text-gray-800";
    }
};

export const getVATOptionText = (vatOption: VATOption): string => {
    switch (vatOption) {
        case VATOption.NO_VAT:
            return "Bez VAT";
        case VATOption.VAT_8:
            return "VAT 8%";
        case VATOption.VAT_23:
            return "VAT 23%";
        default:
            return vatOption;
    }
};

export const getPaymentTypeText = (paymentType: PaymentType): string => {
    switch (paymentType) {
        case PaymentType.COMMISSION:
            return "Prowizja";
        case PaymentType.FIXED_AMOUNT:
            return "Stała kwota";
        case PaymentType.OWN_APARTMENT:
            return "Apartament własny";
        default:
            return paymentType;
    }
};



// Eksportujemy enumy z Prisma dla łatwego dostępu
export {
    ReportStatus,
    ReportItemType,
    PaymentType,
    VATOption,
    UserType,
    ExpenseCategory,
    ReservationPortal,
};

export function slugify(str: string): string {
    return str
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-');
} 