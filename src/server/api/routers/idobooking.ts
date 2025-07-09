import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { UserType } from "@prisma/client";
import { type createTRPCContext } from "@/server/api/trpc";

// Zod schemas dla API responses
const reservationDetailsSchema = z.object({
    price: z.number(),
    advance: z.number(),
    currency: z.string(),
    dateAdd: z.string(),
    dateFrom: z.string(),
    dateTo: z.string(),
    reservationSourceTypeId: z.coerce.number().optional(),
    reservationSourceId: z.coerce.number().optional(),
    externalReservationId: z.string().optional(),
    reservationManager: z.enum(["external", "own"]).optional(),
    internalSource: z
        .enum(["other", "email", "phone", "faceToFaceConversation", "socialMedia"])
        .optional(),
    clientId: z.coerce.number().optional(),
    status: z.enum([
        "unconfirmed",
        "confirmed",
        "paymentInProgress",
        "accepted",
        "inProgress",
        "completed",
        "canceled",
        "withdrawn",
        "waitingForPayment",
        "invalidCardNumber",
        "toClarify",
    ]),
    internalNote: z.string(),
    apiNote: z.string(),
    externalNote: z.string(),
    clientNote: z.string(),
    discount: z.coerce.number().optional(),
    balance: z.number().optional(),
    modificationStatus: z.enum(["new", "modified"]).optional(),
    modificationDate: z.string().optional(),
    note: z.string().optional(),
    languageCode: z.string().optional(),
    isSurplus: z.coerce.number().optional(),
});

const reservationItemSchema = z.object({
    objectItemId: z.number(),
    itemId: z.number().optional(),
    objectName: z.string().optional(),
    itemCode: z.string().optional(),
    objectId: z.number().optional(),
    numberOfAdults: z.number().optional(),
    numberOfBigChildren: z.number().optional(),
    numberOfSmallChildren: z.number().optional(),
    priceCorrection: z.number(),
    price: z.number(),
    vat: z.number(),
    numberOfGuests: z.number().optional(),
    isSurplus: z.coerce.number().optional(), // API returns number, not enum
    prices: z.array(z.unknown()).optional(),
    addons: z.array(z.unknown()).optional(),
});

const reservationGuestSchema = z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    street: z.string().optional(),
    zipcode: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    language: z.string().optional(),
    age: z.number().optional(),
});

const reservationClientSchema = z.object({
    id: z.number(),
    login: z.string(),
    clientType: z.enum(["person", "company"]),
    status: z.enum(["active", "blocked"]).optional(),
    companyName: z.string().optional(),
    taxNumber: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    street: z.string(),
    zipcode: z.string(),
    city: z.string(),
    countryCode: z.string(),
    phone: z.string(),
    email: z.string(),
    language: z.string(),
    langDescription: z.string().optional(),
    currency: z.string(),
    guests: z.array(reservationGuestSchema),
    invoiceData: z
        .object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            companyName: z.string().optional(),
            taxNumber: z.string().optional(),
            street: z.string().optional(),
            zipcode: z.string().optional(),
            city: z.string().optional(),
            countryCode: z.string().optional(),
        })
        .optional(),
    notification: z.enum(["y", "n"]).optional(),
    sendNewsletter: z.enum(["y", "n"]).optional(),
    note: z.string().optional(),
    discountForItemsInPromotion: z.number().optional(),
    discountForItemsNotInPromotion: z.number().optional(),
});

const reservationSchema = z.object({
    id: z.number(),
    reservationDetails: reservationDetailsSchema,
    items: z.array(reservationItemSchema),
    client: reservationClientSchema,
});

const reservationSourceDescriptionSchema = z.object({
    reservationSourceTypeId: z.number(),
    reservationSourceTypeName: z.string(),
    reservationSourceId: z.number(),
    reservationSourceName: z.string(),
});

