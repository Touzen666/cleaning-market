import { z } from "zod";
import { createHash } from "crypto";
import { type Prisma, type PrismaClient, ReportItemType } from "@prisma/client";
import { resolveStoredReservationSource } from "@/lib/reservation-channel";

/** Kontekst wystarczający do mapowania rezerwacji (bez importu trpc → auth → react). */
export type IdobookingSyncCtx = { db: PrismaClient };

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

/** Równoległość ograniczona do `chunkSize` — bez tego tysiące `update` w jednym `Promise.all` wyczerpuje pool (P2024). */
async function promiseAllInChunks<T>(
    items: T[],
    chunkSize: number,
    fn: (item: T) => Promise<unknown>,
): Promise<void> {
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map((item) => fn(item)));
    }
}

// Zod schemas dla API responses
// Bezpieczne parsowanie pól liczbowych, które mogą przyjść jako string/boolean/null
const safeNumberOptional = z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return undefined;
    if (val === "y") return 1;
    if (val === "n") return 0;
    if (typeof val === "boolean") return val ? 1 : 0;
    const num = Number(val as unknown);
    return Number.isNaN(num) ? undefined : num;
}, z.number().optional());

/** API zwraca często null zamiast "" — bez tego cała rezerwacja odpada w safeParse */
const apiString = z.preprocess((val) => val ?? "", z.string());

const apiNumber = z.preprocess((val) => {
    if (val === null || val === undefined || val === "") return 0;
    const num = Number(val as unknown);
    return Number.isNaN(num) ? 0 : num;
}, z.number());

const apiOptionalString = z.preprocess((val) => val ?? undefined, z.string().optional());

const reservationDetailsSchema = z.object({
    price: apiNumber,
    advance: apiNumber,
    currency: apiString,
    dateAdd: z.string(),
    dateFrom: z.string(),
    dateTo: z.string(),
    reservationSourceTypeId: z.coerce.number().optional(),
    reservationSourceId: z.coerce.number().optional(),
    externalReservationId: apiOptionalString,
    reservationManager: z.enum(["external", "own"]).optional(),
    internalSource: z
        .enum(["other", "email", "phone", "faceToFaceConversation", "socialMedia"])
        .optional(),
    clientId: z.coerce.number().optional(),
    // API może dodać nowe statusy — nie blokuj całej synchronizacji sztywnym enumem
    status: z.string(),
    internalNote: apiString,
    apiNote: apiString,
    externalNote: apiString,
    clientNote: apiString,
    discount: z.coerce.number().optional(),
    balance: z.preprocess((val) => {
        if (val === null || val === undefined || val === "") return undefined;
        const num = Number(val as unknown);
        return Number.isNaN(num) ? undefined : num;
    }, z.number().optional()),
    modificationStatus: z.enum(["new", "modified"]).optional(),
    modificationDate: apiOptionalString,
    note: apiOptionalString,
    languageCode: apiOptionalString,
    // API potrafi zwrócić 0/1, 'y'/'n', boolean, pusty string – normalizujemy do liczby lub undefined
    isSurplus: safeNumberOptional,
});

const reservationItemSchema = z.object({
    objectItemId: z.coerce.number().optional(),
    itemId: z.coerce.number().optional(),
    objectName: apiOptionalString,
    itemCode: apiOptionalString,
    objectId: z.coerce.number().optional(),
    // Pola często przychodzą jako stringi – koercja/normalizacja do liczby
    numberOfAdults: z.coerce.number().optional(),
    numberOfBigChildren: z.coerce.number().optional(),
    numberOfSmallChildren: z.coerce.number().optional(),
    priceCorrection: apiNumber,
    price: apiNumber,
    vat: apiNumber,
    numberOfGuests: z.coerce.number().optional(),
    // API returns number zwykle, ale może być też 'y'/'n'/boolean/pusty – normalizujemy
    isSurplus: safeNumberOptional, // API returns number, not enum
    prices: z.array(z.unknown()).optional(),
    addons: z.array(z.unknown()).optional(),
});

const reservationGuestSchema = z.object({
    firstName: apiOptionalString,
    lastName: apiOptionalString,
    street: apiOptionalString,
    zipcode: apiOptionalString,
    city: apiOptionalString,
    countryCode: apiOptionalString,
    phone: apiOptionalString,
    email: apiOptionalString,
    language: apiOptionalString,
    age: z.coerce.number().optional(),
});

