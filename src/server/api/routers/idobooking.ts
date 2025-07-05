import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";

// Funkcja do generowania system_key zgodnie z dokumentacją idobooking
function generateSystemKey(password: string): string {
    // 1. Hashuj hasło użytkownika SHA1
    const hashedPassword = createHash('sha1').update(password).digest('hex');

    // 2. Generuj datę w formacie YYYYMMDD
    const today = new Date();
    const date = today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, '0') +
        today.getDate().toString().padStart(2, '0');

    // 3. Połącz datę z zahashowanym hasłem
    const strToHash = date + hashedPassword;

    // 4. Hashuj ponownie SHA1
    const systemKey = createHash('sha1').update(strToHash).digest('hex');

    return systemKey;
}

// Zod schemas dla API responses
const idobookingObjectSchema = z.object({
    id: z.number(),
    name: z.string(),
    address: z.string().optional(),
    description: z.string().optional(),
    maxGuests: z.number().optional(),
});

const idobookingPriceSchema = z.object({
    date: z.string(),
    price: z.number(),
    available: z.boolean(),
    minStay: z.number().optional(),
});

const idobookingReservationSchema = z.object({
    id: z.number(),
    objectId: z.number(),
    guestName: z.string(),
    checkIn: z.string(),
    checkOut: z.string(),
    totalPrice: z.number(),
    currency: z.string(),
    source: z.string().optional(),
    status: z.string(),
});

// Zod schema dla API response
const idobookingApiResponseSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    objects: z.array(z.unknown()).optional(),
    prices: z.array(z.unknown()).optional(),
    reservations: z.array(z.unknown()).optional(),
});

// Zod schema dla błędu autoryzacji
const idobookingAuthErrorSchema = z.object({
    result: z.object({
        authenticate: z.object({
            systemLogin: z.string(),
            systemKey: z.string(),
        }),
        errors: z.object({
            faultCode: z.number(),
            faultString: z.string(),
        }),
    }),
    id: z.string(),
});

