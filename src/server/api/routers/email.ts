/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType, type PrismaClient } from "@prisma/client";
import {
    createWelcomeEmailWithPasswordTemplate,
    createWelcomeEmailWithoutPasswordTemplate
} from "@/lib/email/templates";
import { sendEmail, getBaseUrl } from "@/lib/email/email-service";
import path from "path";

export async function _sendWelcomeEmail({ ownerId, db }: { ownerId: string, db: PrismaClient }) {
    // Pobierz dane właściciela
    const owner = await db.apartmentOwner.findUnique({
        where: { id: ownerId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            temporaryPassword: true,
            passwordHash: true,
        },
    });

    if (!owner) {
        throw new TRPCError({
            code: "NOT_FOUND",
            message: "Właściciel nie został znaleziony",
        });
    }

    // Przygotuj wiadomość w zależności od tego, czy właściciel ma hasło permanentne
    const ownerName = `${owner.firstName} ${owner.lastName}`;
    const baseUrl = getBaseUrl();
    let htmlContent: string;
    let subject: string;

    if (owner.passwordHash && !owner.temporaryPassword) {
        // Właściciel ma hasło permanentne - wyślij email bez hasła tymczasowego
        htmlContent = createWelcomeEmailWithoutPasswordTemplate(ownerName, baseUrl);
        subject = "🏠 Witamy w Złote Wynajmy - Dostęp do panelu";
    } else if (owner.temporaryPassword) {
        // Właściciel ma hasło tymczasowe - wyślij email z hasłem
        htmlContent = createWelcomeEmailWithPasswordTemplate(ownerName, owner.temporaryPassword, baseUrl);
        subject = "🏠 Witamy w Złote Wynajmy - Twoje dane dostępowe";
    } else {
        throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Właściciel nie ma ustawionego żadnego hasła",
        });
    }

    // Wyślij email
    const info = await sendEmail({
        to: owner.email,
        subject: subject,
        html: htmlContent,
        attachments: [
            {
                filename: 'logo.png',
                path: path.join(process.cwd(), 'public', 'logo.png'),
                contentType: 'image/png',
                cid: 'logo@zlote-wynajmy.pl'
            }
        ]
    });

    return {
        messageId: info.messageId,
        email: owner.email,
    };
}

export const emailRouter = createTRPCRouter({
    // Wysyłanie wiadomości powitalnej do właściciela
    sendWelcomeEmail: protectedProcedure
        .input(z.object({
            ownerId: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą wysyłać wiadomości email",
                });
            }

            try {
                const { messageId, email } = await _sendWelcomeEmail({ ownerId: input.ownerId, db: ctx.db });

                return {
                    success: true,
                    messageId: messageId,
                    message: `Email powitalny został wysłany do ${email}`,
                };

            } catch (error) {
                console.error("❌ Błąd podczas wysyłania emaila:", error);
                console.error("❌ Szczegóły błędu:", {
                    message: error instanceof Error ? error.message : "Unknown error",
                    stack: error instanceof Error ? error.stack : undefined,
                });

                if (error instanceof TRPCError) {
                    throw error;
                }

                // Sprawdź czy to błąd konfiguracji
                if (error instanceof Error && error.message.includes("Brak konfiguracji SMTP")) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Brak konfiguracji SMTP. Sprawdź plik .env i zmienne: SMTP_HOST, SMTP_USER, SMTP_PASS",
                    });
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Wystąpił błąd podczas wysyłania wiadomości email: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),

    // Test wysyłania emaila (tylko w development)
    testEmail: protectedProcedure
        .input(z.object({
            email: z.string().email(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą testować wysyłanie emaili",
                });
            }

            // Tylko w trybie development
            if (process.env.NODE_ENV !== "development") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Testowanie emaili dostępne tylko w trybie development",
                });
            }

            try {
                const testPassword = "TEST123";
                const baseUrl = getBaseUrl();
                const htmlContent = createWelcomeEmailWithPasswordTemplate("Test User", testPassword, baseUrl);

                const info = await sendEmail({
                    to: input.email,
                    subject: "🧪 Test - Złote Wynajmy",
                    html: htmlContent,
                });

                return {
                    success: true,
                    messageId: info.messageId,
                    message: `Test email został wysłany do ${input.email}`,
                };

            } catch (error) {
                console.error("❌ Błąd podczas wysyłania test emaila:", error);

                // Sprawdź czy to błąd konfiguracji
                if (error instanceof Error && error.message.includes("Brak konfiguracji SMTP")) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Brak konfiguracji SMTP. Sprawdź plik .env i zmienne: SMTP_HOST, SMTP_USER, SMTP_PASS",
                    });
                }

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Wystąpił błąd podczas wysyłania test emaila: ${error instanceof Error ? error.message : "Unknown error"}`,
                });
            }
        }),
}); 