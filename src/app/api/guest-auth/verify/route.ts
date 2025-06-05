import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    console.log("🛡️ Guest Auth Verify API called - V2 (with DB lookup)");
    try {
        const url = new URL(request.url);
        const apartmentSlugFromQuery = url.searchParams.get('apartmentSlug');
        console.log("🔑 Verify: apartmentSlug from URL query:", apartmentSlugFromQuery);

        if (!apartmentSlugFromQuery) {
            console.log("🚫 Verify: Missing apartmentSlug in query parameters.");
            return NextResponse.json(
                { authenticated: false, error: "Missing apartmentSlug in query parameters" },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('guest-session');
        console.log("🍪 Verify: Guest session cookie retrieved:", sessionCookie);

        if (!sessionCookie?.value) {
            console.log("🚫 Verify: No session cookie found or cookie is empty.");
            return NextResponse.json(
                { authenticated: false, error: "No session cookie" },
                { status: 401 }
            );
        }

        const tokenValue = sessionCookie.value;
        const prefix = "guest-";

        if (!tokenValue.startsWith(prefix)) {
            console.log("🚫 Verify: Invalid session token prefix.", tokenValue);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session token (prefix)" },
                { status: 401 }
            );
        }

        const remainingToken = tokenValue.substring(prefix.length);
        const lastHyphenIndex = remainingToken.lastIndexOf('-');

        if (lastHyphenIndex === -1 || lastHyphenIndex === 0 || lastHyphenIndex === remainingToken.length - 1) {
            console.log("🚫 Verify: Invalid session token structure (UUID/timestamp).", remainingToken);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session token (structure)" },
                { status: 401 }
            );
        }

        const checkInCardId = remainingToken.substring(0, lastHyphenIndex);
        const timestampStr = remainingToken.substring(lastHyphenIndex + 1);

        // Opcjonalna walidacja timestampu
        if (isNaN(parseInt(timestampStr))) {
            console.log("🚫 Verify: Invalid timestamp in session token.", timestampStr);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session token (timestamp)" },
                { status: 401 }
            );
        }

        console.log("🆔 Verify: Extracted checkInCardId:", checkInCardId, "TimestampStr:", timestampStr);

        const checkInCard = await prisma.checkInCard.findUnique({
            where: { id: checkInCardId },
            include: {
                reservation: {
                    include: {
                        apartment: true, // Aby uzyskać apartmentSlug z bazy danych
                    },
                },
            },
        });

        if (!checkInCard) {
            console.log("🚫 Verify: CheckInCard not found for ID:", checkInCardId);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session: Check-in card not found" },
                { status: 401 }
            );
        }
        console.log("📄 Verify: Found CheckInCard in DB:", {
            id: checkInCard.id,
            firstName: checkInCard.firstName,
            lastName: checkInCard.lastName
        });

        if (!checkInCard.reservation) {
            console.log("🚫 Verify: CheckInCard is not associated with any reservation.", checkInCardId);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session: No reservation linked" },
                { status: 401 }
            );
        }

        if (!checkInCard.reservation.apartment) {
            console.log("🚫 Verify: Reservation is not associated with any apartment.", checkInCard.reservation.id);
            return NextResponse.json(
                { authenticated: false, error: "Invalid session: No apartment linked to reservation" },
                { status: 401 }
            );
        }

        const apartmentSlugFromDB = checkInCard.reservation.apartment.slug;
        if (apartmentSlugFromDB !== apartmentSlugFromQuery) {
            console.log(
                "🚫 Verify: Apartment slug mismatch! From DB:", apartmentSlugFromDB,
                ", From Query:", apartmentSlugFromQuery
            );
            return NextResponse.json(
                { authenticated: false, error: "Session-apartment mismatch" },
                { status: 403 } // Forbidden, as session is for a different apartment
            );
        }
        console.log("🔑 Verify: Apartment slug matches DB and Query:", apartmentSlugFromDB);

        // Sesja jest ważna do 10:00 dnia wymeldowania
        const sessionActuallyExpiresAt = new Date(checkInCard.reservation.end);
        sessionActuallyExpiresAt.setUTCHours(10, 0, 0, 0);

        if (new Date() > sessionActuallyExpiresAt) {
            console.log("🚫 Verify: Session has expired based on reservation end date.", {
                now: new Date().toISOString(),
                expires: sessionActuallyExpiresAt.toISOString()
            });
            return NextResponse.json(
                { authenticated: false, error: "Session expired" },
                { status: 401 }
            );
        }
        console.log("✅ Verify: Session is valid and active.");

        const now = new Date();
        const reservationStartDate = new Date(checkInCard.reservation.start);
        reservationStartDate.setUTCHours(15, 0, 0, 0); // Meldunek od 15:00

        // UWAGA: Model CheckInCard nie ma jeszcze pola `checkInActual` (data faktycznego meldunku)
        // To pole jest potrzebne do poprawnego działania `shouldShowCheckInButton`
        // Załóżmy na razie, że jeśli karta istnieje, to gość się zameldował (dla uproszczenia)
        // W prawdziwym scenariuszu, `/api/guest-checkin` powinno ustawiać `checkInActual`.
        // const guestHasActuallyCheckedIn = checkInCard.checkInDate; // Placeholder - powinno być pole np. `checkInActualTimestamp`

        // UPDATED: Use actualCheckInTime to determine if guest has checked in
        const guestHasActuallyCheckedIn = !!checkInCard.actualCheckInTime;

        const shouldShowCheckInButton = !guestHasActuallyCheckedIn && now >= reservationStartDate;

        const isPrimaryGuest = typeof checkInCard.isPrimaryGuest === 'boolean' ? checkInCard.isPrimaryGuest : true;

        return NextResponse.json({
            authenticated: true,
            apartmentSlug: apartmentSlugFromDB,
            reservation: {
                start: checkInCard.reservation.start.toISOString(),
                end: checkInCard.reservation.end.toISOString(),
                guest: checkInCard.reservation.guest,
                apartment: checkInCard.reservation.apartment ? {
                    id: checkInCard.reservation.apartment.id,
                    name: checkInCard.reservation.apartment.name,
                    slug: checkInCard.reservation.apartment.slug
                } : undefined
            },
            checkInCard: {
                firstName: checkInCard.firstName,
                lastName: checkInCard.lastName,
                isPrimaryGuest: isPrimaryGuest,
                actualCheckInTime: checkInCard.actualCheckInTime?.toISOString() ?? null
            },
            shouldShowCheckIn: shouldShowCheckInButton,
            canCheckInFrom: reservationStartDate.toISOString(),
            sessionExpiresAt: sessionActuallyExpiresAt.toISOString(),
        });

    } catch (error) {
        console.error("🆘 Critical error in Guest Auth Verify API:", error);
        let errorMessage = "An unexpected server error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { authenticated: false, error: "Server error during session verification", details: errorMessage },
            { status: 500 },
        );
    }
} 