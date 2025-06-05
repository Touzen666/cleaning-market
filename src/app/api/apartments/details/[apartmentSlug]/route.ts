import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(
    _request: Request,
    context: { params: Promise<{ apartmentSlug: string }> }
) {
    const resolvedParams = await context.params;
    const { apartmentSlug } = resolvedParams;
    console.log(`[API /api/apartments/details] Requested details for slug: ${apartmentSlug}`);

    if (!apartmentSlug) {
        console.log("[API /api/apartments/details] Error: apartmentSlug is missing.");
        return NextResponse.json(
            { success: false, error: "Apartment slug is required" },
            { status: 400 },
        );
    }

    try {
        const apartment = await prisma.apartment.findUnique({
            where: {
                slug: apartmentSlug,
            },
            select: { // Wybieramy tylko te pola, które chcemy zwrócić
                name: true,
                // W przyszłości można dodać inne publicznie dostępne pola
                // np. city: true, mainImageUrl: true, etc.
            },
        });

        if (!apartment) {
            console.log(`[API /api/apartments/details] Apartment not found for slug: ${apartmentSlug}`);
            return NextResponse.json(
                { success: false, error: "Apartment not found" },
                { status: 404 },
            );
        }

        console.log(`[API /api/apartments/details] Found apartment: ${apartment.name} for slug: ${apartmentSlug}`);
        return NextResponse.json({
            success: true,
            name: apartment.name,
            // Można rozważyć zwracanie również slugu dla spójności
            // slug: apartmentSlug, 
        });

    } catch (error) {
        console.error(`[API /api/apartments/details] Error fetching apartment details for slug ${apartmentSlug}:`, error);
        let errorMessage = "An unexpected server error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { success: false, error: "Server error fetching apartment details", details: errorMessage },
            { status: 500 },
        );
    }
} 