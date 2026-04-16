import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType, VATOption } from '@prisma/client';
import { _sendWelcomeEmail } from "./email";
import { randomBytes } from "crypto";


const apartmentOwnerSchema = z.object({
    id: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    phone: z.string().nullable(),
    isActive: z.boolean(),
    isFirstLogin: z.boolean(),
    temporaryPassword: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    profileImageUrl: z.string().nullable(),
    createdByAdmin: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
    }).nullable(),
    ownedApartments: z.array(z.object({
        apartment: z.object({
            id: z.string(), // Corrected from z.number()
            name: z.string(),
            slug: z.string(),
        }),
    })),
});

export const apartmentOwnersRouter = createTRPCRouter({
    // Get all apartment owners (admin only)
    getAll: protectedProcedure
        .output(z.array(apartmentOwnerSchema))
        .query(async ({ ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view apartment owners",
                });
            }

            try {
                const owners = await ctx.db.apartmentOwner.findMany({
                    include: {
                        createdByAdmin: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        ownedApartments: {
                            where: { apartment: { archived: false } },
                            include: {
                                apartment: {
                                    select: {
                                        id: true,
                                        name: true,
                                        slug: true,
                                    },
                                },
                            },
                        },
                        profileImages: {
                            where: { isActive: true },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            select: {
                                id: true,
                                url: true,
                                alt: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                });

                // Map the result to match the schema (convert apartment ID to string)
                return owners.map(owner => ({
                    ...owner,
                    profileImageUrl: owner.profileImages[0]?.url ?? null,
                    ownedApartments: owner.ownedApartments.map(ownership => ({
                        ...ownership,
                        apartment: {
                            ...ownership.apartment,
                            id: ownership.apartment.id.toString(),
                        },
                    })),
                }));

            } catch (error) {
                console.error("❌ Error fetching apartment owners:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to fetch apartment owners",
                });
            }
        }),

    // Create new apartment owner (admin only)
    create: protectedProcedure
        .input(z.object({
            email: z.string().email(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            phone: z.string().optional(),
            apartmentIds: z.array(z.number()).optional(),
            vatOption: z.enum([VATOption.NO_VAT, VATOption.VAT_8, VATOption.VAT_23]).default(VATOption.NO_VAT),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can create apartment owners",
                });
            }

            // Check if email already exists
            const existingOwner = await ctx.db.apartmentOwner.findUnique({
                where: { email: input.email },
            });

            if (existingOwner) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Właściciel z tym adresem email już istnieje",
                });
            }

            // Generate temporary password
            const temporaryPassword = generateTemporaryPassword();
            const temporaryPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Create apartment owner
            const newOwner = await ctx.db.apartmentOwner.create({
                data: {
                    email: input.email,
                    firstName: input.firstName,
                    lastName: input.lastName,
                    phone: input.phone,
                    temporaryPassword,
                    temporaryPasswordExpiresAt,
                    vatOption: input.vatOption,
                    createdByAdminId: ctx.session.user.id,
                },
            });

            // Assign apartments if provided
            if (input.apartmentIds && input.apartmentIds.length > 0) {
                await ctx.db.apartmentOwnership.createMany({
                    data: input.apartmentIds.map(apartmentId => ({
                        ownerId: newOwner.id,
                        apartmentId,
                        assignedByAdminId: ctx.session.user.id,
                    })),
                });
            }

            console.log(`🏢 Nowy właściciel apartamentu utworzony: ${newOwner.email}`);

            // Send welcome email automatically
            try {
                await _sendWelcomeEmail({ ownerId: newOwner.id, db: ctx.db });
                console.log(`✅ Welcome email sent to ${newOwner.email}`);
            } catch (error) {
                console.error(`❌ Failed to send welcome email to ${newOwner.email}:`, error);
                // Zwracamy błąd do frontendu, ale owner i tak jest stworzony
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Właściciel został utworzony, ale nie udało się wysłać e-maila powitalnego. Błąd: ${error instanceof Error ? error.message : String(error)}`,
                    cause: error,
                });
            }

            return {
                owner: newOwner,
                temporaryPassword,
            };
        }),

    // Update apartment owner status
    updateStatus: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
            isActive: z.boolean(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can update apartment owners",
                });
            }

            return await ctx.db.apartmentOwner.update({
                where: { id: input.ownerId },
                data: { isActive: input.isActive },
            });
        }),

    // Update apartment owner
    update: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.string().email(),
            phone: z.string().optional(),
            companyName: z.string().optional(),
            nip: z.string().optional(),
            address: z.string().optional(),
            city: z.string().optional(),
            postalCode: z.string().optional(),
            profileImageUrl: z.string().nullable().optional(),
            isActive: z.boolean(),
            vatOption: z.enum([VATOption.NO_VAT, VATOption.VAT_8, VATOption.VAT_23]),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can update apartment owners",
                });
            }

            const { ownerId, ...updateData } = input;

            // Check if email already exists for another owner
            const existingOwner = await ctx.db.apartmentOwner.findFirst({
                where: {
                    email: input.email,
                    NOT: { id: ownerId },
                },
            });

            if (existingOwner) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Właściciel z tym adresem email już istnieje",
                });
            }

            return await ctx.db.apartmentOwner.update({
                where: { id: ownerId },
                data: updateData,
            });
        }),

    // Assign apartments to owner
    assignApartments: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
            apartmentIds: z.array(z.number()),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can assign apartments",
                });
            }

            // Remove existing assignments
            await ctx.db.apartmentOwnership.deleteMany({
                where: { ownerId: input.ownerId },
            });

            // Create new assignments
            if (input.apartmentIds.length > 0) {
                await ctx.db.apartmentOwnership.createMany({
                    data: input.apartmentIds.map(apartmentId => ({
                        ownerId: input.ownerId,
                        apartmentId,
                        assignedByAdminId: ctx.session.user.id,
                    })),
                });
            }

            return { success: true };
        }),

    // Remove apartment from owner
    removeApartmentFromOwner: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
            apartmentId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can remove apartments from owners",
                });
            }

            const { ownerId, apartmentId } = input;

            await ctx.db.apartmentOwnership.delete({
                where: {
                    ownerId_apartmentId: {
                        ownerId,
                        apartmentId,
                    },
                },
            });

            return { success: true };
        }),

    // Reset temporary password
    resetPassword: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can reset passwords",
                });
            }

            const temporaryPassword = generateTemporaryPassword();
            const temporaryPasswordExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            await ctx.db.apartmentOwner.update({
                where: { id: input.ownerId },
                data: {
                    temporaryPassword,
                    temporaryPasswordExpiresAt,
                    isFirstLogin: true,
                    passwordHash: null, // Reset permanent password
                },
            });

            console.log(`🔑 Reset hasła dla właściciela: ${input.ownerId}`);

            return {
                temporaryPassword,
            };
        }),

    // Get owner details
    getById: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .query(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view owner details",
                });
            }

            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
                include: {
                    createdByAdmin: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    ownedApartments: {
                        where: { apartment: { archived: false } },
                        include: {
                            apartment: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    address: true,
                                },
                            },
                            assignedByAdmin: {
                                select: {
                                    name: true,
                                    email: true,
                                },
                            },
                        },
                    },
                    profileImages: {
                        where: { isActive: true },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                        select: {
                            id: true,
                            url: true,
                            alt: true,
                        },
                    },
                },
            });

            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            // Extract the active profile image URL
            const profileImageUrl = owner.profileImages[0]?.url ?? null;

            return {
                ...owner,
                profileImageUrl,
                ownedApartments: owner.ownedApartments.map(ownership => ({
                    ...ownership,
                    apartment: {
                        ...ownership.apartment,
                        id: ownership.apartment.id.toString(),
                    },
                })),
            };
        }),

    // Delete apartment owner only (admin only)
    deleteOwnerOnly: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete apartment owners",
                });
            }

            // Check if owner has apartments
            const ownerWithApartments = await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
                include: {
                    ownedApartments: {
                        include: {
                            apartment: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!ownerWithApartments) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            if (ownerWithApartments.ownedApartments.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Nie można usunąć właściciela, który ma przypisane apartamenty. Użyj opcji 'Usuń właściciela i apartamenty' lub najpierw odłącz apartamenty.",
                });
            }

            // Delete apartment ownership assignments first (due to foreign key constraint)
            await ctx.db.apartmentOwnership.deleteMany({
                where: { ownerId: input.ownerId },
            });

            // Delete owner notes
            await ctx.db.ownerNote.deleteMany({
                where: { ownerId: input.ownerId },
            });

            // Delete monthly reports
            await ctx.db.monthlyReport.deleteMany({
                where: { ownerId: input.ownerId },
            });

            // Delete the apartment owner
            await ctx.db.apartmentOwner.delete({
                where: { id: input.ownerId },
            });

            console.log(`🗑️ Owner deleted: ${ownerWithApartments.email}`);

            return { success: true };
        }),

    // Delete apartment owner with all apartments and reservations (admin only)
    deleteOwnerWithApartments: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete apartment owners",
                });
            }

            // Get owner with apartments
            const ownerWithApartments = await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
                include: {
                    ownedApartments: {
                        include: {
                            apartment: {
                                select: {
                                    id: true,
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!ownerWithApartments) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            const apartmentIds = ownerWithApartments.ownedApartments.map(
                (ownership) => ownership.apartment.id,
            );

            // Start transaction to ensure data consistency
            await ctx.db.$transaction(async (tx) => {
                // Delete all reservations for these apartments
                await tx.reservation.deleteMany({
                    where: {
                        apartmentId: {
                            in: apartmentIds,
                        },
                    },
                });

                // Delete all check-in cards for reservations of these apartments
                await tx.checkInCard.deleteMany({
                    where: {
                        reservation: {
                            apartmentId: {
                                in: apartmentIds,
                            },
                        },
                    },
                });

                // Delete all lead applications for these apartments
                await tx.leadApplication.deleteMany({
                    where: {
                        apartmentId: {
                            in: apartmentIds,
                        },
                    },
                });

                // Delete all apartment images
                await tx.apartmentImage.deleteMany({
                    where: {
                        apartmentId: {
                            in: apartmentIds,
                        },
                    },
                });

                // Delete all monthly reports for this owner
                await tx.monthlyReport.deleteMany({
                    where: { ownerId: input.ownerId },
                });

                // Delete all owner notes
                await tx.ownerNote.deleteMany({
                    where: { ownerId: input.ownerId },
                });

                // Delete apartment ownership assignments
                await tx.apartmentOwnership.deleteMany({
                    where: { ownerId: input.ownerId },
                });

                // Delete the apartments
                await tx.apartment.deleteMany({
                    where: {
                        id: {
                            in: apartmentIds,
                        },
                    },
                });

                // Delete the apartment owner
                await tx.apartmentOwner.delete({
                    where: { id: input.ownerId },
                });
            });

            console.log(`🗑️ Owner and apartments deleted: ${ownerWithApartments.email} with ${apartmentIds.length} apartments`);

            return {
                success: true,
                deletedApartments: apartmentIds.length,
            };
        }),

    // Delete apartment owner (admin only) - legacy method
    delete: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can delete apartment owners",
                });
            }

            // Delete apartment ownership assignments first (due to foreign key constraint)
            await ctx.db.apartmentOwnership.deleteMany({
                where: { ownerId: input.ownerId },
            });

            // Delete the apartment owner
            await ctx.db.apartmentOwner.delete({
                where: { id: input.ownerId },
            });

            return { success: true };
        }),

    // Get apartments for a specific owner
    getOwnerApartments: protectedProcedure
        .input(z.object({ ownerId: z.string() }))
        .output(z.array(z.object({ // Adding output validator
            id: z.string(),
            name: z.string(),
            slug: z.string(),
            address: z.string(),
            archived: z.boolean(),
            reservations: z.number(),
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
        })))
        .query(async ({ input, ctx }) => {
            const ownerships = await ctx.db.apartmentOwnership.findMany({
                where: { ownerId: input.ownerId },
                include: {
                    apartment: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                            address: true,
                            archived: true,
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
                                orderBy: { order: 'asc' },
                            },
                            _count: {
                                select: { reservations: true },
                            },
                        },
                    },
                },
            });

            return ownerships.map(own => {
                const { _count, ...apartmentData } = own.apartment;
                return {
                    ...apartmentData,
                    id: apartmentData.id.toString(),
                    reservations: _count.reservations,
                };
            });
        }),

    impersonate: protectedProcedure
        .input(z.object({ ownerId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administrator może używać tej funkcji.",
                });
            }

            const ownerToImpersonate = await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
                include: {
                    ownedApartments: {
                        where: { apartment: { archived: false } },
                        include: {
                            apartment: {
                                select: {
                                    id: true,
                                    name: true,
                                    slug: true,
                                    address: true,
                                    images: {
                                        select: {
                                            id: true,
                                            url: true,
                                            alt: true,
                                            isPrimary: true,
                                            order: true,
                                        },
                                        orderBy: {
                                            order: "asc",
                                        },
                                    },
                                    _count: {
                                        select: { reservations: true },
                                    },
                                },
                            },
                        },
                    },
                },
            });

            if (!ownerToImpersonate) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony.",
                });
            }

            const sessionToken = randomBytes(32).toString("hex");

            return {
                sessionToken,
                owner: {
                    id: ownerToImpersonate.id,
                    email: ownerToImpersonate.email,
                    firstName: ownerToImpersonate.firstName,
                    lastName: ownerToImpersonate.lastName,
                    isFirstLogin: ownerToImpersonate.isFirstLogin,
                    apartments: ownerToImpersonate.ownedApartments.map((ownership) => {
                        const { _count, ...apartmentData } = ownership.apartment;
                        return {
                            ...apartmentData,
                            id: apartmentData.id.toString(),
                            reservations: _count.reservations,
                        };
                    }),
                },
            };
        }),
});

// Helper function to generate temporary password
function generateTemporaryPassword(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
} 