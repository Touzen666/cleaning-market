import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request: Request) {
    console.log("🚀 API /api/apartments called (to list all apartments)");
    try {
        const apartments = await prisma.apartment.findMany({
            select: {
                name: true,
                slug: true,
                // Można dodać inne potrzebne pola w przyszłości
            },
            orderBy: {
                name: 'asc', // Sortuj alfabetycznie według nazwy
            }
        });

        if (!apartments || apartments.length === 0) {
            console.log("ℹ️ No apartments found in the database.");
            return NextResponse.json({ success: true, apartments: [] });
        }

        console.log(`✅ Found ${apartments.length} apartments.`);
        return NextResponse.json({ success: true, apartments: apartments });

    } catch (error) {
        console.error("🆘 Critical error in /api/apartments:", error);
        let errorMessage = "An unexpected server error occurred while fetching apartments.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return NextResponse.json(
            { success: false, error: errorMessage, apartments: [] },
            { status: 500 },
        );
    }
} 