const sourcesApiResponseSchema = z.object({
    authenticate: z.any(),
    errors: z.array(z.object({
        faultCode: z.number(),
        faultString: z.string(),
    })).optional(),
    sources: z.array(reservationSourceDescriptionSchema).optional(), // Made optional to handle cases where it might not be present
});

const sourcesApiResponseSchemaV2 = z.object({
    result: sourcesApiResponseSchema,
    id: z.string().optional(),
});


// Funkcja do generowania system_key zgodnie z dokumentacją idobooking
function generateSystemKey(password: string): string {
    // 1. Hashuj hasło użytkownika SHA1
    const hashedPassword = createHash("sha1").update(password).digest("hex");

    // 2. Generuj datę w formacie YYYYMMDD
    const today = new Date();
    const date =
        today.getFullYear().toString() +
        (today.getMonth() + 1).toString().padStart(2, "0") +
        today.getDate().toString().padStart(2, "0");

    // 3. Połącz datę z zahashowanym hasłem
    const strToHash = date + hashedPassword;

    // 4. Hashuj ponownie SHA1
    const systemKey = createHash("sha1").update(strToHash).digest("hex");

    return systemKey;
}

// Funkcja pomocnicza do logowania z tagiem
const logWithTag = (message: string, data?: unknown) => {
    const tag = "[syncReservations]";
    if (data) {
        console.log(`💬 ${tag} ${message}`, data);
    } else {
        console.log(`💬 ${tag} ${message}`);
    }
};

function getAuth() {
    const login = "barwil128";
    const password = "Metalcat133c!";
    const systemKey = generateSystemKey(password);

    return {
        systemLogin: login,
        systemKey: systemKey,
        lang: "pol",
    };
}

async function getReservations(): Promise<z.infer<typeof reservationSchema>[]> {
    const allReservations: z.infer<typeof reservationSchema>[] = [];
    let currentPage = 1;
    let totalPages = 1;

    logWithTag("Rozpoczęto pobieranie rezerwacji z IdoBooking API...");

    do {
        logWithTag(`Pobieranie strony ${currentPage}...`);

        const response = await fetch(
            `https://zlote-wynajmy.pl/api/reservations/get/1/json`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({
                    authenticate: getAuth(),
                    paramsSearch: {
                        // fromDateRange: {
                        //   startDate: "2024-11-01T00:00:00",
                        //   endDate: "2026-07-07T00:00:00",
                        // },
                    },
                    result: {
                        page: currentPage,
                        number: 100,
                    },
                }),
            },
        );

        const responseData = (await response.json()) as unknown;

        // Parse the entire response structure with pagination
        const responseSchema = z.object({
            result: z.object({
                authenticate: z.object({
                    systemLogin: z.string(),
                    systemKey: z.string(),
                }),
                errors: z
                    .array(
                        z.object({
                            faultCode: z.number(),
                            faultString: z.string(),
                        }),
                    )
                    .optional(),
                reservations: z.array(reservationSchema).optional(),
                result: z
                    .object({
                        page: z.number(),
                        countOnPage: z.number(),
                        pageAll: z.number(),
                        countAll: z.number(),
                    })
                    .optional(),
            }),
            id: z.string(),
        });

        const parsedResponse = responseSchema.parse(responseData);

        if (
            parsedResponse.result.errors &&
            parsedResponse.result.errors.length > 0
        ) {
            const errorMessage = `API IdoBooking zwróciło błąd: ${JSON.stringify(
                parsedResponse.result.errors,
            )}`;
            logWithTag(errorMessage);
            throw new Error(errorMessage);
        }

        const pageReservations = parsedResponse.result.reservations ?? [];
        const pagination = parsedResponse.result.result;

        allReservations.push(...pageReservations);

        if (!pagination) {
            logWithTag(
                "Brak informacji o paginacji. Zakładam, że to jedyna strona.",
            );
            break;
        }

        totalPages = pagination.pageAll;

        logWithTag(
            `Strona ${currentPage}: ${pageReservations.length} rezerwacji (łącznie ${allReservations.length}/${pagination.countAll})`,
        );

        currentPage++;
    } while (currentPage <= totalPages);

    logWithTag(
        `Pobrano wszystkie ${allReservations.length} rezerwacji z ${totalPages} stron.`
    );
    return allReservations;
}

