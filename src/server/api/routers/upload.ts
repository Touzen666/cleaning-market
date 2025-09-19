import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { put } from '@vercel/blob';

// Schema dla uploadu pliku
const uploadFileSchema = z.object({
    filename: z.string().min(1, "Nazwa pliku jest wymagana"),
    content: z.string(), // base64 encoded content
});

// Schema dla uploadu obrazu profilowego
const uploadProfileImageSchema = z.object({
    file: z.string(), // base64 encoded file
    filename: z.string().optional(),
});

// Schema dla odpowiedzi uploadu
const uploadResponseSchema = z.object({
    success: z.boolean(),
    url: z.string(),
    filename: z.string().optional(),
});

// Schema dla odpowiedzi wersji
const versionResponseSchema = z.object({
    version: z.string().optional(),
    buildTime: z.string().optional(),
});

export const uploadRouter = createTRPCRouter({
    uploadFile: protectedProcedure
        .input(uploadFileSchema)
        .output(uploadResponseSchema)
        .mutation(async ({ input }) => {
            try {
                console.log("📁 [UPLOAD] Rozpoczęcie uploadu pliku:", input.filename);

                // Konwertuj base64 na buffer
                const buffer = Buffer.from(input.content, 'base64');

                const blob = await put(input.filename, buffer, {
                    access: 'public',
                    addRandomSuffix: true,
                });

                console.log("📁 [UPLOAD] ✅ Plik przesłany pomyślnie:", blob.url);

                return {
                    success: true,
                    url: blob.url,
                    filename: input.filename,
                };
            } catch (error) {
                console.error("📁 [UPLOAD] ❌ Błąd podczas uploadu pliku:", error);
                const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Błąd uploadu pliku: ${errorMessage}`,
                });
            }
        }),

    uploadProfileImage: protectedProcedure
        .input(uploadProfileImageSchema)
        .output(uploadResponseSchema)
        .mutation(async ({ input }) => {
            try {
                console.log("🖼️ [UPLOAD-PROFILE] Rozpoczęcie uploadu obrazu profilowego");

                // Konwertuj base64 na buffer
                const buffer = Buffer.from(input.file, 'base64');

                // Sprawdź rozmiar pliku (max 5MB)
                if (buffer.length > 5 * 1024 * 1024) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Rozmiar pliku musi być mniejszy niż 5MB",
                    });
                }

                // Generuj unikalną nazwę pliku
                const timestamp = Date.now();
                const filename = input.filename || `profile-${timestamp}.jpg`;
                const fullFilename = `profiles/${filename}`;

                const blob = await put(fullFilename, buffer, {
                    access: 'public',
                    addRandomSuffix: true,
                });

                console.log("🖼️ [UPLOAD-PROFILE] ✅ Obraz profilowy przesłany pomyślnie:", blob.url);

                return {
                    success: true,
                    url: blob.url,
                    filename: fullFilename,
                };
            } catch (error) {
                console.error("🖼️ [UPLOAD-PROFILE] ❌ Błąd podczas uploadu obrazu profilowego:", error);

                if (error instanceof TRPCError) {
                    throw error;
                }

                const errorMessage = error instanceof Error ? error.message : "Nieznany błąd";

                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Błąd uploadu obrazu profilowego: ${errorMessage}`,
                });
            }
        }),

    getVersion: protectedProcedure
        .output(versionResponseSchema)
        .query(async () => {
            console.log("📊 [VERSION] Pobieranie informacji o wersji");

            return {
                version: process.env.NEXT_PUBLIC_APP_VERSION,
                buildTime: process.env.NEXT_PUBLIC_BUILD_TIME,
            };
        }),
});
