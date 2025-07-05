import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Reservation } from "@prisma/client";

// Schema for creating a new reservation
const createReservationSchema = z.object({
  guest: z.string().min(1, "Nazwa gościa jest wymagana"),
  start: z.date(),
  end: z.date(),
  apartmentId: z.number(),
  adults: z.number().min(1, "Liczba dorosłych musi być większa od 0").default(1),
  children: z.number().min(0).default(0),
  paymantValue: z.number().min(0, "Wartość płatności nie może być ujemna"),
  currency: z.string().default("PLN"),
  payment: z.string().default("Unknown"),
  status: z.string().default("CONFIRMED"),
  source: z.string().default("admin-created"),
});

export const reservationsRouter = createTRPCRouter({
  getAll: publicProcedure
    .output(z.object({
      reservations: z.array(z.custom<Reservation>()),
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
          reservations,
          ok: true,
          count: reservations.length
        };

      } catch (error) {
        console.error('Error fetching reservations:', error);
        throw new Error('Failed to fetch reservations');
      }
    }),

  // Get reservations by apartment ID
  getByApartmentId: publicProcedure
    .input(z.object({ apartmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const reservations = await ctx.db.reservation.findMany({
        where: { apartmentId: input.apartmentId },
        orderBy: { start: 'desc' },
        include: {
          apartment: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });

      return reservations;
    }),

  // Create new reservation (admin function)
  create: publicProcedure
    .input(createReservationSchema)
    .mutation(async ({ input, ctx }) => {
      const { apartmentId, start, end, ...reservationData } = input;

      // Validate dates
      if (start >= end) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Data początkowa musi być wcześniejsza niż data końcowa",
        });
      }

      // Check if apartment exists
      const apartment = await ctx.db.apartment.findUnique({
        where: { id: apartmentId },
      });

      if (!apartment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Apartament nie został znaleziony",
        });
      }

      // Check for overlapping reservations
      const overlappingReservations = await ctx.db.reservation.count({
        where: {
          apartmentId,
          OR: [
            {
              start: { lte: start },
              end: { gt: start },
            },
            {
              start: { lt: end },
              end: { gte: end },
            },
            {
              start: { gte: start },
              end: { lte: end },
            },
          ],
        },
      });

      if (overlappingReservations > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "W wybranym terminie apartament jest już zarezerwowany",
        });
      }

      // Create reservation
      const reservation = await ctx.db.reservation.create({
        data: {
          ...reservationData,
          apartmentId,
          start,
          end,
          createDate: new Date(),
          apartmentName: apartment.name,
          address: apartment.address,
        },
        include: {
          apartment: {
            select: {
              name: true,
              address: true,
            },
          },
        },
      });

      return reservation;
    }),
});
