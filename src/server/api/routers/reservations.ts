import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

export const reservationsRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.object({
      ok: z.boolean(),
      count: z.number(),
    }))
    .query(async ({ ctx }) => {
      try {
        console.log('tRPC reservations.getAll called');

        // Pobierz rezerwacje z bazy danych przez Prisma
        const reservations = await ctx.db.reservation.findMany({
          orderBy: { createDate: 'desc' }
        });

        return {
          ok: true,
          count: reservations.length
        };

      } catch (error) {
        console.error('Error fetching reservations:', error);
        throw new Error('Failed to fetch reservations');
      }
    }),
});
