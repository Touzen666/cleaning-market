import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";

type RoomRow = {
    id: number;
    apartmentId: number;
    code: string;
    name: string;
    slug: string;
    address: string;
    defaultRentAmount: number | null;
    defaultUtilitiesAmount: number | null;
    weeklyLaundryCost: number | null;
    hasBalcony: boolean;
    hasParking: boolean;
    maxGuests: number | null;
};

type RoomClient = {
    findUnique: (args: unknown) => Promise<RoomRow | null>;
    findFirst: (args: unknown) => Promise<{ id: number } | null>;
    create: (args: unknown) => Promise<{ id: number }>;
    update: (args: unknown) => Promise<{ id: number }>;
};

export const roomsRouter = createTRPCRouter({
    listByApartmentId: publicProcedure
        .input(z.object({ apartmentId: z.number() }))
        .output(z.array(z.object({
            id: z.string(),
            code: z.string(),
            name: z.string(),
        })))
        .query(async ({ ctx, input }) => {
            type SimpleRoom = { id: number; code: string; name: string };
            type RoomClientList = { findMany: (args: unknown) => Promise<SimpleRoom[]> };
            const roomClient = (ctx.db as unknown as { room: RoomClientList }).room;
            const rooms = await roomClient.findMany({
                where: { apartmentId: input.apartmentId },
                select: { id: true, code: true, name: true },
                orderBy: { code: 'asc' },
            });
            return rooms.map(r => ({ id: r.id.toString(), code: r.code, name: r.name }));
        }),
    getById: publicProcedure
        .input(z.object({ id: z.string() }))
        .output(z.object({
            id: z.string(),
            apartmentId: z.string(),
            code: z.string(),
            name: z.string(),
            slug: z.string(),
            address: z.string(),
            defaultRentAmount: z.number().nullable(),
            defaultUtilitiesAmount: z.number().nullable(),
            weeklyLaundryCost: z.number().nullable(),
            hasBalcony: z.boolean(),
            hasParking: z.boolean(),
            maxGuests: z.number().nullable(),
            cleaningCosts: z.record(z.number()).nullable().optional(),
            apartmentPrimaryImageUrl: z.string().nullable(),
        }))
        .query(async ({ ctx, input }) => {
            const idNum = Number(input.id);
            const roomClient = (ctx.db as unknown as { room: RoomClient }).room;
            const room = await roomClient.findUnique({
                where: { id: idNum },
                select: {
                    id: true,
                    apartmentId: true,
                    code: true,
                    name: true,
                    slug: true,
                    address: true,
                    defaultRentAmount: true,
                    defaultUtilitiesAmount: true,
                    weeklyLaundryCost: true,
                    hasBalcony: true,
                    hasParking: true,
                    maxGuests: true,
                },
            });
            if (!room) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Pokój nie istnieje" });
            }
            // Fetch parent apartment primary image for presentation
            const parent = await ctx.db.apartment.findUnique({
                where: { id: room.apartmentId },
                select: {
                    images: {
                        where: { isPrimary: true },
                        take: 1,
                        select: { url: true },
                    },
                },
            });
            return {
                id: room.id.toString(),
                apartmentId: room.apartmentId.toString(),
                code: room.code,
                name: room.name,
                slug: room.slug,
                address: room.address,
                defaultRentAmount: room.defaultRentAmount,
                defaultUtilitiesAmount: room.defaultUtilitiesAmount,
                weeklyLaundryCost: room.weeklyLaundryCost,
                hasBalcony: room.hasBalcony,
                hasParking: room.hasParking,
                maxGuests: room.maxGuests,
                cleaningCosts: null,
                apartmentPrimaryImageUrl: parent?.images?.[0]?.url ?? null,
            };
        }),

    update: protectedProcedure
        .input(z.object({
            id: z.string(),
            name: z.string(),
            address: z.string(),
            defaultRentAmount: z.number(),
            defaultUtilitiesAmount: z.number(),
            weeklyLaundryCost: z.number(),
            hasBalcony: z.boolean(),
            hasParking: z.boolean(),
            maxGuests: z.number(),
            cleaningCosts: z.record(z.number()).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({ code: "FORBIDDEN", message: "Tylko administrator" });
            }
            const idNum = Number(input.id);
            const roomClient = (ctx.db as unknown as { room: RoomClient }).room;
            await roomClient.update({
                where: { id: idNum },
                data: {
                    name: input.name,
                    address: input.address,
                    defaultRentAmount: input.defaultRentAmount,
                    defaultUtilitiesAmount: input.defaultUtilitiesAmount,
                    weeklyLaundryCost: input.weeklyLaundryCost,
                    hasBalcony: input.hasBalcony,
                    hasParking: input.hasParking,
                    maxGuests: input.maxGuests,
                },
            });
            return { success: true };
        }),
});


