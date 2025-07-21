import { db } from "@/server/db";
import {
    getReservations,
    mapToDBReservations,
} from "@/server/api/routers/idobooking";
import { type createTRPCContext } from "@/server/api/trpc";

/**
 * Funkcja do synchronizacji rezerwacji z IdoBooking.
 * Zaprojektowana do uruchamiania w tle (np. przez cron job).
 */
export async function syncIdobookingReservations(params?: {
    modificationDateFrom?: string;
}) {
    console.log("[CRON] Rozpoczęto zadanie synchronizacji rezerwacji z IdoBooking...");
    try {
        // Tworzymy "sztuczny" kontekst tRPC, aby mieć dostęp do bazy danych
        // @ts-expect-error - celowo nie przekazujemy pełnego obiektu `opts`
        const ctx = await createTRPCContext({ session: null, headers: new Headers() });

        if (params?.modificationDateFrom) {
            console.log(`[CRON] Pobieranie rezerwacji zmodyfikowanych od ${params.modificationDateFrom}...`);
        } else {
            console.log("[CRON] Pobieranie wszystkich rezerwacji z API IdoBooking (pełna synchronizacja)...");
        }
        const reservations = await getReservations(params);
        console.log(`[CRON] Pobrano ${reservations.length} rezerwacji. Rozpoczynanie mapowania...`);
        await mapToDBReservations(reservations, ctx);
        console.log("✅ [CRON] Synchronizacja rezerwacji zakończona pomyślnie.");
        return { success: true };
    } catch (error) {
        console.error("❌ [CRON] Wystąpił krytyczny błąd podczas synchronizacji rezerwacji:", error);
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
} 