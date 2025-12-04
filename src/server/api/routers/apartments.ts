import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { slugify } from "@/lib/types";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";
import { recalculateReportSettlement } from "./monthly-reports";

export const apartmentsRouter = createTRPCRouter({
    getAll: publicProcedure
        .output(z.object({
            success: z.boolean(),
            apartments: z.array(z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                address: z.string(),
                reservations: z.number(), // Dodajemy pole z liczbą rezerwacji
                rooms: z.array(z.object({
                    code: z.string(),
                    reservations: z.number(),
                    apartmentId: z.string().optional(),
                    id: z.string().optional(),
                    name: z.string().optional(),
                    slug: z.string().optional(),
                    address: z.string().optional(),
                    imageUrl: z.string().optional(),
                })).optional(),
                defaultRentAmount: z.number().nullable(),
                defaultUtilitiesAmount: z.number().nullable(),
                weeklyLaundryCost: z.number().nullable(),
                cleaningSuppliesCost: z.number().nullable(),
                capsuleCostPerGuest: z.number().nullable(),
                wineCost: z.number().nullable(),
                hasBalcony: z.boolean(),
                hasParking: z.boolean(),
                maxGuests: z.number().nullable(),
                images: z.array(z.object({
                    id: z.string(),
                    url: z.string(),
                    alt: z.string().nullable(),
                    isPrimary: z.boolean(),
                    order: z.number(),
                })),
                ownerships: z.array(z.object({
                    ownerId: z.string(),
                    owner: z.object({
                        id: z.string(),
                        firstName: z.string(),
                        lastName: z.string(),
                    })
                })).optional(),
            }))
        }))
        .query(async ({ ctx }) => {
            try {
                console.log("🚀 tRPC apartments.getAll called");

                const apartments = await ctx.db.apartment.findMany({
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        address: true,
                        _count: { // Zliczamy rezerwacje
                            select: { reservations: true },
                        },
                        defaultRentAmount: true,
                        defaultUtilitiesAmount: true,
                        weeklyLaundryCost: true,
                        cleaningSuppliesCost: true,
                        capsuleCostPerGuest: true,
                        wineCost: true,
                        hasBalcony: true,
                        hasParking: true,
                        maxGuests: true,
                        images: {
                            select: {
                                id: true,
                                url: true,
                                alt: true,
                                isPrimary: true,
                                order: true,
                            },
                            orderBy: {
                                order: 'asc',
                            },
                        },
                        ownerships: {
                            select: {
                                ownerId: true,
                                owner: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        name: 'asc',
                    },
                });

                // Pobierz pokoje (itemCode) dla każdego apartamentu
                const roomsByApartmentId = new Map<number, { code: string, reservations: number }[]>();
                type RoomRow = { id: number; code: string; name: string; slug: string; address: string; _count: { reservations: number } };
                type RoomClient = {
                    findMany: (args: unknown) => Promise<RoomRow[]>;
                    findFirst: (args: unknown) => Promise<{ id: number } | null>;
                    create: (args: unknown) => Promise<{ id: number }>;
                };
                const roomClient = (ctx.db as unknown as { room: RoomClient }).room;
                await Promise.all(apartments.map(async (apt) => {
                    const rooms = await roomClient.findMany({
                        where: { apartmentId: apt.id },
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            slug: true,
                            address: true,
                            _count: { select: { reservations: true } },
                        },
                        orderBy: { code: 'asc' },
                    });
                    roomsByApartmentId.set(
                        apt.id,
                        rooms.length > 1
                            ? rooms.map(r => ({
                                id: r.id.toString(),
                                code: r.code,
                                reservations: r._count.reservations,
                                apartmentId: apt.id.toString(),
                                name: r.name,
                                slug: r.slug,
                                address: r.address,
                                imageUrl: undefined,
                            }))
                            : [],
                    );
                }));

                return {
                    success: true,
                    apartments: apartments.map(apt => ({
                        ...apt,
                        id: apt.id.toString(),
                        reservations: apt._count.reservations, // Przekazujemy liczbę rezerwacji
                        rooms: roomsByApartmentId.get(apt.id) ?? [],
                        images: apt.images.map(img => ({
                            ...img,
                            id: img.id,
                        })),
                        ownerships: apt.ownerships.map(own => ({
                            ...own,
                            owner: {
                                ...own.owner,
                                id: own.owner.id.toString(),
                            }
                        }))
                    })),
                };
            } catch (error: unknown) {
                console.error("❌ Error fetching apartments:", error);
                throw new Error("Błąd podczas pobierania apartamentów");
            }
        }),

    // Jednorazowe budowanie tabeli Room i powiązań reservation.roomId na podstawie istniejących rezerwacji
    backfillRoomsFromReservations: protectedProcedure
        .output(z.object({
            success: z.boolean(),
            createdRooms: z.number(),
            updatedReservations: z.number(),
        }))
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą wykonywać tę akcję.",
                });
            }

            // Lokalny typowany klient dla tabeli Room (unikanie błędów typów, kiedy typy Prisma nie są zregenerowane)
            type RoomClient = {
                findFirst: (args: unknown) => Promise<{ id: number } | null>;
                create: (args: unknown) => Promise<{ id: number }>;
            };
            const roomClient = (ctx.db as unknown as { room: RoomClient }).room;

            // Zgrupuj istniejące rezerwacje według (apartmentId, itemCode)
            const groups = await ctx.db.reservation.groupBy({
                by: ["apartmentId", "itemCode"],
                where: {
                    apartmentId: { not: null },
                    itemCode: { not: null },
                },
                _count: { _all: true },
            });

            let createdRooms = 0;
            let updatedReservations = 0;

            for (const g of groups) {
                const apartmentId = (g.apartmentId ?? null) as unknown as number | null;
                const code = (g.itemCode ?? null) as unknown as string | null;
                if (!apartmentId || !code) continue;

                // Czy pokój już istnieje?
                const existing = await roomClient.findFirst({
                    where: { apartmentId, code },
                    select: { id: true },
                });
                let roomId = existing?.id;
                if (!roomId) {
                    // Potrzebujemy nazwy/adresu z apartamentu
                    const parent = await ctx.db.apartment.findUnique({
                        where: { id: apartmentId },
                        select: { name: true, address: true },
                    });
                    const baseName = parent?.name ?? "Pokój";
                    const name = `${baseName} ${code}`.trim();
                    const slug = slugify(name);
                    const created = await roomClient.create({
                        data: {
                            apartmentId,
                            code,
                            name,
                            slug,
                            address: parent?.address ?? "",
                        },
                        select: { id: true },
                    });
                    roomId = created.id;
                    createdRooms += 1;
                }

                // Uzupełnij powiązania reservation.roomId
                const updated = await ctx.db.reservation.updateMany({
                    where: {
                        apartmentId,
                        itemCode: code,
                        roomId: null,
                    },
                    data: { roomId },
                });
                updatedReservations += updated.count;
            }

            return { success: true, createdRooms, updatedReservations };
        }),

    // Utwórz osobny wpis apartamentu-variantu dla danego itemCode na bazie apartamentu nadrzędnego
    createVariant: protectedProcedure
        .input(z.object({
            parentApartmentId: z.string(),
            code: z.string().min(1),
        }))
        .output(z.object({
            success: z.boolean(),
            roomId: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą tworzyć warianty apartamentów",
                });
            }

            const parentIdNum = Number(input.parentApartmentId);
            const parent = await ctx.db.apartment.findUnique({
                where: { id: parentIdNum },
                select: {
                    name: true,
                    address: true,
                    defaultRentAmount: true,
                    defaultUtilitiesAmount: true,
                    weeklyLaundryCost: true,
                    cleaningSuppliesCost: true,
                    capsuleCostPerGuest: true,
                    wineCost: true,
                    hasBalcony: true,
                    hasParking: true,
                    maxGuests: true,
                },
            });
            if (!parent) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Apartament nadrzędny nie istnieje" });
            }

            const name = `${parent.name} ${input.code}`.trim();
            const slug = slugify(name);

            // Upewnij się, że nie istnieje już taki pokój
            type RoomClient = { findFirst: (args: unknown) => Promise<{ id: number } | null>; create: (args: unknown) => Promise<{ id: number }> };
            const roomClient = (ctx.db as unknown as { room: RoomClient }).room;
            const existing = await roomClient.findFirst({
                where: { apartmentId: parentIdNum, code: input.code },
                select: { id: true },
            });
            if (existing) {
                return { success: true, roomId: existing.id.toString() };
            }

            const variant = await roomClient.create({
                data: {
                    apartmentId: parentIdNum,
                    code: input.code,
                    name,
                    slug,
                    address: parent.address,
                    defaultRentAmount: parent.defaultRentAmount,
                    defaultUtilitiesAmount: parent.defaultUtilitiesAmount,
                    weeklyLaundryCost: parent.weeklyLaundryCost ?? 120,
                    cleaningSuppliesCost: parent.cleaningSuppliesCost ?? 132,
                    capsuleCostPerGuest: parent.capsuleCostPerGuest ?? 2.5,
                    wineCost: parent.wineCost ?? 250,
                    hasBalcony: parent.hasBalcony,
                    hasParking: parent.hasParking,
                    maxGuests: parent.maxGuests ?? 4,
                },
            });

            return { success: true, roomId: variant.id.toString() };
        }),

    getForOwner: publicProcedure
        .input(z.object({ ownerEmail: z.string().email() }))
        .query(async ({ ctx, input }) => {
            const { ownerEmail } = input;

            if (!ownerEmail) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Musisz być zalogowany, aby zobaczyć swoje apartamenty.",
                });
            }

            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: ownerEmail },
                select: {
                    ownedApartments: {
                        include: {
                            apartment: {
                                select: {
                                    id: true,
                                    name: true,
                                    address: true,
                                    averageRating: true,
                                    images: {
                                        where: { isPrimary: true },
                                        take: 1,
                                    },
                                    _count: {
                                        select: { rooms: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Nie znaleziono właściciela.",
                });
            }

            type OwnerWithApartments = {
                ownedApartments: Array<{
                    apartment: {
                        id: number;
                        name: string;
                        address: string;
                        averageRating: number | null;
                        images: Array<{ id: string; url: string; alt: string | null; isPrimary: boolean; order: number }>;
                        _count: { rooms: number };
                    };
                }>;
            };
            const typedOwner = owner as unknown as OwnerWithApartments;
            return typedOwner.ownedApartments.map(({ apartment }) => {
                const { _count, ...rest } = apartment;
                return { ...rest, roomsCount: _count.rooms };
            });
        }),

    getDetails: publicProcedure
        .input(z.object({
            slug: z.string().min(1, "Apartment slug is required")
        }))
        .output(z.object({
            success: z.boolean(),
            name: z.string().optional(),
            error: z.string().optional(),
        }))
        .query(async ({ input, ctx }) => {
            console.log(`[tRPC apartments.getDetails] Requested details for slug: ${input.slug}`);

            try {
                const apartment = await ctx.db.apartment.findUnique({
                    where: {
                        slug: input.slug,
                    },
                    select: {
                        name: true,
                    },
                });

                if (!apartment) {
                    console.log(`[tRPC apartments.getDetails] Apartment not found for slug: ${input.slug}`);
                    return {
                        success: false,
                        error: "Apartment not found"
                    };
                }

                console.log(`[tRPC apartments.getDetails] Found apartment: ${apartment.name} for slug: ${input.slug}`);
                return {
                    success: true,
                    name: apartment.name,
                };

            } catch (error) {
                console.error(`[tRPC apartments.getDetails] Error fetching apartment details for slug ${input.slug}:`, error);
                throw new Error("Server error fetching apartment details");
            }
        }),

    create: protectedProcedure
        .input(
            z.object({
                name: z.string().min(1),
                address: z.string().min(1),
                defaultRentAmount: z.number().optional(),
                defaultUtilitiesAmount: z.number().optional(),
                weeklyLaundryCost: z.number().optional(),
                cleaningSuppliesCost: z.number().optional(),
                capsuleCostPerGuest: z.number().optional(),
                wineCost: z.number().optional(),
                hasBalcony: z.boolean().optional(),
                hasParking: z.boolean().optional(),
                maxGuests: z.number().optional(),
                cleaningCosts: z.record(z.number()).optional(), // Koszty sprzątania dla różnych liczby gości
                ownerId: z.string().optional(), // Nowy parametr - ID właściciela
            })
        )
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą tworzyć apartamenty",
                });
            }

            // Generuj slug na podstawie nazwy
            const slug = slugify(input.name);
            // Sprawdź unikalność nazwy i sluga
            const existing = await ctx.db.apartment.findFirst({
                where: {
                    OR: [
                        { name: input.name },
                        { slug: slug },
                    ],
                },
            });
            if (existing) {
                throw new Error("Apartament o tej nazwie lub slugu już istnieje");
            }

            // Sprawdź czy właściciel istnieje (jeśli podano ownerId)
            if (input.ownerId) {
                const owner = await ctx.db.apartmentOwner.findUnique({
                    where: { id: input.ownerId },
                });
                if (!owner) {
                    throw new Error("Właściciel nie został znaleziony");
                }
            }

            // Utwórz apartament
            const apartment = await ctx.db.apartment.create({
                data: {
                    name: input.name,
                    slug,
                    address: input.address,
                    defaultRentAmount: input.defaultRentAmount ?? 0,
                    defaultUtilitiesAmount: input.defaultUtilitiesAmount ?? 0,
                    weeklyLaundryCost: input.weeklyLaundryCost ?? 120,
                    cleaningSuppliesCost: input.cleaningSuppliesCost ?? 132,
                    capsuleCostPerGuest: input.capsuleCostPerGuest ?? 2.5,
                    wineCost: input.wineCost ?? 250,
                    hasBalcony: input.hasBalcony ?? false,
                    hasParking: input.hasParking ?? false,
                    maxGuests: input.maxGuests ?? 4,
                    cleaningCosts: input.cleaningCosts,
                },
            });

            // Jeśli podano ID właściciela, utwórz powiązanie
            if (input.ownerId) {
                await ctx.db.apartmentOwnership.create({
                    data: {
                        ownerId: input.ownerId,
                        apartmentId: apartment.id,
                        assignedByAdminId: ctx.session.user.id,
                    },
                });
            }

            return {
                success: true,
                apartment: {
                    id: apartment.id.toString(),
                    name: apartment.name,
                    slug: apartment.slug,
                },
            };
        }),

    update: publicProcedure
        .input(
            z.object({
                id: z.string().min(1),
                name: z.string().min(1).optional(),
                address: z.string().min(1).optional(),
                defaultRentAmount: z.number().optional(),
                defaultUtilitiesAmount: z.number().optional(),
                weeklyLaundryCost: z.number().optional(),
                hasBalcony: z.boolean().optional(),
                hasParking: z.boolean().optional(),
                maxGuests: z.number().optional(),
                cleaningCosts: z.record(z.number()).optional(), // Koszty sprzątania dla różnych liczby gości
                paymentType: z.enum(["COMMISSION", "FIXED_AMOUNT", "FIXED_AMOUNT_MINUS_UTILITIES"]).optional(),
                fixedPaymentAmount: z.number().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { id, ...updateData } = input;

            const data: {
                name?: string;
                address?: string;
                defaultRentAmount?: number;
                defaultUtilitiesAmount?: number;
                weeklyLaundryCost?: number;
                hasBalcony?: boolean;
                hasParking?: boolean;
                maxGuests?: number;
                cleaningCosts?: Record<string, number>;
                paymentType?: "COMMISSION" | "FIXED_AMOUNT" | "FIXED_AMOUNT_MINUS_UTILITIES";
                fixedPaymentAmount?: number;
                slug?: string;
            } = { ...updateData };

            // Jeśli zmieniamy nazwę, sprawdź unikalność i wygeneruj nowy slug
            if (updateData.name) {
                const newSlug = slugify(updateData.name);
                const existing = await ctx.db.apartment.findFirst({
                    where: {
                        OR: [
                            { name: updateData.name },
                            { slug: newSlug },
                        ],
                        NOT: {
                            id: parseInt(id),
                        },
                    },
                });
                if (existing) {
                    throw new Error("Apartament o tej nazwie lub slugu już istnieje");
                }
                data.slug = newSlug;
            }

            const updatedApartment = await ctx.db.apartment.update({
                where: {
                    id: parseInt(id),
                },
                data,
            });

            // Jeśli zmieniono ustawienia rozliczenia, zaktualizuj wszystkie nierozliczone raporty
            if (updateData.paymentType || updateData.fixedPaymentAmount !== undefined) {
                console.log(`🔄 Aktualizuję raporty po zmianie ustawień apartamentu ${updatedApartment.id}`);

                // Znajdź wszystkie nierozliczone raporty dla tego apartamentu
                const pendingReports = await ctx.db.monthlyReport.findMany({
                    where: {
                        apartmentId: updatedApartment.id,
                        status: {
                            not: "SENT"
                        }
                    },
                    select: {
                        id: true
                    }
                });

                console.log(`📊 Znaleziono ${pendingReports.length} nierozliczonych raportów do aktualizacji`);

                // Zaktualizuj każdy raport
                for (const report of pendingReports) {
                    try {
                        // Automatycznie ustaw typ rozliczenia na podstawie ustawień apartamentu
                        let newSettlementType: "COMMISSION" | "FIXED" | "FIXED_MINUS_UTILITIES";

                        if (updateData.paymentType === "COMMISSION") {
                            newSettlementType = "COMMISSION";
                        } else if (updateData.paymentType === "FIXED_AMOUNT") {
                            newSettlementType = "FIXED";
                        } else if (updateData.paymentType === "FIXED_AMOUNT_MINUS_UTILITIES") {
                            newSettlementType = "FIXED_MINUS_UTILITIES";
                        } else {
                            // Jeśli nie zmieniono paymentType, zachowaj obecny typ
                            continue;
                        }

                        // Aktualizuj typ rozliczenia w raporcie
                        await ctx.db.monthlyReport.update({
                            where: { id: report.id },
                            data: { finalSettlementType: newSettlementType }
                        });

                        // Przelicz raport
                        await recalculateReportSettlement(report.id, { db: ctx.db });

                        console.log(`✅ Zaktualizowano raport ${report.id} - nowy typ: ${newSettlementType}`);
                    } catch (error) {
                        console.error(`❌ Błąd podczas aktualizacji raportu ${report.id}:`, error);
                    }
                }
            }

            return {
                success: true,
                apartment: {
                    id: updatedApartment.id.toString(),
                    name: updatedApartment.name,
                    slug: updatedApartment.slug,
                },
            };
        }),
    mapFromReservations: protectedProcedure
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą wykonać tę operację",
                });
            }

            console.log("▶️ Rozpoczęto mapowanie rezerwacji na apartamenty...");

            const allReservations = await ctx.db.reservation.findMany();
            const allApartments = await ctx.db.apartment.findMany();

            console.log(`🔍 Znaleziono ${allReservations.length} rezerwacji i ${allApartments.length} istniejących apartamentów.`);

            const apartmentMap = new Map(allApartments.map(apt => [apt.name, apt]));

            console.log("🗺️ Stworzono mapę istniejących apartamentów.");

            let createdApartmentsCount = 0;
            let updatedReservationsCount = 0;

            for (const reservation of allReservations) {
                if (!reservation.apartmentName) {
                    console.log(`⏭️ Pomijam rezerwację o ID: ${reservation.id}, ponieważ nie ma nazwy apartamentu.`);
                    continue;
                }

                console.log(`🔄 Przetwarzam rezerwację ID: ${reservation.id} dla apartamentu: "${reservation.apartmentName}"`);

                let apartment = apartmentMap.get(reservation.apartmentName);

                if (!apartment) {
                    console.log(`🆕 Apartament "${reservation.apartmentName}" nie istnieje. Próba utworzenia...`);
                    const slug = slugify(reservation.apartmentName);
                    try {
                        const newApartmentData = {
                            name: reservation.apartmentName,
                            slug: slug,
                            address: reservation.address ?? 'Brak adresu',
                        };
                        console.log(`➕ Tworzenie apartamentu z danymi:`, newApartmentData);

                        apartment = await ctx.db.apartment.create({
                            data: newApartmentData,
                        });

                        apartmentMap.set(apartment.name, apartment);
                        createdApartmentsCount++;
                        console.log(`✅ Utworzono i zmapowano nowy apartament: ID ${apartment.id}, Nazwa: ${apartment.name}`);
                    } catch (error) {
                        console.error(`❌ Błąd podczas tworzenia apartamentu "${reservation.apartmentName}".`, error);
                        const existing = await ctx.db.apartment.findFirst({ where: { name: reservation.apartmentName } });
                        if (existing) {
                            apartment = existing;
                            apartmentMap.set(existing.name, existing);
                            console.log(`🔄 Apartament "${reservation.apartmentName}" już istniał (błąd wyścigu?). Używam istniejącego ID: ${apartment.id}.`);
                        } else {
                            console.error(`🚨 Krytyczny błąd: Nie można utworzyć ani znaleźć apartamentu: "${reservation.apartmentName}". Pomijam rezerwację.`);
                            continue;
                        }
                    }
                } else {
                    console.log(`👍 Apartament "${reservation.apartmentName}" już istnieje. Adres nie zostanie zaktualizowany.`);
                }

                if (apartment && reservation.apartmentId !== apartment.id) {
                    const oldApartmentId = reservation.apartmentId;
                    console.log(`✍️ Aktualizuję rezerwację ID: ${reservation.id}. Zmiana apartmentId z ${oldApartmentId ?? 'null'} na ${apartment.id}`);
                    await ctx.db.reservation.update({
                        where: { id: reservation.id },
                        data: { apartmentId: apartment.id },
                    });
                    updatedReservationsCount++;
                    console.log(`✔️ Rezerwacja ID: ${reservation.id} zaktualizowana.`);
                } else if (apartment) {
                    console.log(`👌 Rezerwacja ID: ${reservation.id} jest już poprawnie połączona z apartamentem ID: ${apartment.id}.`);
                }
            }

            console.log(`🏁 Zakończono mapowanie. Utworzono ${createdApartmentsCount} nowych apartamentów, zaktualizowano ${updatedReservationsCount} rezerwacji.`);

            return {
                success: true,
                message: `Operacja zakończona. Utworzono ${createdApartmentsCount} nowych apartamentów i zaktualizowano ${updatedReservationsCount} rezerwacji.`,
                createdApartments: createdApartmentsCount,
                updatedReservations: updatedReservationsCount,
            };
        }),

    delete: protectedProcedure
        .input(
            z.object({
                id: z.string().min(1),
            })
        )
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą usuwać apartamenty",
                });
            }

            // Sprawdź czy apartament istnieje
            const apartment = await ctx.db.apartment.findUnique({
                where: { id: parseInt(input.id) },
            });

            if (!apartment) {
                throw new Error("Apartament nie został znaleziony");
            }

            // Usuń apartament
            await ctx.db.apartment.delete({
                where: { id: parseInt(input.id) },
            });

            return {
                success: true,
                message: `Apartament "${apartment.name}" został usunięty`,
            };
        }),

    getById: publicProcedure
        .input(z.object({
            id: z.string().min(1),
        }))
        .output(z.object({
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            address: z.string(),
            defaultRentAmount: z.number().nullable(),
            defaultUtilitiesAmount: z.number().nullable(),
            weeklyLaundryCost: z.number().nullable(),
            cleaningSuppliesCost: z.number().nullable(),
            capsuleCostPerGuest: z.number().nullable(),
            wineCost: z.number().nullable(),
            hasBalcony: z.boolean(),
            hasParking: z.boolean(),
            maxGuests: z.number().nullable(),
            cleaningCosts: z.record(z.number()).nullable(),
            averageRating: z.number().nullable(),
            paymentType: z.enum(["COMMISSION", "FIXED_AMOUNT", "FIXED_AMOUNT_MINUS_UTILITIES"]),
            fixedPaymentAmount: z.number().nullable(),
            images: z.array(z.object({
                id: z.string(),
                url: z.string(),
                alt: z.string().nullable(),
                isPrimary: z.boolean(),
                order: z.number(),
            })),
        }))
        .query(async ({ input, ctx }) => {
            try {
                const apartment = await ctx.db.apartment.findUnique({
                    where: { id: parseInt(input.id) },
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        address: true,
                        defaultRentAmount: true,
                        defaultUtilitiesAmount: true,
                        weeklyLaundryCost: true,
                        cleaningSuppliesCost: true,
                        capsuleCostPerGuest: true,
                        wineCost: true,
                        hasBalcony: true,
                        hasParking: true,
                        maxGuests: true,
                        cleaningCosts: true,
                        averageRating: true,
                        paymentType: true,
                        fixedPaymentAmount: true,
                        images: {
                            select: {
                                id: true,
                                url: true,
                                alt: true,
                                isPrimary: true,
                                order: true,
                            },
                            orderBy: {
                                order: 'asc',
                            },
                        },
                    },
                });

                if (!apartment) {
                    throw new Error("Apartament nie został znaleziony");
                }

                return {
                    ...apartment,
                    id: apartment.id.toString(),
                    cleaningCosts: apartment.cleaningCosts as Record<string, number> | null,
                    paymentType: apartment.paymentType,
                    fixedPaymentAmount: apartment.fixedPaymentAmount ? Number(apartment.fixedPaymentAmount) : null,
                    images: apartment.images.map(img => ({
                        ...img,
                        id: img.id.toString(),
                    })),
                };
            } catch (error) {
                console.error("❌ Error fetching apartment:", error);
                throw new Error("Błąd podczas pobierania apartamentu");
            }
        }),

    // Dodaj zdjęcie do apartamentu
    addImage: publicProcedure
        .input(z.object({
            apartmentId: z.string().min(1),
            url: z.string().min(1),
            alt: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Sprawdź czy apartament istnieje
                const apartment = await ctx.db.apartment.findUnique({
                    where: { id: parseInt(input.apartmentId) },
                    include: {
                        images: {
                            orderBy: {
                                order: 'desc',
                            },
                            take: 1,
                        },
                    },
                });

                if (!apartment) {
                    throw new Error("Apartament nie został znaleziony");
                }

                // Określ kolejność (ostatnia + 1)
                const nextOrder = apartment.images.length > 0
                    ? (apartment.images[0]?.order ?? 0) + 1
                    : 1;

                // Sprawdź czy to pierwsze zdjęcie (będzie główne)
                const isPrimary = apartment.images.length === 0;

                // Dodaj zdjęcie
                const image = await ctx.db.apartmentImage.create({
                    data: {
                        apartmentId: parseInt(input.apartmentId),
                        url: input.url,
                        alt: input.alt ?? null,
                        isPrimary,
                        order: nextOrder,
                    },
                });

                return {
                    success: true,
                    image: {
                        id: image.id.toString(),
                        url: image.url,
                        alt: image.alt,
                        isPrimary: image.isPrimary,
                        order: image.order,
                    },
                };
            } catch (error) {
                console.error("❌ Error adding image:", error);
                throw new Error("Błąd podczas dodawania zdjęcia");
            }
        }),

    // Usuń zdjęcie
    deleteImage: publicProcedure
        .input(z.object({
            imageId: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Sprawdź czy zdjęcie istnieje
                const image = await ctx.db.apartmentImage.findUnique({
                    where: { id: input.imageId },
                });

                if (!image) {
                    throw new Error("Zdjęcie nie zostało znalezione");
                }

                // Usuń zdjęcie
                await ctx.db.apartmentImage.delete({
                    where: { id: input.imageId },
                });

                // Jeśli to było zdjęcie główne, ustaw pierwsze pozostałe jako główne
                if (image.isPrimary) {
                    const nextPrimary = await ctx.db.apartmentImage.findFirst({
                        where: { apartmentId: image.apartmentId },
                        orderBy: { order: 'asc' },
                    });

                    if (nextPrimary) {
                        await ctx.db.apartmentImage.update({
                            where: { id: nextPrimary.id },
                            data: { isPrimary: true },
                        });
                    }
                }

                return {
                    success: true,
                    message: "Zdjęcie zostało usunięte",
                };
            } catch (error) {
                console.error("❌ Error deleting image:", error);
                throw new Error("Błąd podczas usuwania zdjęcia");
            }
        }),

    // Ustaw zdjęcie jako główne
    setPrimaryImage: publicProcedure
        .input(z.object({
            imageId: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Sprawdź czy zdjęcie istnieje
                const image = await ctx.db.apartmentImage.findUnique({
                    where: { id: input.imageId },
                });

                if (!image) {
                    throw new Error("Zdjęcie nie zostało znalezione");
                }

                // Usuń główne zdjęcie z wszystkich zdjęć tego apartamentu
                await ctx.db.apartmentImage.updateMany({
                    where: { apartmentId: image.apartmentId },
                    data: { isPrimary: false },
                });

                // Ustaw nowe zdjęcie jako główne
                await ctx.db.apartmentImage.update({
                    where: { id: input.imageId },
                    data: { isPrimary: true },
                });

                return {
                    success: true,
                    message: "Zdjęcie zostało ustawione jako główne",
                };
            } catch (error) {
                console.error("❌ Error setting primary image:", error);
                throw new Error("Błąd podczas ustawiania zdjęcia głównego");
            }
        }),

    // Zmień kolejność zdjęć
    reorderImages: publicProcedure
        .input(z.object({
            apartmentId: z.string().min(1),
            imageOrders: z.array(z.object({
                id: z.string(),
                order: z.number(),
            })),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Sprawdź czy apartament istnieje
                const apartment = await ctx.db.apartment.findUnique({
                    where: { id: parseInt(input.apartmentId) },
                });

                if (!apartment) {
                    throw new Error("Apartament nie został znaleziony");
                }

                // Zaktualizuj kolejność wszystkich zdjęć
                for (const imageOrder of input.imageOrders) {
                    await ctx.db.apartmentImage.update({
                        where: { id: imageOrder.id },
                        data: { order: imageOrder.order },
                    });
                }

                return {
                    success: true,
                    message: "Kolejność zdjęć została zaktualizowana",
                };
            } catch (error) {
                console.error("❌ Error reordering images:", error);
                throw new Error("Błąd podczas zmiany kolejności zdjęć");
            }
        }),

    // Dodaj wiele zdjęć jednocześnie
    addMultipleImages: publicProcedure
        .input(z.object({
            apartmentId: z.string().min(1),
            images: z.array(z.object({
                url: z.string().url(),
                alt: z.string().optional(),
            })),
        }))
        .mutation(async ({ input, ctx }) => {
            try {
                // Sprawdź czy apartament istnieje
                const apartment = await ctx.db.apartment.findUnique({
                    where: { id: parseInt(input.apartmentId) },
                    include: {
                        images: {
                            orderBy: {
                                order: 'desc',
                            },
                            take: 1,
                        },
                    },
                });

                if (!apartment) {
                    throw new Error("Apartament nie został znaleziony");
                }

                // Określ kolejność (ostatnia + 1)
                const nextOrder = apartment.images.length > 0
                    ? (apartment.images[0]?.order ?? 0) + 1
                    : 1;

                // Sprawdź czy to pierwsze zdjęcie (będzie główne)
                const isPrimary = apartment.images.length === 0;

                // Dodaj wszystkie zdjęcia
                const createdImages = [];
                for (let i = 0; i < input.images.length; i++) {
                    const imageData = input.images[i];
                    if (!imageData) continue;

                    const image = await ctx.db.apartmentImage.create({
                        data: {
                            apartmentId: parseInt(input.apartmentId),
                            url: imageData.url,
                            alt: imageData.alt ?? null,
                            isPrimary: isPrimary && i === 0, // Tylko pierwsze zdjęcie będzie główne
                            order: nextOrder + i,
                        },
                    });

                    createdImages.push({
                        id: image.id.toString(),
                        url: image.url,
                        alt: image.alt,
                        isPrimary: image.isPrimary,
                        order: image.order,
                    });
                }

                return {
                    success: true,
                    images: createdImages,
                };
            } catch (error) {
                console.error("❌ Error adding multiple images:", error);
                throw new Error("Błąd podczas dodawania zdjęć");
            }
        }),

    recalculateRating: protectedProcedure
        .input(z.object({ apartmentId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą przeliczyć ocenę.",
                });
            }

            const { apartmentId } = input;
            const randomRating = Math.random() * (9.56 - 9.10) + 9.10;
            const roundedRating = Math.round(randomRating * 100) / 100;

            const updatedApartment = await ctx.db.apartment.update({
                where: {
                    id: parseInt(apartmentId),
                },
                data: {
                    averageRating: roundedRating,
                },
            });

            return {
                success: true,
                apartment: updatedApartment,
            };
        }),
}); 