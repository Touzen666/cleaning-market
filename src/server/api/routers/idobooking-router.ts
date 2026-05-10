import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";
import { env } from "@/env";
import {
    getSources,
    internalSync,
    syncResponseSchema,
} from "@/server/api/routers/idobooking";

export const idobookingRouter = createTRPCRouter({
    syncReservations: protectedProcedure
        .output(syncResponseSchema)
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą synchronizować rezerwacje.",
                });
            }

            const startTime = Date.now();
            const syncId = Math.random().toString(36).substring(7);

            console.log("🔧 [SYNC-TRPC] ===== ROZPOCZĘCIE SYNCHRONIZACJI tRPC =====");
            console.log("🔧 [SYNC-TRPC] Użytkownik:", ctx.session.user.email);
            console.log("🔧 [SYNC-TRPC] Typ użytkownika:", ctx.session.user.type);
            console.log("🔧 [SYNC-TRPC] Sync ID:", syncId);
            console.log("🔧 [SYNC-TRPC] NODE_ENV:", process.env.NODE_ENV);
            console.log("🔧 [SYNC-TRPC] Timestamp:", new Date().toISOString());

            try {
                const result = await internalSync(ctx);
                console.log("🔧 [SYNC-TRPC] ✅ Synchronizacja zakończona pomyślnie.");
                console.log("🔧 [SYNC-TRPC] Czas wykonania:", result.duration);
                console.log("🔧 [SYNC-TRPC] ===== ZAKOŃCZENIE SYNCHRONIZACJI tRPC (SUCCESS) =====");
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";

                console.error("🔧 [SYNC-TRPC] ❌ Wystąpił błąd podczas synchronizacji:", {
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                    syncId,
                    duration: `${duration}ms`,
                });
                console.log("🔧 [SYNC-TRPC] ===== ZAKOŃCZENIE SYNCHRONIZACJI tRPC (ERROR) =====");

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Błąd synchronizacji: ${errorMessage}`,
                });
            }
        }),
    syncReservationsCron: publicProcedure
        .input(z.object({ startDateISO: z.string().optional(), endDateISO: z.string().optional() }).optional())
        .output(syncResponseSchema)
        .mutation(async ({ ctx, input }) => {
            if (env.CRON_SECRET) {
                const auth = ctx.headers.get?.("authorization");
                const ok = auth === `Bearer ${env.CRON_SECRET}`;
                if (!ok) {
                    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid CRON secret" });
                }
            }

            return internalSync(ctx, {
                startDateISO: input?.startDateISO,
                endDateISO: input?.endDateISO,
            });
        }),
    getReservationSources: protectedProcedure.mutation(async ({ ctx }) => {
        if (ctx.session.user.type !== UserType.ADMIN) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Tylko administratorzy mogą wykonywać tę akcję.",
            });
        }

        try {
            const sources = await getSources();
            return {
                success: true,
                sources: sources,
            };
        } catch (error) {
            console.error("🚨 Wystąpił błąd podczas pobierania źródeł rezerwacji:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: errorMessage,
            });
        }
    }),
});