async function mapToDBReservations(
    reservations: z.infer<typeof reservationSchema>[],
    ctx: Awaited<ReturnType<typeof createTRPCContext>>,
) {
    logWithTag(`Rozpoczęto mapowanie ${reservations.length} rezerwacji do bazy danych.`);

    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < reservations.length; i += batchSize) {
        batches.push(reservations.slice(i, i + batchSize));
    }

    let totalProcessed = 0;

    for (const [batchIndex, batch] of batches.entries()) {
        logWithTag(
            `Przetwarzanie partii ${batchIndex + 1}/${batches.length} (${batch.length} rezerwacji)`
        );

        const operations = batch.map(async (reservation, index) => {
            const { id: idobookingId, reservationDetails, items, client } = reservation;

            if (batchIndex === 0 && index < 5) {
                logWithTag(`Szczegóły surowej rezerwacji (ID: ${idobookingId}):`, reservation);
            }

            const details = reservation.reservationDetails;
            let sourceName: string;

            if (details.internalSource && details.internalSource !== 'other') {
                const internalSourceMapping: Record<string, string> = {
                    email: "Email",
                    phone: "Telefon",
                    faceToFaceConversation: "Osobiście",
                    socialMedia: "Social Media"
                };
                sourceName = internalSourceMapping[details.internalSource] ?? details.internalSource;
            } else if (details.reservationSourceId) {
                sourceName = `Idobooking (ID: ${details.reservationSourceId})`;
            } else if (details.reservationSourceTypeId) {
                sourceName = `Idobooking (Typ ID: ${details.reservationSourceTypeId})`;
            } else {
                sourceName = "Brak";
            }

            logWithTag(`Mapowanie rezerwacji ${idobookingId}:`, {
                internalSource: reservationDetails.internalSource,
                sourceId: reservationDetails.reservationSourceId,
                sourceTypeId: reservationDetails.reservationSourceTypeId,
                finalSourceName: sourceName,
            });

            const firstItem = items[0];
            const adultsCount = firstItem?.numberOfAdults ?? firstItem?.numberOfGuests ?? 1;
            const bigChildrenCount = firstItem?.numberOfBigChildren ?? 0;
            const smallChildrenCount = firstItem?.numberOfSmallChildren ?? 0;
            const totalChildrenCount = bigChildrenCount + smallChildrenCount;

            const reservationData = {
                idobookingId,
                status: reservationDetails.status,
                apartmentName: firstItem?.objectName ?? "N/A",
                currency: reservationDetails.currency,
                source: sourceName,
                createDate: new Date(reservationDetails.dateAdd),
                guest: `${client.firstName} ${client.lastName}`.trim(),
                start: new Date(reservationDetails.dateFrom),
                end: new Date(reservationDetails.dateTo),
                payment: reservationDetails.price.toString(),
                adults: adultsCount,
                children: totalChildrenCount,
                address: firstItem?.objectName ?? "Brak adresu",
                paymantValue: reservationDetails.price,
            };

            logWithTag(`Przygotowane dane dla rezerwacji ${idobookingId}:`, reservationData);

            const existingReservation = await ctx.db.reservation.findUnique({
                where: { idobookingId },
            });

            if (existingReservation) {
                logWithTag(`Rezerwacja o ID ${idobookingId} już istnieje. Aktualizowanie...`);
                try {
                    await ctx.db.reservation.update({
                        where: { idobookingId },
                        data: reservationData,
                    });
                    logWithTag(`✅ Rezerwacja ${idobookingId} zaktualizowana pomyślnie.`);
                } catch (error) {
                    logWithTag(`❌ Błąd podczas aktualizacji rezerwacji ${idobookingId}:`, error);
                }
            } else {
                logWithTag(`Rezerwacja o ID ${idobookingId} nie istnieje. Tworzenie nowej...`);
                try {
                    await ctx.db.reservation.create({
                        data: reservationData,
                    });
                    logWithTag(`✅ Rezerwacja ${idobookingId} utworzona pomyślnie.`);
                } catch (error) {
                    logWithTag(`❌ Błąd podczas tworzenia rezerwacji ${idobookingId}:`, error);
                }
            }
        });

        await Promise.all(operations);
        totalProcessed += batch.length;
        logWithTag(`Zakończono przetwarzanie partii ${batchIndex + 1}. Przetworzono łącznie ${totalProcessed} rezerwacji.`);
    }

    logWithTag("Zakończono mapowanie wszystkich rezerwacji.");
}

