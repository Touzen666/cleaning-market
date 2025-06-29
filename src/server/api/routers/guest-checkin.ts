import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { cookies } from "next/headers";

export const guestCheckinRouter = createTRPCRouter({
    checkin: publicProcedure
        .input(z.object({
            apartmentSlug: z.string().min(1, "Apartment slug is required")
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                const cookieStore = await cookies();
                const sessionCookie = cookieStore.get('guest-session');

                if (!sessionCookie) {
                    throw new Error("No active session");
                }

                // Find check-in card
                const checkInCard = await ctx.db.checkInCard.findFirst({
                    where: {
                        submittedApartmentIdentifier: input.apartmentSlug,
                        checkInDate: {
                            gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                        }
                    },
                    include: { reservation: true },
                    orderBy: { checkInDate: 'desc' }
                });

                if (!checkInCard || !checkInCard.reservation) {
                    throw new Error("No valid check-in card or reservation found");
                }

                // Check if already checked in
                if (checkInCard.actualCheckInTime) {
                    throw new Error(`Już się zameldowałeś. Data zameldowania: ${checkInCard.actualCheckInTime?.toLocaleString('pl-PL')}`);
                }

                // Check timing
                const now = new Date();
                const reservationStart = new Date(checkInCard.reservation.start);
                const reservationEnd = new Date(checkInCard.reservation.end);

                const canCheckInFrom = new Date(reservationStart);
                canCheckInFrom.setHours(15, 0, 0, 0);

                const checkoutTime = new Date(reservationEnd);
                checkoutTime.setHours(10, 0, 0, 0);

                if (now < canCheckInFrom) {
                    throw new Error(`Meldowanie możliwe od ${canCheckInFrom.toLocaleString('pl-PL')}`);
                }

                if (now > checkoutTime) {
                    throw new Error("Czas pobytu już minął");
                }

                // Update check-in time
                await ctx.db.checkInCard.update({
                    where: { id: checkInCard.id },
                    data: { actualCheckInTime: now },
                });

                return {
                    success: true,
                    message: "Meldowanie zakończone pomyślnie!",
                    data: {
                        checkInTime: now.toISOString(),
                        apartmentSlug: input.apartmentSlug,
                        guestName: `${checkInCard.firstName} ${checkInCard.lastName}`,
                        checkoutTime: checkoutTime.toISOString()
                    }
                };

            } catch (error) {
                console.error("Guest check-in error:", error);
                throw new Error(error instanceof Error ? error.message : "Wystąpił błąd serwera");
            }
        }),
}); 