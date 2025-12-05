import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type Reservation } from "@prisma/client";
import { UserType } from "@prisma/client";

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

const reservationSchema = z.object({
  id: z.number(),
  start: z.date(),
  end: z.date(),
  status: z.string(),
  guest: z.string(),
});

const apartmentWithReservationsSchema = z.object({
  id: z.number(),
  name: z.string(),
  address: z.string(),
  imageUrl: z.string().nullable(),
  reservations: z.array(reservationSchema),
  parentApartmentId: z.number().optional(),
  parentApartmentName: z.string().optional(),
});

export const reservationsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(z.object({
      status: z.string().optional(),
    }).optional())
    .output(z.object({
      reservations: z.array(z.custom<Reservation>()),
      ok: z.boolean(),
      count: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        console.log('tRPC reservations.getAll called');

        // Przygotuj warunki filtrowania
        const where: { status?: string } = {};
        if (input?.status && input.status !== 'all') {
          where.status = input.status;
        }

        // Pobierz rezerwacje z bazy danych przez Prisma
        const reservations = await ctx.db.reservation.findMany({
          where,
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

  // Pobierz unikalne statusy rezerwacji
  getStatuses: publicProcedure
    .query(async ({ ctx }) => {
      try {
        const statuses = await ctx.db.reservation.findMany({
          select: { status: true },
          distinct: ['status'],
        });

        return statuses.map(s => s.status).sort();
      } catch (error) {
        console.error('Error fetching reservation statuses:', error);
        throw new Error('Failed to fetch reservation statuses');
      }
    }),

  // Get reservations by apartment ID
  getByApartmentId: publicProcedure
    .input(z.object({ apartmentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const reservations = await ctx.db.reservation.findMany({
        where: {
          apartmentId: input.apartmentId,
          NOT: {
            status: {
              in: ["Anulowana", "Odrzucona przez obsługę"],
            },
          },
        },
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

  updateReservationDetails: protectedProcedure
    .input(z.object({
      guestName: z.string().min(1, "Guest name cannot be empty."),
      newAmount: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.type !== UserType.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only administrators can perform this action.",
        });
      }

      const reservations = await ctx.db.reservation.findMany({
        where: {
          guest: {
            equals: input.guestName,
            mode: 'insensitive',
          },
        }
      });

      if (reservations.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `No reservation found for guest: ${input.guestName}`,
        });
      }

      if (reservations.length > 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Multiple reservations found for guest: ${input.guestName}. Please provide a more specific name.`
        })
      }

      const reservation = reservations[0]!;
      const originalSource = reservation.source;

      await ctx.db.$transaction(async (prisma) => {
        const updateData: { source: string; paymantValue?: number } = {
          source: "Airbnb",
        };

        if (input.newAmount !== undefined) {
          updateData.paymantValue = input.newAmount;
        }

        await prisma.reservation.update({
          where: {
            id: reservation.id,
          },
          data: updateData,
        });

        await prisma.reservation.updateMany({
          where: {
            source: originalSource,
            NOT: {
              id: reservation.id,
            },
          },
          data: {
            source: "Booking",
          },
        });
      });

      return {
        success: true,
        message: `Details for ${reservation.guest}'s reservation updated.`,
      };
    }),

  getForOwner: publicProcedure
    .input(z.object({ ownerEmail: z.string().email() }))
    .output(z.array(apartmentWithReservationsSchema))
    .query(async ({ ctx, input }) => {
      const { ownerEmail } = input;

      if (!ownerEmail) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Musisz być zalogowany, aby zobaczyć swoje rezerwacje.",
        });
      }

      // Narrow raw Prisma result to a safe, minimal shape to satisfy strict eslint rules
      type RoomReservationShape = {
        id: number;
        guest: string;
        start: Date;
        end: Date;
        status: string;
      };
      type RoomShape = {
        id: number;
        name: string | null;
        code: string;
        address: string | null;
        reservations: RoomReservationShape[];
      };
      type ApartmentShape = {
        id: number;
        name: string;
        address: string;
        images: Array<{ url: string | null }>;
        rooms: RoomShape[];
        reservations: RoomReservationShape[];
      };
      type OwnedAptsShape = {
        ownedApartments: Array<{ apartment: ApartmentShape }>;
      };
      const isOwnedAptsShape = (value: unknown): value is OwnedAptsShape => {
        return !!value && typeof value === "object" && Array.isArray((value as { ownedApartments?: unknown }).ownedApartments);
      };

      const ownerWithApartmentsRaw = await ctx.db.apartmentOwner.findUnique({
        where: { email: ownerEmail },
        include: {
          ownedApartments: {
            where: { isActive: true },
            include: {
              apartment: {
                include: {
                  // Primary apartment image (fallback for rooms without own images)
                  images: {
                    where: { isPrimary: true },
                    take: 1,
                  },
                  // Include rooms with their own reservations to show per-room calendars
                  rooms: {
                    include: {
                      reservations: {
                        where: {
                          NOT: {
                            status: {
                              in: ["Anulowana", "Odrzucona przez obsługę"],
                            },
                          },
                        },
                        orderBy: { start: "asc" },
                        select: {
                          id: true,
                          guest: true,
                          start: true,
                          end: true,
                          status: true,
                        },
                      },
                    },
                    orderBy: { code: "asc" },
                  },
                  // Keep apartment-level reservations for single-room apartments (legacy)
                  reservations: {
                    where: {
                      NOT: {
                        status: {
                          in: ["Anulowana", "Odrzucona przez obsługę"],
                        },
                      },
                    },
                    orderBy: { start: "asc" },
                    select: {
                      id: true,
                      guest: true,
                      start: true,
                      end: true,
                      status: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!ownerWithApartmentsRaw) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nie znaleziono właściciela.",
        });
      }
      if (!isOwnedAptsShape(ownerWithApartmentsRaw)) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Błąd danych właściciela apartamentów.",
        });
      }

      // Flatten into "calendar units":
      // - if apartment has multiple rooms -> one unit per room
      // - else -> single unit for apartment
      const ownedApts: OwnedAptsShape["ownedApartments"] =
        ownerWithApartmentsRaw.ownedApartments;

      const apartmentsData: Array<z.infer<typeof apartmentWithReservationsSchema>> = [];

      for (const ownership of ownedApts) {
        const apartment: ApartmentShape = ownership.apartment;
        const primaryImageUrl: string | null = apartment.images[0]?.url ?? null;
        const hasMultipleRooms: boolean = Array.isArray(apartment.rooms) && apartment.rooms.length > 1;

        if (hasMultipleRooms) {
          for (const room of apartment.rooms) {
            const reservations = room.reservations.map((res: RoomReservationShape) => ({
              id: res.id,
              start: res.start,
              end: res.end,
              status: res.status,
              guest: res.guest,
            }));

            apartmentsData.push({
              id: room.id,
              name: room.name ?? `${apartment.name} ${room.code}`,
              address: room.address ?? apartment.address,
              imageUrl: primaryImageUrl, // Fallback until Room images exist
              reservations,
              parentApartmentId: apartment.id,
              parentApartmentName: apartment.name,
            });
          }
          continue;
        }

        // Single-room or no-room apartments -> show as apartment
        const reservations = apartment.reservations.map((res: RoomReservationShape) => ({
          id: res.id,
          start: res.start,
          end: res.end,
          status: res.status,
          guest: res.guest,
        }));

        apartmentsData.push({
          id: apartment.id,
          name: apartment.name,
          address: apartment.address,
          imageUrl: primaryImageUrl,
          reservations,
          // For single-room or no-room apartments, do not set parent identifiers
        });
      }

      return apartmentsData;
    }),

  // Update reservation source (admin only)
  updateSource: protectedProcedure
    .input(z.object({
      reservationId: z.number(),
      // Accept any non-empty source string to allow dynamic options coming from DB/UI
      newSource: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.type !== UserType.ADMIN) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only administrators can perform this action." });
      }

      const updated = await ctx.db.reservation.update({
        where: { id: input.reservationId },
        data: { source: input.newSource.trim() },
        select: { id: true, source: true },
      });

      return { success: true, reservation: updated };
    }),
});
