import { NextResponse, type NextRequest } from "next/server";
import { syncIdobookingReservations } from "@/lib/cron";

export async function GET(request: NextRequest) {
    // Tutaj możesz dodać zabezpieczenie, np. sprawdzając secret key
    // const authHeader = request.headers.get("authorization");
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response("Unauthorized", { status: 401 });
    // }

    console.log("CRON: Rozpoczęto ręczne wywołanie synchronizacji rezerwacji.");
    try {
        const result = await syncIdobookingReservations();
        if (result.success) {
            console.log("CRON: Synchronizacja zakończona pomyślnie.");
            return NextResponse.json({ success: true, message: "Synchronizacja zakończona pomyślnie." });
        } else {
            console.error("CRON: Synchronizacja zakończyła się błędem:", result.error);
            return NextResponse.json({ success: false, error: result.error }, { status: 500 });
        }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";
        console.error("CRON: Wystąpił krytyczny błąd podczas synchronizacji:", errorMessage);
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
} 