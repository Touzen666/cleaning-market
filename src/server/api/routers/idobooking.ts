import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createHash } from "crypto";
import { UserType } from "@prisma/client";
import { type inferAsyncReturnType } from "@trpc/server";
import { type createTRPCContext } from "@/server/api/trpc";

// Zod schemas dla API responses
const objectsGetAllResponseSchema = z.object({
    id: z.number(),
    name: z.string(),
    capacity: z.number(),
    area: z.number(),
    items: z.array(
        z.object({
            id: z.number(),
            code: z.string(),
            name: z.string(),
        }),
    ),
});

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

async function getApartmentsList(): Promise<
    z.infer<typeof objectsGetAllResponseSchema>[]
> {
    const apartments: z.infer<typeof objectsGetAllResponseSchema>[] = [];

    // Bezpośrednie zapytanie do API idobooking
    const response = await fetch(
        "https://zlote-wynajmy.pl/api/objects/getAll/1/json",
        {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json;charset=UTF-8",
            },
            body: JSON.stringify({
                authenticate: getAuth(),
            }),
        },
    );

    const responseData = (await response.json()) as {
        result?: { objects?: unknown[] };
    };

    for (const object of responseData.result?.objects ?? []) {
        const objectParsed = objectsGetAllResponseSchema.parse(object);
        apartments.push(objectParsed);
    }

    console.log(apartments);

    return apartments;
}

async function getReservations(): Promise<z.infer<typeof reservationSchema>[]> {
    const allReservations: z.infer<typeof reservationSchema>[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
        console.log(`Fetching page ${currentPage}...`);

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

        console.log(
            `Page ${currentPage}: ${pageReservations.length} reservations (${allReservations.length}/${pagination.countAll} total)`,
        );

        currentPage++;
    } while (currentPage <= totalPages);

    console.log(
        `Fetched all ${allReservations.length} reservations from ${totalPages} pages`,
    );
    return allReservations;
}

async function mapToDBReservations(
    reservations: z.infer<typeof reservationSchema>[],
    ctx: inferAsyncReturnType<typeof createTRPCContext>,
) {
    console.log(`Mapping ${reservations.length} reservations to database...`);

    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < reservations.length; i += batchSize) {
        batches.push(reservations.slice(i, i + batchSize));
    }

    let totalProcessed = 0;

    for (const [batchIndex, batch] of batches.entries()) {
        console.log(
            `Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} reservations)`,
        );

        const dbReservations = batch
            .map((reservation) => {
                try {
                    const firstItem = reservation.items[0];

                    const adultsCount =
                        firstItem?.numberOfAdults ?? firstItem?.numberOfGuests ?? 1;
                    const bigChildrenCount = firstItem?.numberOfBigChildren ?? 0;
                    const smallChildrenCount = firstItem?.numberOfSmallChildren ?? 0;
                    const totalChildrenCount = bigChildrenCount + smallChildrenCount;

                    return {
                        idobookingId: reservation.id,
                        guest:
                            `${reservation.client.firstName ?? ""} ${reservation.client.lastName ?? ""}`.trim(),
                        start: new Date(reservation.reservationDetails.dateFrom),
                        end: new Date(reservation.reservationDetails.dateTo),
                        paymantValue: reservation.reservationDetails.price,
                        currency: reservation.reservationDetails.currency,
                        source: "idobooking",
                        status:
                            reservation.reservationDetails.status === "completed"
                                ? "CONFIRMED"
                                : "PENDING",
                        createDate: new Date(reservation.reservationDetails.dateAdd),
                        apartmentName: firstItem?.objectName ?? "",
                        address: firstItem?.objectName ?? "",
                        payment: reservation.reservationDetails.price.toString(),
                        apartmentId: null, // You'll need to map this based on objectId
                        adults: adultsCount,
                        children: totalChildrenCount,
                    } as const;
                } catch (error) {
                    console.error(`Error mapping reservation ${reservation.id}:`, error);
                    return null;
                }
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        // Batch upsert to database
        try {
            const upsertPromises = dbReservations.map((dbReservation) =>
                ctx.db.reservation.upsert({
                    where: { idobookingId: dbReservation.idobookingId },
                    update: dbReservation,
                    create: dbReservation,
                }),
            );

            await Promise.all(upsertPromises);
            totalProcessed += dbReservations.length;

            console.log(
                `Batch ${batchIndex + 1} completed: ${dbReservations.length} reservations saved`,
            );
        } catch (error) {
            console.error(`Error saving batch ${batchIndex + 1}:`, error);
        }
    }

    console.log(
        `Finished processing ${totalProcessed} reservations in ${batches.length} batches`,
    );
}

export const idobookingRouter = createTRPCRouter({
    // Pobierz listę apartamentów z idobooking
    syncReservations: protectedProcedure.query(async ({ ctx }) => {
        if (ctx.session.user.type !== UserType.ADMIN) {
            throw new TRPCError({
                code: "FORBIDDEN",
                message: "Only admins can access idobooking data",
            });
        }

        const reservations = await getReservations();
        await mapToDBReservations(reservations, ctx);

        return true;
    }),
});
