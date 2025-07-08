import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { UserType } from "@prisma/client";
import { type inferAsyncReturnType } from "@trpc/server";
import { type createTRPCContext } from "@/server/api/trpc";

// Zod schemas dla API responses
const reservationDetailsSchema = z.object({
    price: z.number(),
    advance: z.number(),
    currency: z.string(),
    dateAdd: z.string(),
    dateFrom: z.string(),
    dateTo: z.string(),
    reservationSourceTypeId: z.number().optional(),
    reservationSourceId: z.number().optional(),
    externalReservationId: z.string().optional(),
    reservationManager: z.enum(["external", "own"]).optional(),
    internalSource: z
        .enum(["other", "email", "phone", "faceToFaceConversation", "socialMedia"])
        .optional(),
    clientId: z.number().optional(),
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
    discount: z.number().optional(),
    balance: z.number().optional(),
    modificationStatus: z.enum(["new", "modified"]).optional(),
    modificationDate: z.string().optional(),
    note: z.string(),
    languageCode: z.string().optional(),
    isSurplus: z.number().optional(),
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
    isSurplus: z.number().optional(), // API returns number, not enum
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
    companyName: z.string(),
    taxNumber: z.string(),
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
                reservations: z.array(reservationSchema),
                result: z.object({
                    page: z.number(),
                    countOnPage: z.number(),
                    pageAll: z.number(),
                    countAll: z.number(),
                }),
            }),
            id: z.string(),
        });

        const parsedResponse = responseSchema.parse(responseData);
        const pageReservations = parsedResponse.result.reservations;
        const pagination = parsedResponse.result.result;

        allReservations.push(...pageReservations);
        totalPages = pagination.pageAll;

        logWithTag(
            `Strona ${currentPage}: ${pageReservations.length} rezerwacji (łącznie ${allReservations.length}/${pagination.countAll})`
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
    ctx: inferAsyncReturnType<typeof createTRPCContext>,
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

        const operations = batch.map(async (reservation) => {
            const { id: idobookingId, reservationDetails, items, client } = reservation;

            logWithTag(`Przetwarzanie rezerwacji IdoBooking ID: ${idobookingId}`);

            const firstItem = items[0];
            const adultsCount = firstItem?.numberOfAdults ?? firstItem?.numberOfGuests ?? 1;
            const bigChildrenCount = firstItem?.numberOfBigChildren ?? 0;
            const smallChildrenCount = firstItem?.numberOfSmallChildren ?? 0;
            const totalChildrenCount = bigChildrenCount + smallChildrenCount;

            const reservationData = {
                idobookingId,
                status: reservationDetails.status,
                apartmentName: firstItem?.objectName ?? "N/A",
                price: reservationDetails.price,
                advance: reservationDetails.advance,
                currency: reservationDetails.currency,
                dateAdd: new Date(reservationDetails.dateAdd),
                dateTo: new Date(reservationDetails.dateTo),
                dateFrom: new Date(reservationDetails.dateFrom),
                clientName: `${client.firstName} ${client.lastName}`,
                clientEmail: client.email,
                clientPhone: client.phone,
                clientAddress: `${client.street}, ${client.zipcode} ${client.city}`,
                reservationSource: reservationDetails.reservationSourceTypeId?.toString(),
                // Uzupełnienie brakujących pól
                source: "idobooking",
                createDate: new Date(reservationDetails.dateAdd),
                guest: `${client.firstName} ${client.lastName}`.trim(),
                start: new Date(reservationDetails.dateFrom),
                end: new Date(reservationDetails.dateTo),
                payment: reservationDetails.price.toString(),
                adults: adultsCount,
                children: totalChildrenCount,
                // Uzupełnienie brakujących pól z drugiego błędu
                address: firstItem?.objectName ?? "Brak adresu",
                paymantValue: reservationDetails.price,
            };

            logWithTag(`Dane rezerwacji IdoBooking ID: ${idobookingId} przygotowane do zapisu:`, {
                status: reservationData.status,
                apartmentName: reservationData.apartmentName,
                dates: `${reservationData.dateFrom.toISOString()} - ${reservationData.dateTo.toISOString()}`,
                client: reservationData.clientName,
            });

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
});
