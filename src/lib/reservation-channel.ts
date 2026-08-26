/**
 * Mapowanie źródeł rezerwacji.
 *
 * IdoBooking zapisuje kanał jako `Idobooking (ID: N)`. Słowo "booking" w "idobooking"
 * NIE oznacza Booking.com — ID 14 to Airbnb, ID 8 to Booking.com.
 */
export const IDOBOOKING_SOURCE_ID_TO_CHANNEL: Record<number, string> = {
    8: "Booking",
    14: "Airbnb",
};

const INTERNAL_SOURCE_LABELS: Record<string, string> = {
    email: "Email",
    phone: "Telefon",
    faceToFaceConversation: "Osobiście",
    socialMedia: "Social Media",
};

const IDOBOOKING_SOURCE_ID_PATTERN = /idobooking\s*\(\s*id:\s*(\d+)\s*\)/i;
const IDOBOOKING_TYPE_ID_PATTERN = /idobooking\s*\(\s*typ\s*id:/i;

function looksLikeIdobookingPlatformLabel(sourceLower: string): boolean {
    const compact = sourceLower.replace(/\s+/g, "");
    return compact === "idobooking" || compact === "idobooking.com";
}

function looksLikeAirbnb(sourceLower: string): boolean {
    return sourceLower.includes("airbnb");
}

function looksLikeBookingCom(sourceLower: string): boolean {
    if (sourceLower.includes("idobooking")) return false;
    if (sourceLower.includes("booking.com")) return true;
    return /(^|[^a-z])booking([^a-z]|$)/i.test(sourceLower);
}

function looksLikeZloteWynajmy(sourceLower: string): boolean {
    const ascii = sourceLower
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/ł/g, "l");
    const compact = ascii.replace(/\s+/g, "");
    return ascii === "zlote wynajmy" || compact === "zlotewynajmy";
}

export function getRecognizedReservationChannel(
    rawSource: string | null | undefined,
): string | null {
    const source = (rawSource ?? "").trim();
    if (!source) return null;

    const idMatch = IDOBOOKING_SOURCE_ID_PATTERN.exec(source);
    if (idMatch) {
        const id = Number(idMatch[1]);
        return IDOBOOKING_SOURCE_ID_TO_CHANNEL[id] ?? null;
    }

    if (IDOBOOKING_TYPE_ID_PATTERN.test(source)) {
        return null;
    }

    const sourceLower = source.toLowerCase();

    if (looksLikeAirbnb(sourceLower)) return "Airbnb";
    if (looksLikeIdobookingPlatformLabel(sourceLower)) return null;
    if (looksLikeBookingCom(sourceLower)) return "Booking";
    if (looksLikeZloteWynajmy(sourceLower)) return "Złote Wynajmy";

    return null;
}

export function resolveReportChannel(
    rawCategory: string | null | undefined,
    rawSource: string | null | undefined,
): string | null {
    const recognizedSource = getRecognizedReservationChannel(rawSource);
    if (recognizedSource) return recognizedSource;

    const category = (rawCategory ?? "").trim();
    const recognizedCategory = getRecognizedReservationChannel(category);
    if (recognizedCategory) return recognizedCategory;
    if (category) return category;

    const source = (rawSource ?? "").trim();
    return source || null;
}

export function displayReservationChannel(
    rawSource: string | null | undefined,
): string {
    const recognized = getRecognizedReservationChannel(rawSource);
    if (recognized) return recognized;
    const source = (rawSource ?? "").trim();
    return source || "Złote Wynajmy";
}

export function resolveStoredReservationSource(
    details: {
        internalSource?: string;
        reservationSourceId?: number;
        reservationSourceTypeId?: number;
    },
    catalogById?: Map<number, string>,
): string {
    if (details.internalSource && details.internalSource !== "other") {
        return INTERNAL_SOURCE_LABELS[details.internalSource] ?? details.internalSource;
    }

    if (details.reservationSourceId) {
        const known = IDOBOOKING_SOURCE_ID_TO_CHANNEL[details.reservationSourceId];
        if (known) return known;

        const catalogName = catalogById?.get(details.reservationSourceId)?.trim();
        const fromCatalog = getRecognizedReservationChannel(catalogName);
        if (fromCatalog) return fromCatalog;
        if (catalogName) return catalogName;

        return `Idobooking (ID: ${details.reservationSourceId})`;
    }

    if (details.reservationSourceTypeId) {
        return `Idobooking (Typ ID: ${details.reservationSourceTypeId})`;
    }

    return "Brak";
}
