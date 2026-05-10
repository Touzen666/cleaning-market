/**
 * Jednorazowa synchronizacja rezerwacji z IdoBooking do bazy (bez sesji HTTP / tRPC).
 * Użycie: npm run sync:idobooking
 *
 * Zmienne środowiskowe: npm dodaje `--env-file-if-exists=.env` (patrz package.json).
 */
import { db } from "../src/server/db";
import { internalSync, type IdobookingSyncCtx } from "../src/server/api/routers/idobooking";

async function main() {
    const ctx: IdobookingSyncCtx = { db };

    console.log("[sync-idobooking] Start internalSync…");
    const result = await internalSync(ctx, {});
    console.log("[sync-idobooking]", result.message);
}

main()
    .catch((e) => {
        console.error("[sync-idobooking] Błąd:", e);
        process.exitCode = 1;
    })
    .finally(() => db.$disconnect());
