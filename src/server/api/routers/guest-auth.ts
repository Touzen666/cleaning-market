import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { guestLoginSchema } from "@/lib/validations/guest";
import { cookies } from "next/headers";
import { z } from "zod";
import { guestDataSchema } from "@/lib/validations/guest";

export const guestAuthRouter = createTRPCRouter({
    login: publicProcedure
        .input(guestLoginSchema)
        .mutation(async ({ input, ctx }) => {
            try {
                console.log("[tRPC guest-auth.login] Received login request:", input);

                const firstNameQuery = input.firstName.trim();
                const lastNameQuery = input.lastName.trim();
                const documentNumberQuery = input.documentNumber.trim();
                const apartmentSlugQuery = input.apartmentSlug;
                const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

                // Find check-in card matching the credentials
                const checkInCard = await ctx.db.checkInCard.findFirst({
                    where: {
                        firstName: { equals: firstNameQuery, mode: 'insensitive' },
                        lastName: { equals: lastNameQuery, mode: 'insensitive' },
                        documentNumber: { equals: documentNumberQuery, mode: 'insensitive' },
                        submittedApartmentIdentifier: apartmentSlugQuery,
                        checkInDate: {
                            gte: sixtyDaysAgo
                        }
                    },
                    include: {
                        reservation: true
                    }
                });

                console.log("[tRPC guest-auth.login] CheckInCard found:", checkInCard);

                if (!checkInCard) {
                    return {
                        success: false,
                        error: "Nieprawidłowe dane logowania, upewnij się że wprowadzone dane są poprawne oraz że pobyt się jeszcze nie zakończył"
                    };
                }

                // Check if guest has an active reservation
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                if (checkInCard.reservation) {
                    const reservationEnd = new Date(checkInCard.reservation.end);
                    reservationEnd.setHours(23, 59, 59, 999);

                    if (today > reservationEnd) {
                        return {
                            success: false,
                            error: "Twój pobyt już się zakończył"
                        };
                    }
                }

                // Create session expiry
                let sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

                if (checkInCard.reservation) {
                    const reservationEnd = new Date(checkInCard.reservation.end);
                    reservationEnd.setHours(23, 59, 59, 999);
                    sessionExpiry = reservationEnd;
                }

                // Set session cookie PRZED return
                const cookieStore = await cookies();
                const sessionToken = `guest-${checkInCard.id}-${Date.now()}`;

                // Popraw ustawienia cookie
                cookieStore.set('guest-session', sessionToken, {
                    httpOnly: false,
                    secure: false, // Force false for development debugging
                    sameSite: 'lax',
                    expires: sessionExpiry,
                    path: '/',
                    maxAge: 60 * 60 * 24 * 7
                });

                console.log(`🍪 Guest session cookie set: ${sessionToken}`);

                return {
                    success: true,
                    data: {
                        sessionId: sessionToken,
                        expiresAt: sessionExpiry.toISOString(),
                        apartmentSlug: input.apartmentSlug
                    }
                };

            } catch (error) {
                console.error("Guest login error:", error);
                throw new Error(error instanceof Error ? error.message : "Wystąpił błąd serwera");
            }
        }),

    verify: publicProcedure
        .input(z.object({
            apartmentSlug: z.string(),
            sessionToken: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            try {
                const cookieStore = await cookies();
                let sessionToken = cookieStore.get('guest-session')?.value;

                // Fallback: jeśli nie ma cookie, użyj sessionToken z input
                if (!sessionToken && input.sessionToken) {
                    sessionToken = input.sessionToken;
                    console.log('📱 Using sessionToken from input:', sessionToken);
                }

                const allCookies = cookieStore.getAll();

                console.log(`🔍 Checking session for ${input.apartmentSlug}`);
                console.log(`🍪 Session token: ${sessionToken}`);
                console.log(`🍪 All cookies:`, allCookies.map(c => `${c.name}=${c.value}`));

                if (!sessionToken) {
                    console.log('❌ No session token found in cookies or input');
                    return {
                        authenticated: false,
                        apartmentSlug: input.apartmentSlug
                    };
                }

                // Parse sessionToken: "guest-{UUID}-{timestamp}"
                // UUID może zawierać dashes, więc nie możemy użyć prostego split('-')
                if (!sessionToken.startsWith('guest-')) {
                    console.log('❌ Session token does not start with guest-');
                    return {
                        authenticated: false,
                        apartmentSlug: input.apartmentSlug
                    };
                }

                // Usuń prefix "guest-"
                const withoutPrefix = sessionToken.substring(6); // "guest-".length = 6

                // Znajdź ostatni dash przed timestamp (timestamp to liczba na końcu)
                const lastDashIndex = withoutPrefix.lastIndexOf('-');
                if (lastDashIndex === -1) {
                    console.log('❌ Invalid session token format - no timestamp dash found');
                    return {
                        authenticated: false,
                        apartmentSlug: input.apartmentSlug
                    };
                }

                const checkInCardId = withoutPrefix.substring(0, lastDashIndex);
                const timestamp = withoutPrefix.substring(lastDashIndex + 1);

                console.log('🔧 Session token parsing:');
                console.log('  - Full UUID:', checkInCardId);
                console.log('  - Timestamp:', timestamp);
                console.log('🆔 Looking for CheckInCard with ID:', checkInCardId);
                console.log('🏠 For apartment slug:', input.apartmentSlug);

                // Znajdź konkretną kartę po ID z session token
                const checkInCard = await ctx.db.checkInCard.findFirst({
                    where: {
                        id: checkInCardId,
                        submittedApartmentIdentifier: input.apartmentSlug,
                    },
                    include: {
                        reservation: {
                            include: {
                                apartment: true
                            }
                        }
                    }
                });

                console.log('🔍 CheckInCard found:', checkInCard ? 'YES' : 'NO');
                if (checkInCard) {
                    console.log('✅ CheckInCard details:', {
                        id: checkInCard.id,
                        firstName: checkInCard.firstName,
                        lastName: checkInCard.lastName,
                        apartmentSlug: checkInCard.submittedApartmentIdentifier,
                        hasReservation: !!checkInCard.reservation
                    });
                } else {
                    console.log('❌ CheckInCard search failed with conditions:', {
                        id: checkInCardId,
                        submittedApartmentIdentifier: input.apartmentSlug
                    });
                }

                if (!checkInCard || !checkInCard.reservation) {
                    console.log('❌ CheckInCard not found for session');
                    return {
                        authenticated: false,
                        apartmentSlug: input.apartmentSlug
                    };
                }

                // Sprawdź czy sesja jest ważna
                const now = new Date();
                const reservationEnd = new Date(checkInCard.reservation.end);
                reservationEnd.setHours(23, 59, 59, 999);

                if (now > reservationEnd) {
                    console.log('❌ Session expired');
                    return {
                        authenticated: false,
                        apartmentSlug: input.apartmentSlug
                    };
                }

                console.log('✅ Session valid for guest:', checkInCard.firstName, checkInCard.lastName);

                // Sprawdź czy może się zameldować (15:00 w dniu rozpoczęcia)
                const canCheckInFrom = new Date(checkInCard.reservation.start);
                canCheckInFrom.setHours(15, 0, 0, 0);

                const shouldShowCheckIn = now >= canCheckInFrom && !checkInCard.actualCheckInTime;

                return {
                    authenticated: true,
                    apartmentSlug: input.apartmentSlug,
                    reservation: {
                        start: checkInCard.reservation.start.toISOString(),
                        end: checkInCard.reservation.end.toISOString(),
                        guest: checkInCard.reservation.guest,
                        apartment: checkInCard.reservation.apartment ? {
                            id: checkInCard.reservation.apartment.id.toString(),
                            name: checkInCard.reservation.apartment.name,
                            slug: checkInCard.reservation.apartment.slug,
                        } : undefined,
                    },
                    checkInCard: {
                        firstName: checkInCard.firstName,
                        lastName: checkInCard.lastName,
                        isPrimaryGuest: checkInCard.isPrimaryGuest,
                        actualCheckInTime: checkInCard.actualCheckInTime?.toISOString() ?? null,
                    },
                    shouldShowCheckIn,
                    canCheckInFrom: canCheckInFrom.toISOString(),
                    sessionExpiresAt: reservationEnd.toISOString(),
                };

            } catch (error) {
                console.error("Guest verify error:", error);
                return {
                    authenticated: false,
                    apartmentSlug: input.apartmentSlug
                };
            }
        }),
}); 