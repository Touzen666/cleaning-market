import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type PrismaClient } from '@prisma/client';

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
    createdByAdmin: z.object({
        name: z.string().nullable(),
        email: z.string().nullable(),
    }).nullable(),
    ownedApartments: z.array(z.object({
        apartment: z.object({
            id: z.number(),
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
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view apartment owners",
                });
            }

            try {

                return await (ctx.db as PrismaClient).apartmentOwner.findMany({
                    include: {
                        createdByAdmin: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                        ownedApartments: {
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
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                });
            } catch (error) {
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
            paymentType: z.enum(["COMMISSION", "FIXED_AMOUNT"]).default("COMMISSION"),
            fixedPaymentAmount: z.number().optional(),
            vatOption: z.enum(["NO_VAT", "VAT_8", "VAT_23"]).default("NO_VAT"),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== "ADMIN") {
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
                    paymentType: input.paymentType,
                    fixedPaymentAmount: input.fixedPaymentAmount,
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

            console.log(`🏢 New apartment owner created: ${newOwner.email} with temp password: ${temporaryPassword}`);

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
            if (ctx.session.user.type !== "ADMIN") {
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

    // Assign apartments to owner
    assignApartments: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
            apartmentIds: z.array(z.number()),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== "ADMIN") {
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

    // Reset temporary password
    resetPassword: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== "ADMIN") {
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

            console.log(`🔑 Password reset for owner: ${input.ownerId}, new temp password: ${temporaryPassword}`);

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
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Only admins can view owner details",
                });
            }

            return await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
                include: {
                    createdByAdmin: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                    ownedApartments: {
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
                },
            });
        }),

    // Delete apartment owner (admin only)
    delete: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Check if user is admin
            if (ctx.session.user.type !== "ADMIN") {
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