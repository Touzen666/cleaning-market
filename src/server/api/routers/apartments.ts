import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "@/server/api/trpc";
import { slugify } from "@/lib/types";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";

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
                defaultRentAmount: z.number().nullable(),
                defaultUtilitiesAmount: z.number().nullable(),
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

                return {
                    success: true,
                    apartments: apartments.map(apt => ({
                        ...apt,
                        id: apt.id.toString(),
                        reservations: apt._count.reservations, // Przekazujemy liczbę rezerwacji
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
            } catch (error) {
                console.error("❌ Error fetching apartments:", error);
                throw new Error("Błąd podczas pobierania apartamentów");
            }
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
                hasBalcony: z.boolean().optional(),
                hasParking: z.boolean().optional(),
                maxGuests: z.number().optional(),
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
                    hasBalcony: input.hasBalcony ?? false,
                    hasParking: input.hasParking ?? false,
                    maxGuests: input.maxGuests ?? 4,
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
                hasBalcony: z.boolean().optional(),
                hasParking: z.boolean().optional(),
                maxGuests: z.number().optional(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const { id, ...updateData } = input;

            const data: {
                name?: string;
                address?: string;
                defaultRentAmount?: number;
                defaultUtilitiesAmount?: number;
                hasBalcony?: boolean;
                hasParking?: boolean;
                maxGuests?: number;
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
                    },
                });

                if (!apartment) {
                    throw new Error("Apartament nie został znaleziony");
                }

                return {
                    ...apartment,
                    id: apartment.id.toString(),
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
}); 