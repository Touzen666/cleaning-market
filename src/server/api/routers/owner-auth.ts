import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes, createHash } from "crypto";
import { type Session } from 'next-auth';

// Simple password hashing using Node.js crypto
function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

export const ownerAuthRouter = createTRPCRouter({
    // Login with email and password/temporary password
    login: publicProcedure
        .input(z.object({
            email: z.string().email(),
            password: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            const { email, password } = input;

            // Find apartment owner
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email },
                include: {
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
                        },
                    },
                },
            });

            if (!owner || !owner.isActive) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Nieprawidłowy email lub hasło",
                });
            }

            let isValidPassword = false;

            // Check if using temporary password
            if (owner.temporaryPassword && owner.temporaryPasswordExpiresAt) {
                if (new Date() > owner.temporaryPasswordExpiresAt) {
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "Tymczasowe hasło wygasło. Skontaktuj się z administratorem.",
                    });
                }
                isValidPassword = password === owner.temporaryPassword;
            }

            // Check regular password
            if (!isValidPassword && owner.passwordHash) {
                isValidPassword = verifyPassword(password, owner.passwordHash);
            }

            if (!isValidPassword) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Nieprawidłowy email lub hasło",
                });
            }

            // Update last login
            await ctx.db.apartmentOwner.update({
                where: { id: owner.id },
                data: { lastLoginAt: new Date() },
            });

            // Generate session token
            const sessionToken = randomBytes(32).toString("hex");
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            // Create owner session (you might want to create a separate table for this)
            const sessionData = {
                ownerId: owner.id,
                sessionToken,
                expiresAt,
                createdAt: new Date(),
            };

            return {
                sessionToken,
                owner: {
                    id: owner.id,
                    email: owner.email,
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    isFirstLogin: owner.isFirstLogin,
                    apartments: owner.ownedApartments.map(ownership => ownership.apartment),
                },
                isFirstLogin: owner.isFirstLogin,
            };
        }),

    // Set permanent password (first login)
    setPassword: publicProcedure
        .input(z.object({
            sessionToken: z.string(),
            newPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
            email: z.string().email(),
        }))
        .mutation(async ({ input, ctx }) => {
            const { sessionToken, newPassword, email } = input;

            // Find the owner by email (simplified approach)
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email },
            });

            if (!owner?.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            // Hash the new password
            const passwordHash = hashPassword(newPassword);

            // Update owner with new password and clear temporary password
            await ctx.db.apartmentOwner.update({
                where: { id: owner.id },
                data: {
                    passwordHash,
                    temporaryPassword: null,
                    temporaryPasswordExpiresAt: null,
                    isFirstLogin: false,
                },
            });

            return {
                success: true,
                message: "Hasło zostało pomyślnie ustawione",
            };
        }),

    // Verify session
    verifySession: publicProcedure
        .input(z.object({
            sessionToken: z.string(),
        }))
        .query(async ({ input, ctx }) => {
            // Implement session verification
            throw new TRPCError({
                code: "NOT_IMPLEMENTED",
                message: "Session verification needs to be implemented",
            });
        }),

    // Get owner data with apartments
    getOwnerData: publicProcedure
        .input(z.object({
            email: z.string().email(),
        }))
        .query(async ({ input, ctx }) => {
            const { email } = input;

            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email },
                include: {
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
                        },
                    },
                },
            });

            if (!owner || !owner.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            return {
                id: owner.id,
                email: owner.email,
                firstName: owner.firstName,
                lastName: owner.lastName,
                apartments: owner.ownedApartments.map(ownership => ownership.apartment),
            };
        }),

    // Get owner statistics
    getOwnerStats: publicProcedure
        .input(z.object({
            email: z.string().email(),
        }))
        .query(async ({ input, ctx }) => {
            const { email } = input;

            // Find owner
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email },
                include: {
                    ownedApartments: {
                        include: {
                            apartment: {
                                select: { id: true },
                            },
                        },
                    },
                },
            });

            if (!owner || !owner.isActive) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            const apartmentIds = owner.ownedApartments.map(ownership => ownership.apartment.id);

            // Count active reservations (where end date is in the future or ongoing)
            const now = new Date();
            const activeReservations = await ctx.db.reservation.count({
                where: {
                    apartmentId: { in: apartmentIds },
                    end: { gte: now },
                },
            });

            // Calculate revenue for current month
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            const monthlyRevenue = await ctx.db.reservation.aggregate({
                where: {
                    apartmentId: { in: apartmentIds },
                    start: {
                        gte: startOfMonth,
                        lte: endOfMonth
                    },
                },
                _sum: {
                    paymantValue: true,
                },
            });

            return {
                totalApartments: owner.ownedApartments.length,
                activeReservations,
                monthlyRevenue: monthlyRevenue._sum.paymantValue ?? 0,
            };
        }),

    // Logout
    logout: publicProcedure
        .input(z.object({
            sessionToken: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Implement logout
            return { success: true };
        }),
}); 