export const idobookingRouter = createTRPCRouter({
    // Pobierz listę apartamentów z idobooking
    getApartmentsList: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can access idobooking data",
                });
            }

            try {
                // Twardo wpisane dane logowania
                const login = "barwil128";
                const password = "Metalcat133c!";

                const systemKey = generateSystemKey(password);
                console.log("🔑 Generated system_key:", systemKey);

                // Bezpośrednie zapytanie do API idobooking
                const response = await fetch('https://client47056.idosell.com/api/objects/getObjectsList/json', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        authenticate: {
                            systemLogin: login,
                            systemKey: systemKey,
                        },
                    }),
                });

                console.log("Status odpowiedzi:", response.status, response.statusText);
                const text = await response.text();
                console.log("Odpowiedź jako tekst:", text);

                if (response.status !== 200) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: `API idobooking zwróciło status ${response.status}: ${text}`,
                    });
                }

                if (!text) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "API idobooking zwróciło pustą odpowiedź",
                    });
                }

                let rawData: unknown;
                try {
                    rawData = JSON.parse(text);
                } catch (e) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "API idobooking zwróciło nie-JSON: " + text,
                    });
                }

                const data = idobookingApiResponseSchema.parse(rawData);

                if (!data.success) {
                    throw new Error(data.message ?? 'API request failed');
                }

                return (data.objects ?? []).map((obj: unknown) => idobookingObjectSchema.parse(obj));
            } catch (error) {
                console.error("❌ Error fetching from idobooking:", error);
                if (error instanceof TRPCError) {
                    throw error;
                }
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch apartments from idobooking",
                });
            }
        }),

    // Pobierz ceny i dostępność dla apartamentu
    getPricesForApartment: protectedProcedure
        .input(z.object({
            objectId: z.number(),
            dateFrom: z.string(), // YYYY-MM-DD
            dateTo: z.string(),   // YYYY-MM-DD
        }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can access idobooking data",
                });
            }

            try {
                const response = await fetch(`${process.env.IDOBOOKING_API_URL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'method',
                        function: 'offer',
                        method: 'getPricesForDaysForObject',
                        key: process.env.IDOBOOKING_API_KEY,
                        objectId: input.objectId,
                        dateFrom: input.dateFrom,
                        dateTo: input.dateTo,
                    }),
                });

                const pricesRawData = await response.json() as unknown;
                const pricesData = idobookingApiResponseSchema.parse(pricesRawData);

                if (!pricesData.success) {
                    throw new Error(pricesData.message ?? 'API request failed');
                }

                return (pricesData.prices ?? []).map((price: unknown) => idobookingPriceSchema.parse(price));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch prices from idobooking",
                });
            }
        }),

    // Pobierz rezerwacje z idobooking
    getReservations: protectedProcedure
        .input(z.object({
            dateFrom: z.string().optional(),
            dateTo: z.string().optional(),
            objectId: z.number().optional(),
        }))
        .query(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can access idobooking data",
                });
            }

            try {
                const response = await fetch(`${process.env.IDOBOOKING_API_URL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'method',
                        function: 'reservation',
                        method: 'getReservationsList',
                        key: process.env.IDOBOOKING_API_KEY,
                        ...input,
                    }),
                });

                const reservationsRawData = await response.json() as unknown;
                const reservationsData = idobookingApiResponseSchema.parse(reservationsRawData);

                if (!reservationsData.success) {
                    throw new Error(reservationsData.message ?? 'API request failed');
                }

                return (reservationsData.reservations ?? []).map((res: unknown) => idobookingReservationSchema.parse(res));
            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch reservations from idobooking",
                });
            }
        }),

    // Synchronizuj dane z idobooking do naszej bazy
    syncDataFromIdobooking: protectedProcedure
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can sync data",
                });
            }

            try {
                // 1. Pobierz apartamenty z idobooking
                const apartmentsResponse = await fetch(`${process.env.IDOBOOKING_API_URL}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'method',
                        function: 'object',
                        method: 'getObjectsList',
                        key: process.env.IDOBOOKING_API_KEY,
                    }),
                });

                const apartmentsRawData = await apartmentsResponse.json() as unknown;
                const apartmentsData = idobookingApiResponseSchema.parse(apartmentsRawData);

                // 2. Upsert apartamentów do naszej bazy
                for (const aptRaw of apartmentsData.objects ?? []) {
                    const apt = idobookingObjectSchema.parse(aptRaw);
                    await ctx.db.apartment.upsert({
                        where: {
                            idobookingId: apt.id, // Dodaj to pole do schema
                        },
                        update: {
                            name: apt.name,
                            address: apt.address ?? '',
                            maxGuests: apt.maxGuests ?? 4,
                        },
                        create: {
                            idobookingId: apt.id,
                            name: apt.name,
                            slug: apt.name.toLowerCase().replace(/\s+/g, '-'),
                            address: apt.address ?? '',
                            maxGuests: apt.maxGuests ?? 4,
                            defaultRentAmount: 0,
                            defaultUtilitiesAmount: 0,
                        },
                    });
                }

                // 3. Pobierz i sync rezerwacje (ostatnie 3 miesiące)
                const dateFrom = new Date();
                dateFrom.setMonth(dateFrom.getMonth() - 3);
                const dateTo = new Date();
                dateTo.setMonth(dateTo.getMonth() + 1);

                const reservationsResponse = await fetch(`${process.env.IDOBOOKING_API_URL}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'method',
                        function: 'reservation',
                        method: 'getReservationsList',
                        key: process.env.IDOBOOKING_API_KEY,
                        dateFrom: dateFrom.toISOString().split('T')[0],
                        dateTo: dateTo.toISOString().split('T')[0],
                    }),
                });

                const reservationsRawData = await reservationsResponse.json() as unknown;
                const reservationsData = idobookingApiResponseSchema.parse(reservationsRawData);

                // 4. Upsert rezerwacji
                for (const resRaw of reservationsData.reservations ?? []) {
                    const res = idobookingReservationSchema.parse(resRaw);
                    const apartment = await ctx.db.apartment.findFirst({
                        where: { idobookingId: res.objectId },
                    });

                    if (apartment) {
                        await ctx.db.reservation.upsert({
                            where: {
                                idobookingId: res.id, // Dodaj to pole do schema
                            },
                            update: {
                                guest: res.guestName,
                                start: new Date(res.checkIn),
                                end: new Date(res.checkOut),
                                paymantValue: res.totalPrice,
                                currency: res.currency,
                                source: res.source ?? 'idobooking',
                                status: res.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                            },
                            create: {
                                idobookingId: res.id,
                                apartmentId: apartment.id,
                                guest: res.guestName,
                                start: new Date(res.checkIn),
                                end: new Date(res.checkOut),
                                paymantValue: res.totalPrice,
                                currency: res.currency,
                                source: res.source ?? 'idobooking',
                                status: res.status === 'confirmed' ? 'CONFIRMED' : 'PENDING',
                                createDate: new Date(),
                                apartmentName: apartment.name,
                                address: apartment.address,
                                payment: res.totalPrice.toString(),
                            },
                        });
                    }
                }

                return {
                    success: true,
                    message: `Synchronized ${(apartmentsData.objects ?? []).length} apartments and ${(reservationsData.reservations ?? []).length} reservations`
                };

            } catch (error) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to sync data from idobooking",
                });
            }
        }),

    getPrices: protectedProcedure
        .input(z.object({
            objectId: z.number(),
            dateFrom: z.string(),
            dateTo: z.string(),
            language: z.string().default("pol"),
            currency: z.string().default("PLN"),
            withChildren: z.boolean().default(false),
        }))
        .query(async ({ input }) => {
            // Twardo zakodowane dane logowania
            const login = process.env.IDOBOOKING_LOGIN;
            const password = process.env.IDOBOOKING_PASSWORD;

            if (!login || !password) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Missing idobooking credentials in environment variables",
                });
            }

            const systemKey = generateSystemKey(password);

            const body = {
                authenticate: {
                    systemKey: systemKey,
                    systemLogin: login,
                    lang: input.language,
                },
                paramsSearch: {
                    dateFrom: input.dateFrom,
                    dateTo: input.dateTo,
                    language: input.language,
                    currency: input.currency,
                    objectId: input.objectId,
                    withChildren: input.withChildren,
                }
            };

            const response = await fetch(
                `https://client47056.idosell.com/api/offer/getPricesForDaysForObject/1/json`,
                {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json;charset=UTF-8"
                    },
                    body: JSON.stringify(body),
                }
            );

            // Zwróć surową odpowiedź
            return await response.json() as unknown;
        }),
}); 