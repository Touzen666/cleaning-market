import { type VATOption } from "@prisma/client";

export function getVatAmount(base: number, vatOption: VATOption): number {
    if (vatOption === "VAT_23") {
        return base * 0.23;
    }
    if (vatOption === "VAT_8") {
        return base * 0.08;
    }
    return 0;
}

export function getGrossAmount(base: number, vatOption: VATOption): number {
    return base + getVatAmount(base, vatOption);
}

export function calculateVatAmount(base: number, vatOption: VATOption): { value: number; label: string } {
    if (vatOption === "VAT_23") {
        return { value: base * 0.23, label: "23%" };
    }
    if (vatOption === "VAT_8") {
        return { value: base * 0.08, label: "8%" };
    }
    return { value: 0, label: "0%" };
} 