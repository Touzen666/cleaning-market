import { describe, expect, it } from "vitest";
import {
    displayReservationChannel,
    getRecognizedReservationChannel,
    resolveReportChannel,
    resolveStoredReservationSource,
} from "./reservation-channel";

describe("getRecognizedReservationChannel", () => {
    it("mapuje IdoBooking ID 14 na Airbnb, a nie na Booking", () => {
        expect(getRecognizedReservationChannel("Idobooking (ID: 14)")).toBe("Airbnb");
        expect(getRecognizedReservationChannel("idobooking (id: 14)")).toBe("Airbnb");
    });

    it("mapuje IdoBooking ID 8 na Booking.com", () => {
        expect(getRecognizedReservationChannel("Idobooking (ID: 8)")).toBe("Booking");
    });

    it("nie traktuje samej nazwy IdoBooking jako Booking.com", () => {
        expect(getRecognizedReservationChannel("Idobooking")).toBeNull();
        expect(getRecognizedReservationChannel("Idobooking (Typ ID: 3)")).toBeNull();
        expect(getRecognizedReservationChannel("Idobooking (ID: 99)")).toBeNull();
    });

    it("rozpoznaje jawne nazwy kanałów", () => {
        expect(getRecognizedReservationChannel("Airbnb")).toBe("Airbnb");
        expect(getRecognizedReservationChannel("Booking.com")).toBe("Booking");
        expect(getRecognizedReservationChannel("Booking")).toBe("Booking");
        expect(getRecognizedReservationChannel("Złote Wynajmy")).toBe("Złote Wynajmy");
    });
});

describe("resolveReportChannel", () => {
    it("bierze kanał z ID IdoBooking nawet gdy kategoria to Booking", () => {
        expect(resolveReportChannel("Booking", "Idobooking (ID: 14)")).toBe("Airbnb");
    });

    it("nie fallbackuje nieznanego IdoBooking ID do Booking", () => {
        expect(resolveReportChannel(null, "Idobooking (ID: 99)")).toBe("Idobooking (ID: 99)");
    });
});

describe("displayReservationChannel", () => {
    it("pokazuje Airbnb dla ID 14 w selectach i raportach", () => {
        expect(displayReservationChannel("Idobooking (ID: 14)")).toBe("Airbnb");
        expect(displayReservationChannel("Idobooking (ID: 8)")).toBe("Booking");
        expect(displayReservationChannel("")).toBe("Złote Wynajmy");
    });
});

describe("resolveStoredReservationSource", () => {
    it("zapisuje Airbnb / Booking zamiast Idobooking (ID: N)", () => {
        expect(resolveStoredReservationSource({ reservationSourceId: 14 })).toBe("Airbnb");
        expect(resolveStoredReservationSource({ reservationSourceId: 8 })).toBe("Booking");
    });

    it("używa katalogu IdoBooking dla nieznanych ID", () => {
        const catalog = new Map<number, string>([[22, "Expedia"]]);
        expect(
            resolveStoredReservationSource({ reservationSourceId: 22 }, catalog),
        ).toBe("Expedia");
        expect(
            resolveStoredReservationSource(
                { reservationSourceId: 22 },
                new Map([[22, "Airbnb.com"]]),
            ),
        ).toBe("Airbnb");
    });

    it("zachowuje źródła bezpośrednie", () => {
        expect(resolveStoredReservationSource({ internalSource: "phone" })).toBe("Telefon");
        expect(resolveStoredReservationSource({ internalSource: "email" })).toBe("Email");
    });
});
