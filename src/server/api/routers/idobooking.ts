import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { UserType, type Prisma } from "@prisma/client";
import { type createTRPCContext } from "@/server/api/trpc";
import { env } from "@/env";

// Mapping statusów IdoBooking na polskie statusy
const IDOBOOKING_STATUS_MAP: Record<string, string> = {
    unconfirmed: "Nieopłacona",
    confirmed: "Przyjęta",
    paymentInProgress: "Oczekuje na wpłatę",
    accepted: "Przyjęta",
    inProgress: "Trwa",
    completed: "Zakończona",
    canceled: "Anulowana",
    withdrawn: "Odrzucona przez obsługę",
    waitingForPayment: "Oczekuje na wpłatę",
    invalidCardNumber: "Niepoprawny numer karty",
    toClarify: "Do wyjaśnienia",
};

// Funkcja do mapowania statusu IdoBooking na polski status
function mapIdobookingStatus(idobookingStatus: string): string {
    return IDOBOOKING_STATUS_MAP[idobookingStatus] ?? idobookingStatus;
}

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
    client: reservationClientSchema.optional(), // Uczynione opcjonalnym
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

// Schema dla odpowiedzi synchronizacji
const syncResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    syncId: z.string(),
    reservationsCount: z.number(),
    duration: z.string(),
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

type ReservationFetchOptions = {
    startDateISO?: string;
    endDateISO?: string;
};

