import { NextResponse } from "next/server";
import { PrismaClient, type Prisma } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

// Interface for the data coming from the frontend
interface CheckInApiPayload {
    bookingHolderFirstName: string;
    bookingHolderLastName: string;
    isDifferentGuest: boolean;
    guestFirstName?: string;
    guestLastName?: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string; // Expecting YYYY-MM-DD string from client, will be converted to Date
    nationality: string;
    documentType: string;
    documentNumber: string;
    addressStreet: string;
    addressCity: string;
    addressZipCode: string;
    addressCountry: string;
    submittedApartmentIdentifier: string; // This is the Apartment slug
    stayStartDate: string; // Data zameldowania z formularza
    stayEndDate: string;   // Data wymeldowania z formularza
    // checkInDate will be generated on the backend (today's date)
    // isPrimaryGuest will be determined on the backend
}

export async function POST(request: Request) {
    console.log("🚀 Check-in API POST function started!");

    try {
        console.log("📨 Attempting to parse request body...");
        const body = (await request.json()) as CheckInApiPayload;
        console.log("📦 Request body parsed:", body);

        // Przywrócona walidacja
        const requiredFields: Array<keyof CheckInApiPayload> = [
            "bookingHolderFirstName",
            "bookingHolderLastName",
            "dateOfBirth",
            "nationality",
            "documentType",
            "documentNumber",
            "addressStreet",
            "addressCity",
            "addressZipCode",
            "addressCountry",
            "submittedApartmentIdentifier",
            "stayStartDate",
            "stayEndDate",
        ];

        // Specific validation for guestFirstName and guestLastName if isDifferentGuest is true
        if (body.isDifferentGuest) {
            if (!body.guestFirstName) {
                console.log(`🆘 Validation Error: Missing required field: guestFirstName (because isDifferentGuest is true)`);
                return NextResponse.json(
                    { success: false, error: "Missing required field: guestFirstName" },
                    { status: 400 },
                );
            }
            if (!body.guestLastName) {
                console.log(`🆘 Validation Error: Missing required field: guestLastName (because isDifferentGuest is true)`);
                return NextResponse.json(
                    { success: false, error: "Missing required field: guestLastName" },
                    { status: 400 },
                );
            }
        }

        // Validation for the final firstName and lastName which are always required
        if (!body.firstName) {
            console.log(`🆘 Validation Error: Missing final firstName (derived from booking holder or guest fields).`);
            return NextResponse.json(
                { success: false, error: "Missing required field: firstName (final guest name)" },
                { status: 400 },
            );
        }
        if (!body.lastName) {
            console.log(`🆘 Validation Error: Missing final lastName (derived from booking holder or guest fields).`);
            return NextResponse.json(
                { success: false, error: "Missing required field: lastName (final guest name)" },
                { status: 400 },
            );
        }

        for (const field of requiredFields) {
            if (!body[field]) {
                console.log(`🆘 Validation Error: Missing required field: ${field}`);
                return NextResponse.json(
                    { success: false, error: `Missing required field: ${field}` },
                    { status: 400 },
                );
            }
        }

        if (typeof body.submittedApartmentIdentifier !== 'string' || body.submittedApartmentIdentifier.trim() === '') {
            console.log("🆘 Validation Error: Invalid submittedApartmentIdentifier format.");
            return NextResponse.json(
                { success: false, error: "Invalid submittedApartmentIdentifier format." },
                { status: 400 },
            );
        }

        const cardCreationDate = new Date();
        cardCreationDate.setUTCHours(0, 0, 0, 0);
        console.log("🏷️ Card creation date (cardCreationDate):", cardCreationDate.toISOString());

        // Przywracamy logikę Prisma
        // 1. Find the Apartment by its slug
        const apartment = await prisma.apartment.findUnique({
            where: { slug: body.submittedApartmentIdentifier },
        });

        if (!apartment) {
            console.log("🆘 Prisma Error: Apartment not found for slug:", body.submittedApartmentIdentifier);
            return NextResponse.json(
                { success: false, error: "Apartment not found for the given identifier." },
                { status: 404 },
            );
        }
        console.log("🏠 Found apartment in DB:", { id: apartment.id, name: apartment.name });

        // 3. Find a reservation matching the guest's stay dates
        const guestStayStart = new Date(body.stayStartDate);
        const guestStayEnd = new Date(body.stayEndDate);
        // Ustawiamy obie daty na początek dnia (UTC) dla spójnego porównania
        guestStayStart.setUTCHours(0, 0, 0, 0);
        guestStayEnd.setUTCHours(0, 0, 0, 0);

        console.log("📅 Looking for reservation with dates (raw from body):", { stayStartDate: body.stayStartDate, stayEndDate: body.stayEndDate });
        console.log("📅 Looking for reservation with processed UTC dates at midnight:", { guestStayStart: guestStayStart.toISOString(), guestStayEnd: guestStayEnd.toISOString(), apartmentId: apartment.id });

        const matchingReservation = await prisma.reservation.findFirst({
            where: {
                apartmentId: apartment.id,
                // Oczekujemy dokładnego dopasowania dat rozpoczęcia i zakończenia rezerwacji
                // Zakładając, że daty w bazie również są na początek dnia (UTC)
                start: { equals: guestStayStart },
                end: { equals: guestStayEnd }
            },
            orderBy: { createDate: 'desc' }
        });

        if (!matchingReservation) {
            console.log("🆘 Logic Error: No matching reservation found for the provided stay dates.");
            const allReservationsForApartment = await prisma.reservation.findMany({ where: { apartmentId: apartment.id } });
            console.log("📋 All reservations for this apartment for debugging:", allReservationsForApartment);
            return NextResponse.json(
                {
                    success: false,
                    error: `Brak rezerwacji pasującej do podanych dat pobytu (${body.stayStartDate} - ${body.stayEndDate}) dla apartamentu ${apartment.name}. Sprawdź daty lub skontaktuj się z obsługą.`
                },
                { status: 403 }
            );
        }
        console.log("🎟️ Found matching reservation:", matchingReservation);

        // NOWA WALIDACJA: Sprawdź, czy dla tej rezerwacji istnieje już karta meldunkowa
        const existingCardForReservation = await prisma.checkInCard.findFirst({
            where: {
                reservationId: matchingReservation.id,
            },
        });

        if (existingCardForReservation) {
            console.log("🆘 Logic Error: A check-in card already exists for this specific reservation:", existingCardForReservation);
            return NextResponse.json(
                {
                    success: false,
                    error: "Karta meldunkowa została już złożona dla tej rezerwacji. Skontaktuj się z obsługą, jeśli uważasz, że to błąd.",
                },
                { status: 409 }, // Conflict
            );
        }
        console.log("✅ No existing check-in card found for this reservation, proceeding.");

        let isPrimaryGuest = false;
        const guestFullName = `${body.firstName} ${body.lastName}`.trim().toLowerCase();
        const reservationGuestName = matchingReservation.guest.trim().toLowerCase();
        if (guestFullName === reservationGuestName) {
            isPrimaryGuest = true;
        }
        console.log("👤 Primary guest status:", isPrimaryGuest);

        // 4. Create the CheckInCard entry in the database
        const newCheckInCardData: Prisma.CheckInCardCreateInput = {
            firstName: body.firstName,
            lastName: body.lastName,
            bookingHolderFirstName: body.bookingHolderFirstName,
            bookingHolderLastName: body.bookingHolderLastName,
            isDifferentGuest: body.isDifferentGuest,
            dateOfBirth: new Date(body.dateOfBirth),
            nationality: body.nationality,
            documentType: body.documentType,
            documentNumber: body.documentNumber,
            addressStreet: body.addressStreet,
            addressCity: body.addressCity,
            addressZipCode: body.addressZipCode,
            addressCountry: body.addressCountry,
            submittedApartmentIdentifier: body.submittedApartmentIdentifier,
            checkInDate: cardCreationDate, // Ważne: data utworzenia karty, niekoniecznie data zameldowania w rezerwacji
            isPrimaryGuest: isPrimaryGuest,
            reservation: { connect: { id: matchingReservation.id } }
        };

        const newCheckInCard = await prisma.checkInCard.create({
            data: newCheckInCardData,
            include: { reservation: true }
        });
        console.log("💳 New CheckInCard created in DB:", newCheckInCard);

        // 5. Tworzenie sesji gościa (tymczasowo tylko ciasteczko, bez zapisu GuestSession do DB)
        // TODO: Po migracji Prisma, odkomentować i zaimplementować zapis GuestSession do bazy danych.
        const cookieStore = await cookies();
        const sessionToken = `guest-${newCheckInCard.id}-${Date.now()}`;

        const sessionExpiresAt = new Date(matchingReservation.end);
        sessionExpiresAt.setHours(10, 0, 0, 0); // Sesja ważna do 10:00 dnia wymeldowania

        cookieStore.set('guest-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: sessionExpiresAt,
            path: '/'
        });
        console.log("🍪 Guest session cookie set:", { token: sessionToken, expires: sessionExpiresAt });

        return NextResponse.json({
            success: true,
            message: "Karta meldunkowa pomyślnie utworzona i sesja gościa zainicjowana.",
            data: {
                checkInCard: newCheckInCard,
                reservation: matchingReservation,
                redirectTo: `/guest-dashboard/${body.submittedApartmentIdentifier}`,
                sessionToken: sessionToken, // Zwracamy token dla celów debugowania, frontend go nie używa
                sessionExpiresAt: sessionExpiresAt.toISOString()
            }
        });

    } catch (error) {
        console.error("🆘 Critical error in Check-in API route:", error);
        let errorMessage = "An unexpected server error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { success: false, error: "Server error during check-in card processing", details: errorMessage },
            { status: 500 },
        );
    }
} 