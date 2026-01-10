/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

function stripRoomFromName(apartmentName: string, roomCode?: string | null) {
    if (!apartmentName || !roomCode) return apartmentName;
    const esc = roomCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\s+${esc}\\.?$`);
    return apartmentName.replace(re, "");
}

export const cleaningRouter = createTRPCRouter({
    listJobs: publicProcedure
        .input(
            z
                .object({
                    daysAhead: z.number().min(1).max(30).default(7),
                    query: z.string().optional(),
                })
                .optional(),
        )
        .query(async ({ ctx, input }) => {
            // Require Cleaning Service auth (JWT set in ctx.cleaningAuth)
            if (!ctx.cleaningAuth?.userId) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }
            const daysAhead = input?.daysAhead ?? 7;
            const query = (input?.query ?? "").trim().toLowerCase();

            const now = new Date();
            const end = new Date();
            end.setDate(end.getDate() + daysAhead);

            const reservations = await ctx.db.reservation.findMany({
                where: {
                    start: { gte: now },
                    end: { lte: end },
                    NOT: {
                        status: { in: ["Anulowana", "Odrzucona przez obsługę"] },
                    },
                },
                orderBy: { start: "asc" },
                select: {
                    id: true,
                    start: true,
                    end: true,
                    address: true,
                    apartmentName: true,
                    itemCode: true,
                    status: true,
                    guest: true,
                    apartmentId: true,
                    cleanerUserId: true,
                },
            });

            // Wyznacz liczbę pokoi na apartament (jeśli mamy apartmentId)
            const apartmentIds = Array.from(
                new Set(
                    reservations
                        .map((r) => r.apartmentId)
                        .filter((id): id is number => typeof id === "number"),
                ),
            );
            const roomCounts =
                apartmentIds.length > 0
                    ? await ctx.db.room.groupBy({
                        by: ["apartmentId"],
                        where: { apartmentId: { in: apartmentIds } },
                        _count: { apartmentId: true },
                    })
                    : [];
            const apartmentIdToRoomCount = new Map<number, number>(
                roomCounts.map((rc) => [rc.apartmentId, rc._count.apartmentId]),
            );
            // Pobierz główne zdjęcia apartamentów (miniatury)
            const apartmentsWithImages =
                apartmentIds.length > 0
                    ? await ctx.db.apartment.findMany({
                        where: { id: { in: apartmentIds } },
                        select: {
                            id: true,
                            address: true,
                            images: {
                                where: { isPrimary: true },
                                take: 1,
                                select: { url: true },
                            },
                        },
                    })
                    : [];
            const apartmentIdToPrimaryImage = new Map<number, string | null>(
                apartmentsWithImages.map((a) => [a.id, a.images?.[0]?.url ?? null]),
            );
            const apartmentIdToAddress = new Map<number, string | null>(
                apartmentsWithImages.map((a) => [a.id, a.address ?? null]),
            );

            const mapped = reservations
                .map((r) => ({
                    id: r.id,
                    startISO: r.start.toISOString(),
                    endISO: r.end.toISOString(),
                    dateLabel: r.start.toLocaleDateString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                    }),
                    // Biznesowe założenie: check-in 15:00 w dniu startu, check-out 10:00 w dniu zakończenia
                    checkInLabel:
                        r.start.toLocaleDateString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                        }) + " • 15:00",
                    checkOutLabel:
                        r.end.toLocaleDateString("pl-PL", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                        }) + " • 10:00",
                    address:
                        (typeof r.apartmentId === "number"
                            ? apartmentIdToAddress.get(r.apartmentId) ?? null
                            : null) ?? r.address,
                    apartmentName: r.apartmentName,
                    displayApartmentName: stripRoomFromName(r.apartmentName ?? "", r.itemCode ?? undefined),
                    roomCode: r.itemCode,
                    status: r.status,
                    guest: r.guest,
                    roomCount:
                        (typeof r.apartmentId === "number"
                            ? apartmentIdToRoomCount.get(r.apartmentId)
                            : undefined) ?? 1,
                    imageUrl:
                        typeof r.apartmentId === "number"
                            ? apartmentIdToPrimaryImage.get(r.apartmentId) ?? null
                            : null,
                }))
                .filter((j) => {
                    if (!query) return true;
                    const blob =
                        (j.apartmentName ?? "") +
                        " " +
                        (j.address ?? "") +
                        " " +
                        (j.roomCode ?? "") +
                        " " +
                        (j.guest ?? "");
                    return blob.toLowerCase().includes(query);
                });

            return {
                jobs: mapped.map((j) => ({
                    ...j,
                    showRoom: (j.roomCount ?? 1) > 1 && !!j.roomCode,
                    cleanerUserId: reservations.find((r) => r.id === j.id)?.cleanerUserId ?? null,
                })),
            };
        }),

    // KALENDARZ: zwraca rezerwacje w zadanym zakresie z godzinami check-in/out
    calendar: publicProcedure
        .input(
            z.object({
                start: z.string(), // ISO date (yyyy-mm-dd or full ISO)
                end: z.string(),   // ISO date
                apartmentId: z.number().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            if (!ctx.cleaningAuth?.userId) {
                throw new TRPCError({ code: "UNAUTHORIZED" });
            }
            const start = new Date(input.start);
            const end = new Date(input.end);

            const andConditions: Array<Record<string, unknown>> = [
                { start: { lte: end } },
                { end: { gte: start } },
                { NOT: { status: { in: ["Anulowana", "Odrzucona przez obsługę"] } } },
            ];
            if (typeof input.apartmentId === "number") {
                andConditions.push({ apartmentId: input.apartmentId });
            }
            const where = { AND: andConditions };

            const reservations = await ctx.db.reservation.findMany({
                where,
                orderBy: { start: "asc" },
                select: {
                    id: true,
                    start: true,
                    end: true,
                    apartmentName: true,
                    apartmentId: true,
                    itemCode: true,
                    guest: true,
                },
            });

            // Ustal liczbę pokoi dla każdego apartamentu (jak w listJobs)
            const apartmentIds = Array.from(
                new Set(
                    reservations
                        .map((r) => r.apartmentId)
                        .filter((id): id is number => typeof id === "number"),
                ),
            );
            const roomCounts =
                apartmentIds.length > 0
                    ? await ctx.db.room.groupBy({
                        by: ["apartmentId"],
                        where: { apartmentId: { in: apartmentIds } },
                        _count: { apartmentId: true },
                    })
                    : [];
            const apartmentIdToRoomCount = new Map<number, number>(
                roomCounts.map((rc) => [rc.apartmentId, rc._count.apartmentId]),
            );

            const makeDateAt = (d: Date, hours: number, minutes: number) => {
                const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hours, minutes, 0, 0));
                return x;
            };

            const events = reservations.map((r) => {
                // Biznesowo: 15:00 w dniu startu, 10:00 w dniu zakończenia
                const checkIn = makeDateAt(r.start, 15, 0);
                const checkOut = makeDateAt(r.end, 10, 0);
                const roomCount =
                    (typeof r.apartmentId === "number"
                        ? apartmentIdToRoomCount.get(r.apartmentId)
                        : undefined) ?? 1;
                return {
                    id: r.id,
                    apartmentId: r.apartmentId ?? null,
                    apartmentName: r.apartmentName,
                    roomCode: r.itemCode ?? null,
                    showRoom: roomCount > 1 && !!r.itemCode,
                    guest: r.guest ?? null,
                    start: r.start,
                    end: r.end,
                    checkIn,
                    checkOut,
                };
            });

            return { events };
        }),

    // Ręczna synchronizacja rezerwacji + mapowanie; wywołuje wewnętrzny endpoint crona
    syncNow: publicProcedure
        .input(
            z
                .object({
                    daysBack: z.number().min(0).max(365).default(90),
                    daysAhead: z.number().min(1).max(730).default(365),
                })
                .optional(),
        )
        .mutation(async ({ ctx, input }) => {
            // Pozwól tylko adminowi systemu lub CLEANING_ADMIN
            const isCleaningAdmin = ctx.cleaningAuth?.role === "CLEANING_ADMIN";
            const isAppAdmin = !!ctx.session?.user && (ctx.session.user as { type?: string }).type === "ADMIN";
            if (!isCleaningAdmin && !isAppAdmin) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Brak uprawnień do synchronizacji" });
            }

            const daysBack = input?.daysBack ?? 90;
            const daysAhead = input?.daysAhead ?? 365;
            const now = new Date();
            const start = new Date(now);
            start.setDate(start.getDate() - daysBack);
            const end = new Date(now);
            end.setDate(end.getDate() + daysAhead);

            // Wywołaj route cron (HTTP) z CRON_SECRET
            const baseUrl =
                (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
                process.env.NEXTAUTH_URL ??
                process.env.NEXT_PUBLIC_APP_URL ??
                "http://localhost:3000";
            const res = await fetch(`${baseUrl}/api/cron/daily-sync`, {
                method: "GET",
                headers: {
                    authorization: env.CRON_SECRET ? `Bearer ${env.CRON_SECRET}` : "",
                },
            });
            if (!res.ok) {
                const msg = await res.text().catch(() => res.statusText);
                throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Sync failed: ${msg}` });
            }
            const payload: unknown = await res.json().catch(() => ({} as unknown));
            return { success: true, result: payload };
        }),

    listCleaners: adminProcedure.query(async ({ ctx }) => {
        const users = await ctx.db.cleaningUser.findMany({
            orderBy: { email: "asc" },
            select: { id: true, email: true, role: true },
        });
        return users;
    }),

    assignCleaner: adminProcedure
        .input(z.object({ reservationId: z.number(), cleanerId: z.number().nullable() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.reservation.update({
                where: { id: input.reservationId },
                data: { cleanerUserId: input.cleanerId ?? null },
            });
            return { success: true };
        }),

    // Prosta lista apartamentów do dropdownu
    listApartmentsBasic: adminProcedure.query(async ({ ctx }) => {
        const apts = await ctx.db.apartment.findMany({
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        });
        return apts.map(a => ({ id: a.id, name: a.name }));
    }),
});


