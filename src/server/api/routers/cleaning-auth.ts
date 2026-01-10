import { z } from "zod";
import { createTRPCRouter, publicProcedure, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import jwt from "jsonwebtoken";
import crypto from "crypto";

function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256");
    return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.pbkdf2Sync(password, salt, 100_000, 32, "sha256");
    return crypto.timingSafeEqual(actual, expected);
}

function getJwtSecret(): string {
    // Prefer dedicated secret; fallback to AUTH_SECRET (always configured in this app)
    const secret = env.CLEANING_JWT_SECRET ?? env.AUTH_SECRET;
    if (!secret) {
        throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "JWT secret is not configured",
        });
    }
    return secret;
}

export const cleaningAuthRouter = createTRPCRouter({
    login: publicProcedure
        .input(
            z.object({
                email: z.string().email(),
                password: z.string().min(1),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const { email, password } = input;

            type CleaningUserRow = { id: number; email: string; passwordHash: string; role: string | null };
            type CleaningUserClient = {
                findUnique: (args: unknown) => Promise<CleaningUserRow | null>;
                create: (args: unknown) => Promise<{ id: number; email: string; role: string | null }>;
            };
            const cleaningUserClient = (ctx.db as unknown as { cleaningUser: CleaningUserClient }).cleaningUser;
            const user = await cleaningUserClient.findUnique({
                where: { email: email.toLowerCase() } as unknown,
            });
            if (!user) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Nieprawidłowy email lub hasło",
                });
            }
            const ok = verifyPassword(password, user.passwordHash);
            if (!ok) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Nieprawidłowy email lub hasło",
                });
            }

            // Cleaner tokens: bez automatycznego wygasania (brak expiresIn)
            const token = jwt.sign(
                {
                    sub: String(user.id),
                    email: user.email,
                    role: user.role ?? "CLEANER",
                },
                getJwtSecret(),
            );
            return {
                token,
                user: {
                    id: String(user.id),
                    email: user.email,
                    role: user.role ?? "CLEANER",
                },
            };
        }),

    me: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.cleaningAuth?.userId) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return {
            id: ctx.cleaningAuth.userId,
            email: ctx.cleaningAuth.email,
            role: ctx.cleaningAuth.role ?? "CLEANER",
        };
    }),

    // Admin-only: issue a cleaning-service token for current admin (SSO/bypass)
    adminLogin: adminProcedure.mutation(async ({ ctx }) => {
        if (!ctx.session?.user?.email) {
            throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        const token = jwt.sign(
            {
                sub: ctx.session.user.id,
                email: ctx.session.user.email,
                role: "CLEANING_ADMIN",
            },
            getJwtSecret(),
            { expiresIn: "7d" },
        );
        return {
            token,
            user: {
                id: ctx.session.user.id,
                email: ctx.session.user.email,
                role: "CLEANING_ADMIN",
            },
        };
    }),

    // Admin-only: register a new cleaning user
    register: adminProcedure
        .input(
            z.object({
                email: z.string().email(),
                password: z.string().min(6),
                role: z.string().default("CLEANER"),
            }),
        )
        .mutation(async ({ input, ctx }) => {
            type CleaningUserRow = { id: number; email: string; passwordHash: string; role: string | null };
            type CleaningUserClient = {
                findUnique: (args: unknown) => Promise<CleaningUserRow | null>;
                create: (args: unknown) => Promise<{ id: number; email: string; role: string | null }>;
            };
            const cleaningUserClient = (ctx.db as unknown as { cleaningUser: CleaningUserClient }).cleaningUser;
            const existing = await cleaningUserClient.findUnique({
                where: { email: input.email.toLowerCase() } as unknown,
                select: { id: true },
            });
            if (existing) {
                throw new TRPCError({
                    code: "CONFLICT",
                    message: "Użytkownik o podanym emailu już istnieje",
                });
            }
            const passwordHash = hashPassword(input.password);
            const created = await cleaningUserClient.create({
                data: {
                    email: input.email.toLowerCase(),
                    passwordHash,
                    role: input.role,
                },
                select: { id: true, email: true, role: true },
            });
            return { success: true, user: created };
        }),
});