async function getSources(): Promise<z.infer<typeof reservationSourceDescriptionSchema>[]> {
    logWithTag("Pobieranie źródeł rezerwacji z IdoBooking API...");

    const response = await fetch(
        `https://zlote-wynajmy.pl/api/reservations/getSources/34/json`,
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json;charset=UTF-8",
            },
            body: JSON.stringify({
                authenticate: getAuth(),
                result: {
                    page: 1,
                    number: 100,
                },
            }),
        },
    );

    const responseText = await response.text();
    logWithTag("Otrzymano surową odpowiedź z API źródeł rezerwacji:", responseText);

    let responseData: unknown;
    try {
        responseData = JSON.parse(responseText);
    } catch (error) {
        logWithTag("Błąd parsowania JSON:", { error, responseText });
        throw new Error("Błąd parsowania odpowiedzi JSON z IdoBooking API.");
    }

    const parsedResponse = sourcesApiResponseSchemaV2.parse(responseData);
    const result = parsedResponse.result;


    if (result.errors && result.errors.length > 0) {
        const errorMessage = `API IdoBooking zwróciło błąd: ${JSON.stringify(result.errors)}`;
        logWithTag(errorMessage);
        throw new Error(errorMessage);
    }

    if (!result.sources) {
        const errorMessage = "Odpowiedź z API nie zawierała źródeł rezerwacji.";
        logWithTag(errorMessage, { parsedResponse });
        throw new Error(errorMessage);
    }

    logWithTag(`Pobrano ${result.sources.length} źródeł rezerwacji.`);
    return result.sources;
}


export const idobookingRouter = createTRPCRouter({
    // Pobierz listę apartamentów z idobooking
    syncReservations: protectedProcedure.mutation(async ({ ctx }) => {
        if (ctx.session.user.type !== UserType.ADMIN) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Tylko administratorzy mogą synchronizować rezerwacje.",
            });
        }

        try {
            logWithTag("Rozpoczynanie pełnej synchronizacji rezerwacji...");
            const reservations = await getReservations();
            await mapToDBReservations(reservations, ctx);
            logWithTag("🎉 Pełna synchronizacja rezerwacji zakończona pomyślnie.");
            return {
                success: true,
                message: `Synchronizacja zakończona. Pobrano ${reservations.length} rezerwacji.`,
            };
        } catch (error) {
            logWithTag("🚨 Wystąpił błąd podczas synchronizacji rezerwacji:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: errorMessage,
            });
        }
    }),
    getReservationSources: protectedProcedure.mutation(async ({ ctx }) => {
        if (ctx.session.user.type !== UserType.ADMIN) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Tylko administratorzy mogą wykonywać tę akcję.",
            });
        }

        try {
            const sources = await getSources();
            return {
                success: true,
                sources: sources,
            };

        } catch (error) {
            logWithTag("🚨 Wystąpił błąd podczas pobierania źródeł rezerwacji:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: errorMessage,
            });
        }
    }),
});
