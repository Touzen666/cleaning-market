import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

interface GuestCheckInPayload {
    apartmentSlug: string;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as GuestCheckInPayload;

        if (!body.apartmentSlug) {
            return NextResponse.json(
                { success: false, error: "Missing apartment slug" },
                { status: 400 }
            );
        }

        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('guest-session');

        if (!sessionCookie) {
            return NextResponse.json(
                { success: false, error: "No active session" },
                { status: 401 }
            );
        }

        // Find the guest's check-in card
        const checkInCard = await prisma.checkInCard.findFirst({
            where: {
                submittedApartmentIdentifier: body.apartmentSlug,
                checkInDate: {
                    gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // Last 60 days
                }
            },
            include: {
                reservation: true
            },
            orderBy: {
                checkInDate: 'desc'
            }
        });

        if (!checkInCard || !checkInCard.reservation) {
            return NextResponse.json(
                { success: false, error: "No valid check-in card or reservation found" },
                { status: 404 }
            );
        }

        // Check if it's the right time to check in (3 PM on start date or later)
        const now = new Date();
        const reservationStart = new Date(checkInCard.reservation.start);
        const reservationEnd = new Date(checkInCard.reservation.end);

        const canCheckInFrom = new Date(reservationStart);
        canCheckInFrom.setHours(15, 0, 0, 0);

        const checkoutTime = new Date(reservationEnd);
        checkoutTime.setHours(10, 0, 0, 0);

        // NEW: Check if already officially checked in
        if (checkInCard.actualCheckInTime) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Już się zameldowałeś.",
                    details: `Data zameldowania: ${checkInCard.actualCheckInTime?.toLocaleString('pl-PL')}`
                },
                { status: 409 } // Conflict - already checked in
            );
        }

        if (now < canCheckInFrom) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Meldowanie możliwe od ${canCheckInFrom.toLocaleString('pl-PL')}`
                },
                { status: 403 }
            );
        }

        if (now > checkoutTime) {
            return NextResponse.json(
                { success: false, error: "Czas pobytu już minął" },
                { status: 403 }
            );
        }

        // Here you could add additional check-in logic:
        // - Update check-in status in database
        // - Send notifications
        // - Log the check-in event
        // - Generate access codes, etc.

        // For now, we'll just return success
        // You can add a field to CheckInCard model like 'officiallyCheckedIn' and update it here

        // UPDATED: Update the CheckInCard with the actual check-in time
        await prisma.checkInCard.update({
            where: { id: checkInCard.id },
            data: { actualCheckInTime: now },
        });

        return NextResponse.json({
            success: true,
            message: "Meldowanie zakończone pomyślnie!",
            data: {
                checkInTime: now.toISOString(),
                apartmentSlug: body.apartmentSlug,
                guestName: `${checkInCard.firstName} ${checkInCard.lastName}`,
                checkoutTime: checkoutTime.toISOString()
            }
        });

    } catch (error) {
        console.error("Guest check-in error:", error);
        return NextResponse.json(
            { success: false, error: "Wystąpił błąd serwera" },
            { status: 500 }
        );
    }
} 