import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const apartmentsRouter = createTRPCRouter({
    getAll: publicProcedure
        .output(z.object({
            success: z.boolean(),
            apartments: z.array(z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
            }))
        }))
        .query(async ({ ctx }) => {
            try {
                console.log("🚀 tRPC apartments.getAll called");

                const apartments = await ctx.db.apartment.findMany({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                    },
                    orderBy: {
                        name: 'asc',
                    },
                });

                return {
                    success: true,
                    apartments: apartments.map(apt => ({
                        ...apt,
                        id: apt.id.toString(),
                    })),
                };
            } catch (error) {
                console.error("❌ Error fetching apartments:", error);
                throw new Error("Błąd podczas pobierania apartamentów");
            }
        }),

    getDetails: publicProcedure
        .input(z.object({
            slug: z.string().min(1, "Apartment slug is required")
        }))
        .output(z.object({
            success: z.boolean(),
            name: z.string().optional(),
            error: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            console.log(`[tRPC apartments.getDetails] Requested details for slug: ${input.slug}`);

            try {
                const apartment = await ctx.db.apartment.findUnique({
                    where: {
                        slug: input.slug,
                    },
                    select: {
                        name: true,
                    },
                });

                if (!apartment) {
                    console.log(`[tRPC apartments.getDetails] Apartment not found for slug: ${input.slug}`);
                    return {
                        success: false,
                        error: "Apartment not found"
                    };
                }

                console.log(`[tRPC apartments.getDetails] Found apartment: ${apartment.name} for slug: ${input.slug}`);
                return {
                    success: true,
                    name: apartment.name,
                };

            } catch (error) {
                console.error(`[tRPC apartments.getDetails] Error fetching apartment details for slug ${input.slug}:`, error);
                throw new Error("Server error fetching apartment details");
            }
        }),
}); 