import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { checkInFormSchema } from "@/lib/validations/guest";

export const checkInRouter = createTRPCRouter({
    create: publicProcedure
        .input(checkInFormSchema)
        .mutation(async ({ input, ctx }) => {
            console.log("🚀 tRPC check-in create started!");

            try {
                // Walidacja dodatkowych pól dla isDifferentGuest
                if (input.isDifferentGuest) {
                    if (!input.guestFirstName || !input.guestLastName) {
                        throw new Error("Guest name is required when different from booking holder");
                    }
                }

                const cardCreationDate = new Date();
                cardCreationDate.setUTCHours(0, 0, 0, 0);

                // Find apartment
                const apartment = await ctx.db.apartment.findUnique({
                    where: { slug: input.submittedApartmentIdentifier },
                });

                if (!apartment) {
                    throw new Error("Apartment not found for the given identifier.");
                }

                // Find matching reservation
                const guestStayStart = new Date(input.stayStartDate);
                const guestStayEnd = new Date(input.stayEndDate);
                guestStayStart.setUTCHours(0, 0, 0, 0);
                guestStayEnd.setUTCHours(0, 0, 0, 0);

                const matchingReservation = await ctx.db.reservation.findFirst({
                    where: {
                        apartmentId: apartment.id,
                        start: { equals: guestStayStart },
                        end: { equals: guestStayEnd }
                    },
                    orderBy: { createDate: 'desc' }
                });

                if (!matchingReservation) {
                    throw new Error(`Brak rezerwacji pasującej do podanych dat pobytu (${input.stayStartDate} - ${input.stayEndDate}) dla apartamentu ${apartment.name}.`);
                }

                // Check if card already exists
                const existingCard = await ctx.db.checkInCard.findFirst({
                    where: { reservationId: matchingReservation.id },
                });

                if (existingCard) {
                    throw new Error("Karta meldunkowa została już złożona dla tej rezerwacji.");
                }

                // Determine if primary guest
                const guestFullName = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
                const reservationGuestName = matchingReservation.guest.trim().toLowerCase();
                const isPrimaryGuest = guestFullName === reservationGuestName;

                // Create check-in card
                const newCheckInCard = await ctx.db.checkInCard.create({
                    data: {
                        firstName: input.firstName,
                        lastName: input.lastName,
                        bookingHolderFirstName: input.bookingHolderFirstName,
                        bookingHolderLastName: input.bookingHolderLastName,
                        isDifferentGuest: input.isDifferentGuest,
                        dateOfBirth: new Date(input.dateOfBirth),
                        nationality: input.nationality,
                        documentType: input.documentType,
                        documentNumber: input.documentNumber,
                        addressStreet: input.addressStreet,
                        addressCity: input.addressCity,
                        addressZipCode: input.addressZipCode,
                        addressCountry: input.addressCountry,
                        submittedApartmentIdentifier: input.submittedApartmentIdentifier,
                        checkInDate: cardCreationDate,
                        isPrimaryGuest,
                        reservation: { connect: { id: matchingReservation.id } }
                    },
                    include: { reservation: true }
                });

                // Nie ustawiamy cookie po stronie serwera - zwracamy sessionToken w response
                const sessionToken = `guest-${newCheckInCard.id}-${Date.now()}`;
                const sessionExpiresAt = new Date(matchingReservation.end);
                sessionExpiresAt.setHours(23, 59, 59, 999);

                console.log(`🔧 Returning sessionToken in response for client-side cookie setting: ${sessionToken}`);
                console.log(`🕒 Session expires: ${sessionExpiresAt.toISOString()}`);

                return {
                    success: true,
                    message: "Karta meldunkowa pomyślnie utworzona i sesja gościa zainicjowana.",
                    data: {
                        checkInCard: newCheckInCard,
                        reservation: matchingReservation,
                        redirectTo: `/guest-dashboard/${input.submittedApartmentIdentifier}`,
                        sessionToken,
                        sessionExpiresAt: sessionExpiresAt.toISOString()
                    }
                };

            } catch (error) {
                console.error("🆘 Critical error in tRPC check-in:", error);
                throw new Error(error instanceof Error ? error.message : "Server error during check-in card processing");
            }
        }),
}); 