export async function getReservations(options: ReservationFetchOptions = {}): Promise<z.infer<typeof reservationSchema>[]> {
    const allReservations: z.infer<typeof reservationSchema>[] = [];
    let currentPage = 1;
    let totalPages = 1;

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 180); // past 180 days
    const defaultEnd = new Date(now);
    defaultEnd.setDate(defaultEnd.getDate() + 365); // next 365 days

    const startDateISO = options.startDateISO ?? defaultStart.toISOString();
    const endDateISO = options.endDateISO ?? defaultEnd.toISOString();

    logWithTag("===== ROZPOCZĘCIE POBIERANIA REZERWACJI =====");
    logWithTag("NODE_ENV:", process.env.NODE_ENV);
    logWithTag("DATABASE_URL dostępny:", !!process.env.DATABASE_URL);
    logWithTag("NEXT_PUBLIC_APP_URL:", process.env.NEXT_PUBLIC_APP_URL);
    logWithTag("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    logWithTag("Zakres dat:", { startDateISO, endDateISO });
    logWithTag("Timestamp:", new Date().toISOString());
    logWithTag("Rozpoczęto pobieranie rezerwacji z IdoBooking API...");

    do {
        logWithTag(`Pobieranie strony ${currentPage}...`);

        // NOTE: The segment `/get/<id>/json` must match your property group ID used across IdoBooking API.
        // We align it with the same identifier used in getSources (34) to ensure both endpoints address the same scope.
        const response = await fetch(
            `https://zlote-wynajmy.pl/api/reservations/get/34/json`,
            {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json;charset=UTF-8",
                },
                body: JSON.stringify({
                    authenticate: getAuth(),
                    paramsSearch: {
                        fromDateRange: {
                            startDate: startDateISO,
                            endDate: endDateISO,
                        },
                    },
                    result: {
                        page: currentPage,
                        number: 100,
                    },
                }),
            },
        );

        if (!response.ok) {
            const errorText = await response.text().catch(() => "<no-body>");
            const errorMsg = `IdoBooking GET reservations failed: ${response.status} ${response.statusText}. Body: ${errorText}`;
            logWithTag(errorMsg);
            throw new Error(errorMsg);
        }

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

export async function mapToDBReservations(
    reservations: z.infer<typeof reservationSchema>[],
    ctx: Awaited<ReturnType<typeof createTRPCContext>>,
) {
    logWithTag("===== ROZPOCZĘCIE MAPOWANIA DO BAZY DANYCH =====");
    logWithTag(`Rozpoczęto mapowanie ${reservations.length} rezerwacji do bazy danych.`);
    logWithTag("Czy kontekst bazy danych dostępny:", !!ctx.db);
    logWithTag("Timestamp:", new Date().toISOString());

    if (reservations.length === 0) {
        logWithTag("Brak rezerwacji do zmapowania.");
        logWithTag("===== ZAKOŃCZENIE MAPOWANIA (BRAK DANYCH) =====");
        return;
    }

    // 1. Zbierz wszystkie ID z przychodzących rezerwacji
    const idobookingIds = reservations.map((r) => r.id);

    // 2. Pobierz wszystkie istniejące rezerwacje jednym zapytaniem
    logWithTag(`Pobieranie istniejących rezerwacji dla ${idobookingIds.length} ID...`);
    const existingReservations = await ctx.db.reservation.findMany({
        where: {
            idobookingId: {
                in: idobookingIds,
            },
        },
        select: {
            idobookingId: true,
            status: true,
        },
    });

    const existingReservationsMap = new Map(
        existingReservations.map((r) => [r.idobookingId, r]),
    );
    logWithTag(`Znaleziono ${existingReservationsMap.size} pasujących istniejących rezerwacji.`);

    // 3. Podziel rezerwacje na do utworzenia i do aktualizacji
    const reservationsToCreate: Prisma.ReservationCreateManyInput[] = [];
    const reservationsToUpdate: { idobookingId: number; status: string, oldStatus: string }[] = [];

    for (const reservation of reservations) {
        const { id: idobookingId, reservationDetails, items, client } = reservation;
        const existing = existingReservationsMap.get(idobookingId);

        if (existing) {
            // Rezerwacja istnieje, sprawdź czy status się zmienił
            const mappedStatus = mapIdobookingStatus(reservationDetails.status);
            if (existing.status !== mappedStatus) {
                reservationsToUpdate.push({
                    idobookingId,
                    status: mappedStatus,
                    oldStatus: existing.status,
                });
            }
        } else {
            // Rezerwacja nie istnieje, przygotuj dane do utworzenia
            const details = reservationDetails;
            let sourceName: string;
            if (details.internalSource && details.internalSource !== 'other') {
                const internalSourceMapping: Record<string, string> = {
                    email: "Email", phone: "Telefon", faceToFaceConversation: "Osobiście", socialMedia: "Social Media"
                };
                sourceName = internalSourceMapping[details.internalSource] ?? details.internalSource;
            } else if (details.reservationSourceId) {
                sourceName = `Idobooking (ID: ${details.reservationSourceId})`;
            } else if (details.reservationSourceTypeId) {
                sourceName = `Idobooking (Typ ID: ${details.reservationSourceTypeId})`;
            } else {
                sourceName = "Brak";
            }

            const firstItem = items[0];
            const adultsCount = firstItem?.numberOfAdults ?? firstItem?.numberOfGuests ?? 1;
            const bigChildrenCount = firstItem?.numberOfBigChildren ?? 0;
            const smallChildrenCount = firstItem?.numberOfSmallChildren ?? 0;
            const totalChildrenCount = bigChildrenCount + smallChildrenCount;

            // Bezpieczne pobieranie nazwy gościa
            let guestName = "Nieznany gość";
            if (client) {
                guestName = `${client.firstName} ${client.lastName}`.trim();
                if (!guestName) guestName = "Nieznany gość";
            }

            reservationsToCreate.push({
                idobookingId,
                status: mapIdobookingStatus(details.status),
                apartmentName: firstItem?.objectName ?? "N/A",
                currency: details.currency,
                source: sourceName,
                createDate: new Date(details.dateAdd),
                guest: guestName,
                start: new Date(details.dateFrom),
                end: new Date(details.dateTo),
                payment: details.price.toString(),
                adults: adultsCount,
                children: totalChildrenCount,
                address: firstItem?.objectName ?? "Brak adresu",
                paymantValue: details.price,
            });
        }
    }

    // 4a. Spróbuj przypisać apartmentId dla nowych rezerwacji po idobookingId/objectName
    if (reservationsToCreate.length > 0) {
        // Zbuduj mapę Apartamentów: po idobookingId i po name (fallback)
        const apartmentCandidates = await ctx.db.apartment.findMany({
            select: { id: true, idobookingId: true, name: true },
        });

        // Rezerwacje z API nie mają bezpośrednio objectId w naszym wpisie,
        // więc obecnie używamy dopasowania po nazwie apartamentu.
        const aptByName = new Map(
            apartmentCandidates.map((a) => [a.name.trim().toLowerCase(), a.id]),
        );

        for (const rec of reservationsToCreate) {
            // Spróbuj dopasować po idobookingId rezerwacji (Reservation.items[0]?.objectId - ale nie przechowujemy go tutaj)
            // Zamiast tego użyjemy nazwy apartamentu z IdoBooking jako fallback
            const normalizedName = rec.apartmentName?.trim().toLowerCase() ?? null;
            if (normalizedName && aptByName.has(normalizedName)) {
                const aptId = aptByName.get(normalizedName);
                if (typeof aptId === "number") {
                    (rec).apartmentId = aptId;
                }
            }
        }
    }

    // 4b. Wykonaj operacje hurtowe
    if (reservationsToCreate.length > 0) {
        logWithTag(`Tworzenie ${reservationsToCreate.length} nowych rezerwacji...`);
        try {
            const result = await ctx.db.reservation.createMany({
                data: reservationsToCreate,
                skipDuplicates: true,
            });
            logWithTag(`✅ Utworzono ${result.count} nowych rezerwacji.`);
        } catch (error) {
            logWithTag(`❌ Błąd podczas tworzenia rezerwacji (createMany):`, error);
        }
    } else {
        logWithTag("Brak nowych rezerwacji do utworzenia.");
    }

    if (reservationsToUpdate.length > 0) {
        logWithTag(`Aktualizowanie statusu dla ${reservationsToUpdate.length} rezerwacji...`);

        // Grupuj rezerwacje do aktualizacji po nowym statusie
        const updatesByStatus: Record<string, { idobookingId: number; oldStatus: string }[]> = {};
        for (const res of reservationsToUpdate) {
            (updatesByStatus[res.status] ??= []).push({ idobookingId: res.idobookingId, oldStatus: res.oldStatus });
        }

        const updatePromises = Object.entries(updatesByStatus).map(async ([status,
            reservationsGroup]) => {
            const idsToUpdate = reservationsGroup.map(r => r.idobookingId);
            logWithTag(`Aktualizowanie ${idsToUpdate.length} rezerwacji na status "${status}"`);
            return ctx.db.reservation.updateMany({
                where: {
                    idobookingId: {
                        in: idsToUpdate
                    }
                },
                data: {
                    status: status
                },
            });
        });

        try {
            const results = await Promise.all(updatePromises);
            const totalUpdated = results.reduce((acc, result) => acc + result.count, 0);
            logWithTag(`✅ Zaktualizowano status dla ${totalUpdated} rezerwacji w ${results.length} grupach.`);
        } catch (error) {
            logWithTag(`❌ Błąd podczas hurtowej aktualizacji statusów rezerwacji:`, error);
        }
    } else {
        logWithTag("Brak rezerwacji do zaktualizowania.");
    }

    logWithTag("===== ZAKOŃCZENIE MAPOWANIA (SUCCESS) =====");
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


// (tymczasowy placeholder — właściwy router eksportowany niżej)

// Internal shared sync implementation (outside router)
async function internalSync(
    ctx: Awaited<ReturnType<typeof createTRPCContext>>,
    options: ReservationFetchOptions = {},
) {
    const startTime = Date.now();
    const syncId = Math.random().toString(36).substring(7);

    const reservations = await getReservations(options);
    await mapToDBReservations(reservations, ctx);

    const duration = Date.now() - startTime;
    return {
        success: true as const,
        message: `Synchronizacja zakończona pomyślnie. Przetworzono ${reservations.length} rezerwacji w ${duration}ms.`,
        syncId,
        reservationsCount: reservations.length,
        duration: `${duration}ms`,
    };
}

export const idobookingRouter = createTRPCRouter({
    syncReservations: protectedProcedure
        .output(syncResponseSchema)
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą synchronizować rezerwacje.",
                });
            }

            const startTime = Date.now();
            const syncId = Math.random().toString(36).substring(7);

            console.log("🔧 [SYNC-TRPC] ===== ROZPOCZĘCIE SYNCHRONIZACJI tRPC =====");
            console.log("🔧 [SYNC-TRPC] Użytkownik:", ctx.session.user.email);
            console.log("🔧 [SYNC-TRPC] Typ użytkownika:", ctx.session.user.type);
            console.log("🔧 [SYNC-TRPC] Sync ID:", syncId);
            console.log("🔧 [SYNC-TRPC] NODE_ENV:", process.env.NODE_ENV);
            console.log("🔧 [SYNC-TRPC] Timestamp:", new Date().toISOString());

            try {
                const result = await internalSync(ctx);
                console.log("🔧 [SYNC-TRPC] ✅ Synchronizacja zakończona pomyślnie.");
                console.log("🔧 [SYNC-TRPC] Czas wykonania:", result.duration);
                console.log("🔧 [SYNC-TRPC] ===== ZAKOŃCZENIE SYNCHRONIZACJI tRPC (SUCCESS) =====");
                return result;
            } catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";

                console.error("🔧 [SYNC-TRPC] ❌ Wystąpił błąd podczas synchronizacji:", {
                    error: errorMessage,
                    stack: error instanceof Error ? error.stack : undefined,
                    syncId,
                    duration: `${duration}ms`
                });
                console.log("🔧 [SYNC-TRPC] ===== ZAKOŃCZENIE SYNCHRONIZACJI tRPC (ERROR) =====");

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Błąd synchronizacji: ${errorMessage}`,
                });
            }
        }),
    syncReservationsCron: publicProcedure
        .input(z.object({ startDateISO: z.string().optional(), endDateISO: z.string().optional() }).optional())
        .output(syncResponseSchema)
        .mutation(async ({ ctx, input }) => {
            // Guard with CRON_SECRET if set
            if (env.CRON_SECRET) {
                const auth = ctx.headers.get?.("authorization");
                const ok = auth === `Bearer ${env.CRON_SECRET}`;
                if (!ok) {
                    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid CRON secret" });
                }
            }

            return internalSync(ctx, {
                startDateISO: input?.startDateISO,
                endDateISO: input?.endDateISO,
            });
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
