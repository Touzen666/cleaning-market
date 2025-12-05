import { NextResponse } from "next/server";
import { createTRPCContext } from "@/server/api/trpc";
import { createCaller } from "@/server/api/root";
import { env } from "@/env";

export const runtime = "nodejs";

export async function GET(req: Request) {
    try {
        // Prepare headers for context; inject CRON auth for the public cron procedure
        const headers = new Headers(req.headers);
        if (env.CRON_SECRET) {
            headers.set("authorization", `Bearer ${env.CRON_SECRET}`);
        }

        const ctx = await createTRPCContext({ headers });
        const trpc = createCaller(ctx);

        const result = await trpc.idobooking.syncReservationsCron({});
        return NextResponse.json(result);
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error during cron sync";
        return NextResponse.json(
            { success: false, message },
            { status: 500 },
        );
    }
}


