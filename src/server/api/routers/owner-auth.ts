import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes, createHash } from "crypto";
import { sendEmail } from "@/lib/email/email-service";
import { createResetPasswordEmail } from "@/lib/email/templates/reset-password";
import * as jwt from "jsonwebtoken";
import { ReportStatus } from "@prisma/client";

// Simple password hashing using Node.js crypto
function hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

// Helper to generate a secure temporary password
// function generateSecurePassword(length = 10): string {
//     const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
//     let result = '';
//     for (let i = 0; i < length; i++) {
//         result += chars.charAt(Math.floor(Math.random() * chars.length));
//     }
//     return result;
// }

// // Placeholder for email sending (replace with your actual implementation)
// async function sendResetPasswordEmail(email: string, tempPassword: string) {
//     // TODO: Use your email service and a proper template
//     // await sendEmail({ ... })
//     console.log(`Send reset password email to ${email} with password: ${tempPassword}`);
// }

export const ownerAuthRouter = createTRPCRouter({
    loginAsOwner: publicProcedure
        .input(z.object({ ownerId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            const { ownerId } = input;
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { id: ownerId },
            });

            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony.",
                });
            }

            const secret = process.env.AUTH_SECRET;
            if (!secret) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Brak sekretu do podpisania tokena.",
                });
            }

            const payload = { id: owner.id, email: owner.email, role: "OWNER" };
            const token = jwt.sign(
                payload,
                secret,
                { expiresIn: "1h" },
            );

            return { success: true, token };
        }),
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
                                    _count: {
                                        select: { reservations: true },
                                    }
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



            return {
                sessionToken,
                owner: {
                    id: owner.id,
                    email: owner.email,
                    firstName: owner.firstName,
                    lastName: owner.lastName,
                    isFirstLogin: owner.isFirstLogin,
                    apartments: owner.ownedApartments.map(ownership => {
                        const { _count, ...apartmentData } = ownership.apartment;
                        return {
                            ...apartmentData,
                            reservations: _count.reservations,
                        }
                    }),
                },
                isFirstLogin: owner.isFirstLogin,
            };
        }),

    getDashboardData: publicProcedure
        .input(z.undefined())
        .query(async ({ ctx }) => {
            const ownerEmail = ctx.headers.get("X-Owner-Email");

            if (!ownerEmail) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Brak autoryzacji",
                });
            }

            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { email: ownerEmail },
                select: {
                    firstName: true,
                    lastName: true,
                    id: true,
                },
            });

            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Nie znaleziono właściciela",
                });
            }

            const totalApartments = await ctx.db.apartmentOwnership.count({
                where: {
                    ownerId: owner.id,
                    isActive: true,
                },
            });

            const activeReservations = await ctx.db.reservation.count({
                where: {
                    apartment: {
                        ownerships: {
                            some: {
                                ownerId: owner.id,
                            },
                        },
                    },
                    end: { gte: new Date() },
                    status: { notIn: ["CANCELLED", "NOSHOW"] },
                },
            });

            const startOfYear = new Date(new Date().getFullYear(), 0, 1);

            const revenue = await ctx.db.monthlyReport.aggregate({
                where: {
                    ownerId: owner.id,
                    year: startOfYear.getFullYear(),
                    status: { in: [ReportStatus.APPROVED, ReportStatus.SENT] },
                },
                _sum: {
                    finalOwnerPayout: true,
                },
            });

            // Debug logging for dashboard
            console.log(`[DEBUG DASHBOARD] Owner ID: ${owner.id}`);
            console.log(`[DEBUG DASHBOARD] Current year: ${startOfYear.getFullYear()}`);
            console.log(`[DEBUG DASHBOARD] Aggregate sum: ${revenue._sum.finalOwnerPayout}`);

            const totalReports = await ctx.db.monthlyReport.count({
                where: {
                    ownerId: owner.id,
                },
            });

            return {
                owner,
                stats: {
                    totalApartments,
                    activeReservations,
                    currentYearProfit: revenue._sum.finalOwnerPayout ?? 0,
                    totalReports,
                },
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
            const { newPassword, email } = input;

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
        .query(async ({ }) => {
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
                                    _count: {
                                        select: { reservations: true },
                                    }
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
                apartments: owner.ownedApartments.map(ownership => {
                    const { _count, ...apartmentData } = ownership.apartment;
                    return {
                        ...apartmentData,
                        reservations: _count.reservations,
                        images: apartmentData.images.map(img => ({
                            ...img,
                            id: img.id,
                        })),
                    }
                }),
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
        .mutation(async ({ }) => {
            // Implement logout
            return { success: true };
        }),

    requestPasswordReset: publicProcedure
        .input(z.object({ email: z.string().email() }))
        .mutation(async ({ input, ctx }) => {
            try {
                const { email } = input;
                const owner = await ctx.db.apartmentOwner.findUnique({ where: { email } });

                if (owner?.isActive) {
                    const token = randomBytes(32).toString("hex");
                    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h

                    await ctx.db.apartmentOwner.update({
                        where: { id: owner.id },
                        data: {
                            resetPasswordToken: token,
                            resetPasswordTokenExpiresAt: expires,
                        },
                    });

                    const resetUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/apartamentsOwner/reset-password?token=${token}`;
                    await sendEmail({
                        to: email,
                        subject: "Reset hasła - Złote Wynajmy",
                        html: createResetPasswordEmail(owner.firstName, resetUrl),
                    });
                }
                // Always return success to not reveal if an email exists in the database
                return { success: true };

            } catch (error) {
                console.error("Błąd podczas resetowania hasła:", error);
                // Check for specific SMTP configuration errors
                if (error instanceof Error && error.message.includes("SMTP")) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "Błąd konfiguracji serwera e-mail. Skontaktuj się z administratorem.",
                    });
                }
                // Generic error for other issues
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.",
                });
            }
        }),

    resetPassword: publicProcedure
        .input(z.object({
            token: z.string(),
            newPassword: z.string().min(8, "Hasło musi mieć minimum 8 znaków"),
        }))
        .mutation(async ({ input, ctx }) => {
            const owner = await ctx.db.apartmentOwner.findFirst({
                where: {
                    resetPasswordToken: input.token,
                    resetPasswordTokenExpiresAt: { gte: new Date() },
                },
            });
            if (!owner) throw new TRPCError({ code: "BAD_REQUEST", message: "Token jest nieprawidłowy lub wygasł." });

            const passwordHash = hashPassword(input.newPassword);

            await ctx.db.apartmentOwner.update({
                where: { id: owner.id },
                data: {
                    passwordHash,
                    resetPasswordToken: null,
                    resetPasswordTokenExpiresAt: null,
                    temporaryPassword: null,
                    temporaryPasswordExpiresAt: null,
                },
            });

            return { success: true };
        }),
}); 