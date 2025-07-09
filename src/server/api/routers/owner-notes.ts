import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType, NoteType } from "@prisma/client";

export const ownerNotesRouter = createTRPCRouter({
    // Pobierz wszystkie notatki właściciela
    getByOwnerId: protectedProcedure
        .input(z.object({
            ownerId: z.string().min(1),
        }))
        .query(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą przeglądać notatki",
                });
            }

            const notes = await ctx.db.ownerNote.findMany({
                where: { ownerId: input.ownerId },
                include: {
                    createdByAdmin: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });

            return notes;
        }),

    // Utwórz nową notatkę
    create: protectedProcedure
        .input(z.object({
            ownerId: z.string().min(1),
            type: z.nativeEnum(NoteType),
            title: z.string().min(1, "Tytuł jest wymagany"),
            content: z.string().min(1, "Treść jest wymagana"),
            isImportant: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą tworzyć notatki",
                });
            }

            // Sprawdź czy właściciel istnieje
            const owner = await ctx.db.apartmentOwner.findUnique({
                where: { id: input.ownerId },
            });

            if (!owner) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Właściciel nie został znaleziony",
                });
            }

            const note = await ctx.db.ownerNote.create({
                data: {
                    ownerId: input.ownerId,
                    type: input.type,
                    title: input.title,
                    content: input.content,
                    isImportant: input.isImportant ?? false,
                    createdByAdminId: ctx.session.user.id,
                },
                include: {
                    createdByAdmin: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            return note;
        }),

    // Zaktualizuj notatkę
    update: protectedProcedure
        .input(z.object({
            noteId: z.string().min(1),
            type: z.nativeEnum(NoteType).optional(),
            title: z.string().min(1, "Tytuł jest wymagany").optional(),
            content: z.string().min(1, "Treść jest wymagana").optional(),
            isImportant: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą edytować notatki",
                });
            }

            const { noteId, ...updateData } = input;

            // Sprawdź czy notatka istnieje
            const existingNote = await ctx.db.ownerNote.findUnique({
                where: { id: noteId },
            });

            if (!existingNote) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notatka nie została znaleziona",
                });
            }

            const note = await ctx.db.ownerNote.update({
                where: { id: noteId },
                data: updateData,
                include: {
                    createdByAdmin: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });

            return note;
        }),

    // Usuń notatkę
    delete: protectedProcedure
        .input(z.object({
            noteId: z.string().min(1),
        }))
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą usuwać notatki",
                });
            }

            // Sprawdź czy notatka istnieje
            const existingNote = await ctx.db.ownerNote.findUnique({
                where: { id: input.noteId },
            });

            if (!existingNote) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "Notatka nie została znaleziona",
                });
            }

            await ctx.db.ownerNote.delete({
                where: { id: input.noteId },
            });

            return {
                success: true,
                message: "Notatka została usunięta",
            };
        }),
}); 