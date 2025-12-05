import { NextResponse, type NextRequest } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { appRouter } from "@/server/api/root";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).slice(2);

    try {
        // Optional: secure with CRON_SECRET in production
        const cronSecret = process.env.CRON_SECRET;
        if (process.env.NODE_ENV === "production" && cronSecret) {
            const auth = request.headers.get("authorization");
            if (auth !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
            }
        }

        console.log(`🕗 [CRON] Daily sync start | id=${requestId}`);

        // Zakres: ostatnie 90 dni → następne 365 dni
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 90);
        const end = new Date(now);
        end.setDate(end.getDate() + 365);
        console.log("🗓️ [CRON] Range:", { start: start.toISOString(), end: end.toISOString() });

        // Utwórz kontekst z nagłówkiem autoryzacji do weryfikacji CRON_SECRET w tRPC
        const headers = new Headers();
        if (process.env.CRON_SECRET) {
            headers.set("authorization", `Bearer ${process.env.CRON_SECRET}`);
        }
        const ctx = await createTRPCContext({ headers });

        // Server-side caller do tRPC z pełną walidacją Zod i middleware
        const caller = appRouter.createCaller(ctx);
        const result = await caller.idobooking.syncReservationsCron({
            startDateISO: start.toISOString(),
            endDateISO: end.toISOString(),
        });

        const duration = Date.now() - startTime;
        console.log(`✅ [CRON] Daily sync done in ${duration}ms | id=${requestId}`);
        return NextResponse.json({ success: true, requestId, duration, result });
    } catch (error) {
        const duration = Date.now() - startTime;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ [CRON] Daily sync failed in ${duration}ms | id=${requestId}:`, message);
        return NextResponse.json({ success: false, error: message, requestId, duration }, { status: 500 });
    }
}


