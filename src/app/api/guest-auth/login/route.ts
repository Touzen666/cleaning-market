import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

interface GuestLoginPayload {
    firstName: string;
    lastName: string;
    documentNumber: string;
    apartmentSlug: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as GuestLoginPayload;
        console.log("[API /guest-auth/login] Received login request body:", body);

        // Validate required fields
        if (!body.firstName || !body.lastName || !body.documentNumber || !body.apartmentSlug) {
            return NextResponse.json(
                { success: false, error: "Wszystkie pola są wymagane" },
                { status: 400 }
            );
        }

        const firstNameQuery = body.firstName.trim();
        const lastNameQuery = body.lastName.trim();
        const documentNumberQuery = body.documentNumber.trim();
        const apartmentSlugQuery = body.apartmentSlug; // Slugs are typically case-sensitive and shouldn't be trimmed if they can contain spaces (though unlikely for slugs)
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

        console.log("[API /guest-auth/login] Querying CheckInCard with (case-insensitive for name/doc):", {
            firstName: firstNameQuery,
            lastName: lastNameQuery,
            documentNumber: documentNumberQuery,
            submittedApartmentIdentifier: apartmentSlugQuery,
            checkInDate_gte: sixtyDaysAgo.toISOString()
        });

        // Find check-in card matching the credentials
        const checkInCard = await prisma.checkInCard.findFirst({
            where: {
                firstName: { equals: firstNameQuery, mode: 'insensitive' },
                lastName: { equals: lastNameQuery, mode: 'insensitive' },
                documentNumber: { equals: documentNumberQuery, mode: 'insensitive' },
                submittedApartmentIdentifier: apartmentSlugQuery,
                // Only allow login for current or recent check-ins (within last 60 days)
                checkInDate: {
                    gte: sixtyDaysAgo
                }
            },
            include: {
                reservation: true
            }
        });

        console.log("[API /guest-auth/login] CheckInCard found:", checkInCard);

        if (!checkInCard) {
            return NextResponse.json(
                { success: false, error: "Nieprawidłowe dane logowania, upewnij się że wprowadzone dane są poprawne oraz że pobyt się jeszcze nie zakończył" },
                { status: 401 }
            );
        }

        // Check if guest has an active reservation
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (checkInCard.reservation) {
            const reservationEnd = new Date(checkInCard.reservation.end);
            reservationEnd.setHours(23, 59, 59, 999);

            if (today > reservationEnd) {
                return NextResponse.json(
                    { success: false, error: "Twój pobyt już się zakończył" },
                    { status: 403 }
                );
            }
        }

        // Skip session database operations until migration is complete
        // TODO: Add back after running: npm run db:push
        /*
        // Deactivate any existing sessions for this guest
        await prisma.guestSession.updateMany({
            where: {
                checkInCardId: checkInCard.id,
                isActive: true
            },
            data: {
                isActive: false
            }
        });

        const guestSession = await prisma.guestSession.create({
            data: {
                checkInCardId: checkInCard.id,
                apartmentSlug: body.apartmentSlug,
                expiresAt: sessionExpiry,
                isActive: true
            }
        });
        */

        // Create new guest session (expires when reservation ends, or in 24 hours if no reservation)
        let sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

        if (checkInCard.reservation) {
            const reservationEnd = new Date(checkInCard.reservation.end);
            reservationEnd.setHours(23, 59, 59, 999);
            sessionExpiry = reservationEnd;
        }

        // Set secure HTTP-only cookie with session ID (simple token for now)
        const cookieStore = await cookies();
        const sessionToken = `guest-${checkInCard.id}-${Date.now()}`;

        cookieStore.set('guest-session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            expires: sessionExpiry,
            path: '/'
        });

        return NextResponse.json({
            success: true,
            data: {
                sessionId: sessionToken,
                expiresAt: sessionExpiry.toISOString(),
                apartmentSlug: body.apartmentSlug
            }
        });

    } catch (error) {
        console.error("Guest login error:", error);
        return NextResponse.json(
            { success: false, error: "Wystąpił błąd serwera" },
            { status: 500 }
        );
    }
} 