const reservationClientSchema = z.object({
    id: z.coerce.number(),
    login: apiString,
    clientType: z.enum(["person", "company"]),
    status: z.enum(["active", "blocked"]).optional(),
    companyName: apiOptionalString,
    taxNumber: apiOptionalString,
    firstName: apiString,
    lastName: apiString,
    street: apiString,
    zipcode: apiString,
    city: apiString,
    countryCode: apiString,
    phone: apiString,
    email: apiString,
    language: apiString,
    langDescription: apiOptionalString,
    currency: apiString,
    guests: z.array(reservationGuestSchema),
    invoiceData: z
        .object({
            firstName: apiOptionalString,
            lastName: apiOptionalString,
            companyName: apiOptionalString,
            taxNumber: apiOptionalString,
            street: apiOptionalString,
            zipcode: apiOptionalString,
            city: apiOptionalString,
            countryCode: apiOptionalString,
        })
        .optional(),
    notification: z.enum(["y", "n"]).optional(),
    sendNewsletter: z.enum(["y", "n"]).optional(),
    note: apiOptionalString,
    discountForItemsInPromotion: z.coerce.number().optional(),
    discountForItemsNotInPromotion: z.coerce.number().optional(),
});

const reservationSchema = z.object({
    id: z.coerce.number(),
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
export const syncResponseSchema = z.object({
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

// Normalizacja nazw: usuwamy nawiasowe prefiksy (np. "(Primary)"),
// diakrytyki, znaki niealfanumeryczne i podwójne spacje
function canonicalizeName(input: string | null | undefined): string {
    if (!input) return "";
    const withoutLeadingParenTag = input.replace(/^\s*\([^)]*\)\s*/g, ""); // usuń np. "(Primary) "
    const lower = withoutLeadingParenTag.toLowerCase();
    // usuwanie diakrytyków
    const noDiacritics = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // zamiana wszystkiego co nie litera/cyfra na spację
    const lettersOnly = noDiacritics.replace(/[^a-z0-9]+/g, " ");
    // redukcja wielokrotnych spacji
    return lettersOnly.trim().replace(/\s+/g, " ");
}

// Opcjonalny filtr debugowania: podaj pełną nazwę apartamentu w env DEBUG_APARTMENT_NAME,
// aby zalogować identyfikatory pozycji (objectItemId/itemId/objectId/itemCode)
const DEBUG_APARTMENT_NAME_CANON = canonicalizeName(process.env.DEBUG_APARTMENT_NAME ?? "");

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

    // Domyślne okno synchronizacji (ręczna synchronizacja z panelu):
    // - start: 18 miesięcy wstecz — starsze pobyty nadal wpływają na rozliczenia i raporty
    // - end: bardzo szerokie w przyszłość (można zawęzić przez przekazanie endDateISO)
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setMonth(defaultStart.getMonth() - 18);
    const defaultEnd = new Date("2100-01-01T00:00:00.000Z");

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

        const rawPage = parsedResponse.result.reservations ?? [];
        const pageReservations: z.infer<typeof reservationSchema>[] = [];
        for (const raw of rawPage) {
            const parsed = reservationSchema.safeParse(raw);
            if (!parsed.success) {
                logWithTag("Pominięto rezerwację z powodu błędu walidacji (Zod):", {
                    issues: parsed.error.flatten(),
                    rawId: (raw as { id?: unknown })?.id,
                });
                continue;
            }
            pageReservations.push(parsed.data);
        }
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
    ctx: IdobookingSyncCtx,
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

    const sourceCatalogById = new Map<number, string>();
    try {
        const sources = await getSources();
        for (const source of sources) {
            sourceCatalogById.set(source.reservationSourceId, source.reservationSourceName);
        }
        logWithTag(`Katalog źródeł IdoBooking: ${sourceCatalogById.size} pozycji.`);
    } catch (error) {
        logWithTag("Nie udało się pobrać katalogu źródeł IdoBooking, używam mapy ID 8=Booking / 14=Airbnb.", error);
    }

    type ExistingReservationLookup = {
        idobookingId: number;
        idobookingObjectItemId: number;
        status: string;
        itemCode: string | null;
        apartmentName: string;
        source: string;
    };

    const lineKey = (id: number, objectLineId: number) => `${id}_${objectLineId}`;

    const objectLineDiscriminant = (
        item: z.infer<typeof reservationItemSchema>,
        lineIdx: number,
    ): number => (typeof item.objectItemId === "number" ? item.objectItemId : 1_000_000 + lineIdx);

    const pickExistingLine = (
        map: Map<string, ExistingReservationLookup>,
        idobookingId: number,
        discrim: number,
        totalItems: number,
    ): ExistingReservationLookup | undefined => {
        let row = map.get(lineKey(idobookingId, discrim));
        if (row) return row;
        // Migracja z pojedynczej linii (0) na prawdziwy objectItemId z API
        if (totalItems === 1 && discrim !== 0) {
            row = map.get(lineKey(idobookingId, 0));
        }
        return row;
    };

    // 1. Zbierz unikalne ID rezerwacji IdoBooking (jedna rezerwacja może mieć wiele pozycji / pokoi)
    const idobookingIds = [...new Set(reservations.map((r) => r.id))];

    // Warianty nazw — pełny obraz zanim przypiszemy nazwy wyświetlane (wszystkie pozycje ze wszystkich rezerwacji)
    const variantsByBaseName = new Map<string, Set<string>>();
    for (const reservation of reservations) {
        for (const item of reservation.items) {
            if (item.objectName && item.itemCode) {
                const baseKey = canonicalizeName(item.objectName);
                const set = variantsByBaseName.get(baseKey) ?? new Set<string>();
                set.add(item.itemCode);
                variantsByBaseName.set(baseKey, set);
            }
        }
    }

    // 2. Pobierz istniejące wiersze dla tych ID (wszystkie linie: idobookingObjectItemId)
    logWithTag(`Pobieranie istniejących rezerwacji dla ${idobookingIds.length} ID rezerwacji IdoBooking...`);

    const existingReservations = await ctx.db.reservation.findMany({
        where: {
            idobookingId: {
                in: idobookingIds,
            },
        },
        select: {
            idobookingId: true,
            idobookingObjectItemId: true,
            status: true,
            itemCode: true,
            apartmentName: true,
            source: true,
        },
    });

    const existingReservationsMap = new Map<string, ExistingReservationLookup>();
    for (const r of existingReservations) {
        if (r.idobookingId == null) continue;
        const mapped: ExistingReservationLookup = {
            idobookingId: r.idobookingId,
            idobookingObjectItemId: r.idobookingObjectItemId,
            status: r.status,
            itemCode: r.itemCode ?? null,
            apartmentName: r.apartmentName,
            source: r.source,
        };
        existingReservationsMap.set(lineKey(r.idobookingId, r.idobookingObjectItemId), mapped);
    }
    logWithTag(`Znaleziono ${existingReservationsMap.size} istniejących linii rezerwacji (łącznie z wariantami).`);

    // 3. Podziel na do utworzenia i do aktualizacji
    type ReservationCreateManyInputExtended = Prisma.ReservationCreateManyInput & { itemCode?: string | null };
    const reservationsToCreate: ReservationCreateManyInputExtended[] = [];
    const reservationsCreateMeta: {
        index: number;
        objectItemId?: number;
        itemId?: number;
        objectId?: number;
        itemCode?: string | null;
        objectName?: string | null;
        apartmentId?: number;
    }[] = [];
    const reservationsToUpdate: {
        idobookingId: number;
        idobookingObjectItemId: number;
        data: Prisma.ReservationUpdateInput;
    }[] = [];

    for (const reservation of reservations) {
        const { id: idobookingId, reservationDetails, items, client } = reservation;
        if (!items.length) {
            logWithTag(`Pominięto rezerwację ${idobookingId} — brak tablicy items w odpowiedzi API.`);
            continue;
        }

        const totalItems = items.length;
        const sourceName = resolveStoredReservationSource(reservationDetails, sourceCatalogById);

        for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx]!;
            const objectLineId = objectLineDiscriminant(item, itemIdx);
            const existing = pickExistingLine(existingReservationsMap, idobookingId, objectLineId, totalItems);

            const itemCode = item.itemCode ?? null;
            const objectName = item.objectName ?? null;

            if (existing) {
                const mappedStatus = mapIdobookingStatus(reservationDetails.status);

                if (DEBUG_APARTMENT_NAME_CANON) {
                    const itemNameCanon = canonicalizeName(item.objectName ?? "");
                    if (itemNameCanon && itemNameCanon === DEBUG_APARTMENT_NAME_CANON) {
                        logWithTag("DBG(existing) Identyfikatory pozycji:", {
                            idobookingReservationId: idobookingId,
                            idobookingObjectItemId: objectLineId,
                            objectItemId: item.objectItemId,
                            itemId: item.itemId,
                            objectId: item.objectId,
                            itemCode: item.itemCode,
                            objectName: item.objectName,
                        });
                    }
                }

                const baseNameCanon = canonicalizeName(objectName ?? "");
                const codes = variantsByBaseName.get(baseNameCanon);
                const isMultiVariant = !!codes && codes.size > 1;
                const normalizedItemCode = (itemCode ?? "").trim();
                const desiredApartmentName =
                    isMultiVariant && normalizedItemCode
                        ? `${objectName ?? ""} ${normalizedItemCode}`.trim()
                        : objectName ?? existing.apartmentName ?? "N/A";

                const data: Prisma.ReservationUpdateInput = {};
                if (existing.status !== mappedStatus) data.status = mappedStatus;
                if (existing.itemCode !== itemCode) data.itemCode = itemCode;
                if (existing.apartmentName !== desiredApartmentName) data.apartmentName = desiredApartmentName;
                if (existing.source !== sourceName) data.source = sourceName;
                if (existing.idobookingObjectItemId !== objectLineId && objectLineId !== 0) {
                    data.idobookingObjectItemId = objectLineId;
                }

                if (Object.keys(data).length > 0) {
                    reservationsToUpdate.push({
                        idobookingId,
                        idobookingObjectItemId: existing.idobookingObjectItemId,
                        data,
                    });
                }
            } else {
                const details = reservationDetails;

                if (DEBUG_APARTMENT_NAME_CANON) {
                    const itemNameCanon = canonicalizeName(item.objectName ?? "");
                    if (itemNameCanon && itemNameCanon === DEBUG_APARTMENT_NAME_CANON) {
                        logWithTag("DBG(new) Identyfikatory pozycji:", {
                            idobookingReservationId: idobookingId,
                            idobookingObjectItemId: objectLineId,
                            objectItemId: item.objectItemId,
                            itemId: item.itemId,
                            objectId: item.objectId,
                            itemCode: item.itemCode,
                            objectName: item.objectName,
                        });
                    }
                }

                const adultsCount = item.numberOfAdults ?? item.numberOfGuests ?? 1;
                const bigChildrenCount = item.numberOfBigChildren ?? 0;
                const smallChildrenCount = item.numberOfSmallChildren ?? 0;
                const totalChildrenCount = bigChildrenCount + smallChildrenCount;

                let guestName = "Nieznany gość";
                if (client) {
                    guestName = `${client.firstName} ${client.lastName}`.trim();
                    if (!guestName) guestName = "Nieznany gość";
                }

                const objectItemId = item.objectItemId;
                const objectId = item.objectId;
                const itemId = item.itemId;

                const linePayment =
                    totalItems > 1 ? item.price + item.priceCorrection : details.price;

                reservationsToCreate.push({
                    idobookingId,
                    idobookingObjectItemId: objectLineId,
                    status: mapIdobookingStatus(details.status),
                    apartmentName: objectName ?? "N/A",
                    itemCode: itemCode ?? undefined,
                    currency: details.currency,
                    source: sourceName,
                    createDate: new Date(details.dateAdd),
                    guest: guestName,
                    start: new Date(details.dateFrom),
                    end: new Date(details.dateTo),
                    payment: linePayment.toString(),
                    adults: adultsCount,
                    children: totalChildrenCount,
                    address: item.objectName ?? "Brak adresu",
                    paymantValue: linePayment,
                });

                reservationsCreateMeta.push({
                    index: reservationsToCreate.length - 1,
                    objectItemId,
                    itemId,
                    objectId,
                    itemCode,
                    objectName,
                    apartmentId: undefined as unknown as number,
                });
            }
        }
    }

    // 4a. Spróbuj przypisać apartmentId dla nowych rezerwacji po idobookingId/objectName
    if (reservationsToCreate.length > 0) {
        // Zbuduj mapę Apartamentów: po idobookingId i po name (fallback)
        const apartmentCandidates = await ctx.db.apartment.findMany({
            select: { id: true, idobookingId: true, name: true },
        });

        // 1) Dokładne dopasowanie po idobookingId (w IdoBooking: objectItemId/itemId)
        const aptByIdobookingId = new Map<number, number>();
        for (const a of apartmentCandidates) {
            if (typeof a.idobookingId === "number") {
                aptByIdobookingId.set(a.idobookingId, a.id);
            }
        }

        // 2) Fallback po nazwie (dla starszych wpisów bez idobookingId),
        //    ale z kanonizacją i preferencją wpisu oznaczonego jako "(Primary)"
        const aptByCanonicalName = new Map<string, number | { primary?: number; any?: number }>();
        for (const a of apartmentCandidates) {
            const canonical = canonicalizeName(a.name);
            const current = aptByCanonicalName.get(canonical);
            const isPrimary = /^\s*\(primary\)/i.test(a.name);
            if (!current) {
                if (isPrimary) {
                    aptByCanonicalName.set(canonical, { primary: a.id });
                } else {
                    aptByCanonicalName.set(canonical, { any: a.id });
                }
            } else {
                if (typeof current === "number") {
                    // zamień na obiekt i zaznacz preferencję primary, jeśli dotyczy
                    const obj = isPrimary ? { primary: a.id } : { any: current };
                    aptByCanonicalName.set(canonical, obj);
                } else {
                    if (isPrimary) current.primary = a.id;
                    else current.any ??= a.id;
                }
            }
        }
        const pickFromBucket = (bucket?: number | { primary?: number; any?: number }): number | undefined => {
            if (bucket === undefined) return undefined;
            if (typeof bucket === "number") return bucket;
            return bucket.primary ?? bucket.any;
        };

        for (const meta of reservationsCreateMeta) {
            const rec = reservationsToCreate[meta.index];
            if (!rec) continue;

            // Jeśli obiekt ma wiele wariantów (różne itemCode), dopisz itemCode do nazwy apartamentu,
            // aby rozróżnić pokoje i ułatwić przypisanie do odpowiedniego wpisu
            const baseNameCanon = canonicalizeName(meta.objectName ?? rec.apartmentName ?? "");
            const codes = variantsByBaseName.get(baseNameCanon);
            const isMultiVariant = !!codes && codes.size > 1;
            const normalizedItemCode = (meta.itemCode ?? "").trim();
            if (isMultiVariant && normalizedItemCode) {
                const displayName = `${meta.objectName ?? rec.apartmentName ?? ""} ${normalizedItemCode}`.trim();
                rec.apartmentName = displayName;
            }

            // Najpierw spróbuj dopasować po dokładnym ID
            const idCandidates: Array<number | undefined> = [
                meta.objectItemId,
                meta.itemId,
                meta.objectId,
            ];
            let matchedApartmentId: number | undefined;
            for (const candidateId of idCandidates) {
                if (typeof candidateId === "number" && aptByIdobookingId.has(candidateId)) {
                    matchedApartmentId = aptByIdobookingId.get(candidateId);
                    break;
                }
            }

            // Jeśli brak dopasowania po ID, użyj nazwy jako zapas
            if (!matchedApartmentId) {
                // Przy wielowariantowych obiektach, najpierw próbuj dopasować nazwę z itemCode,
                // następnie bazową nazwę
                const candidates: string[] = [];
                if (isMultiVariant && normalizedItemCode) {
                    candidates.push(canonicalizeName(`${meta.objectName ?? rec.apartmentName ?? ""} ${normalizedItemCode}`));
                }
                candidates.push(canonicalizeName(meta.objectName ?? rec.apartmentName ?? ""));

                for (const canonical of candidates) {
                    if (!canonical) continue;
                    const bucket = aptByCanonicalName.get(canonical);
                    const maybeId = pickFromBucket(bucket);
                    if (typeof maybeId === "number") {
                        matchedApartmentId = maybeId;
                        break;
                    }
                }
            }

            if (typeof matchedApartmentId === "number") {
                (rec).apartmentId = matchedApartmentId;
                // zapisz w meta
                meta.apartmentId = matchedApartmentId;
            }
        }
    }

    // 4b. Wykonaj operacje hurtowe
    if (reservationsToCreate.length > 0) {
        // Przypisz roomId do rekordów na podstawie apartmentId + itemCode
        // Klient do obsługi tabeli Room (typowany lokalnie, aby uniknąć any)
        type RoomClient = {
            findFirst: (args: unknown) => Promise<{ id: number } | null>;
            create: (args: unknown) => Promise<{ id: number }>;
        };
        const roomClient = (ctx.db as unknown as { room: RoomClient }).room;
        const roomIdByApartmentAndCode = new Map<string, number>();
        for (const meta of reservationsCreateMeta) {
            const rec = reservationsToCreate[meta.index];
            if (!rec?.apartmentId) continue;

            const codeCandidates = [
                meta.itemCode,
                meta.objectItemId != null ? String(meta.objectItemId) : undefined,
                meta.itemId != null ? String(meta.itemId) : undefined,
            ].filter((c): c is string => typeof c === "string" && c.trim().length > 0);

            const tried = new Set<string>();
            let roomId: number | undefined;

            for (const code of codeCandidates) {
                if (tried.has(code)) continue;
                tried.add(code);
                try {
                    const keyApartmentId = rec.apartmentId;
                    const cacheKey = `${keyApartmentId}:${code}`;
                    const cached = roomIdByApartmentAndCode.get(cacheKey);
                    if (cached !== undefined) {
                        roomId = cached;
                        break;
                    }
                    let found = await roomClient.findFirst({
                        where: { apartmentId: keyApartmentId, code },
                        select: { id: true },
                    });
                    if (!found) {
                        const name = `${rec.apartmentName ?? "Pokój"} ${code}`.trim();
                        const slug = name
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, "");
                        found = await roomClient.create({
                            data: {
                                apartmentId: keyApartmentId,
                                code,
                                name,
                                slug,
                                address: rec.address ?? "",
                            },
                            select: { id: true },
                        });
                    }
                    roomId = found.id;
                    roomIdByApartmentAndCode.set(cacheKey, found.id);
                    break;
                } catch {
                    // spróbuj następny kod kandydata
                }
            }

            if (typeof roomId === "number") {
                (rec as unknown as { roomId?: number }).roomId = roomId;
            }
        }
        logWithTag(`Tworzenie ${reservationsToCreate.length} nowych rezerwacji...`);
        const result = await ctx.db.reservation.createMany({
            data: reservationsToCreate,
            skipDuplicates: true,
        });
        logWithTag(`✅ Utworzono ${result.count} nowych rezerwacji.`);
    } else {
        logWithTag("Brak nowych rezerwacji do utworzenia.");
    }

    if (reservationsToUpdate.length > 0) {
        logWithTag(`Aktualizowanie danych dla ${reservationsToUpdate.length} rezerwacji...`);
        const UPDATE_CHUNK = 6;
        await promiseAllInChunks(reservationsToUpdate, UPDATE_CHUNK, (u) =>
            ctx.db.reservation.update({
                where: {
                    idobookingId_idobookingObjectItemId: {
                        idobookingId: u.idobookingId,
                        idobookingObjectItemId: u.idobookingObjectItemId,
                    },
                },
                data: u.data,
            }),
        );
        logWithTag(`✅ Zaktualizowano ${reservationsToUpdate.length} rezerwacji.`);

        const sourceUpdates = reservationsToUpdate.filter((u) => typeof u.data.source === "string");
        if (sourceUpdates.length > 0) {
            await promiseAllInChunks(sourceUpdates, UPDATE_CHUNK, (u) =>
                ctx.db.reportItem.updateMany({
                    where: {
                        type: ReportItemType.REVENUE,
                        isAutoGenerated: true,
                        reservation: {
                            idobookingId: u.idobookingId,
                            idobookingObjectItemId: u.idobookingObjectItemId,
                        },
                    },
                    data: { category: u.data.source as string },
                }),
            );
            logWithTag(`Zaktualizowano kategorię przychodu dla ${sourceUpdates.length} rezerwacji ze zmienionym źródłem.`);
        }
    } else {
        logWithTag("Brak rezerwacji do zaktualizowania.");
    }

    logWithTag("===== ZAKOŃCZENIE MAPOWANIA (SUCCESS) =====");
    logWithTag("Zakończono mapowanie wszystkich rezerwacji.");
}

export async function getSources(): Promise<z.infer<typeof reservationSourceDescriptionSchema>[]> {
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


// Router: `idobooking-router.ts` (osobny plik, żeby CLI / skrypty mogły importować sync bez łańcucha trpc → auth → react).

export async function internalSync(
    ctx: IdobookingSyncCtx,
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
