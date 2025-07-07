import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { UserType } from "@prisma/client";
import { slugify } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

// Mapowanie typowych błędów kodowania polskich znaków (UTF-8 vs Windows-1250)
const brokenPolishMap: Record<string, string> = {
    "WacĹ‚awa": "Wacława",
    "PrzyjÄ™ta": "Przyjęta",
    "opĹ‚acona": "opłacona",
    "WartoĹ›Ä‡": "Wartość",
    "GoĹ›Ä‡": "Gość",
    "zĹ‚oĹĽenia": "złożenia",
    "LÄ…dĹ‚o": "Źródło",
    "ZakoĹ„czona": "Zakończona",
    "opĹ‚acona w Booking.com": "opłacona w Booking.com",
    "opĹ‚acona w Airbnb": "opłacona w Airbnb",
    // ...możesz dodać więcej na podstawie kolejnych przykładów
};

// Funkcja do naprawiania polskich znaków
function fixPolishCharacters(text: string): string {
    if (!text) return text;

    // Najpierw sprawdź czy tekst zawiera błędy kodowania
    if (text.includes('_')) {
        // Napraw typowe błędy z podkreślnikami
        return text
            .replace(/_/g, 'ł')
            .replace(/Przyja_ta/g, 'Przyjaźń')
            .replace(/Podwisi_c/g, 'Podwisłą');
    }

    // Sprawdź inne typowe błędy
    return text
        .replace(/c([aeiou])/g, 'ć$1') // c + samogłoska -> ć
        .replace(/s([aeiou])/g, 'ś$1') // s + samogłoska -> ś
        .replace(/z([aeiou])/g, 'ź$1') // z + samogłoska -> ź
        .replace(/a([bcdfghjklmnpqrstvwxz])/g, 'ą$1') // a + spółgłoska -> ą
        .replace(/e([bcdfghjklmnpqrstvwxz])/g, 'ę$1') // e + spółgłoska -> ę
        .replace(/o([bcdfghjklmnpqrstvwxz])/g, 'ó$1') // o + spółgłoska -> ó
        .replace(/n([bcdfghjklmnpqrstvwxz])/g, 'ń$1'); // n + spółgłoska -> ń
}

// Funkcja naprawiająca typowe błędy kodowania
function fixBrokenPolish(text: string): string {
    if (!text) return text;
    let fixed = text;
    // Najpierw zamień całe frazy
    for (const [broken, correct] of Object.entries(brokenPolishMap)) {
        fixed = fixed.replaceAll(broken, correct);
    }
    // Następnie zamień pojedyncze znaki (najczęstsze przypadki)
    fixed = fixed
        .replace(/Ĺ‚/g, "ł")
        .replace(/Ĺ›/g, "ś")
        .replace(/ĹĽ/g, "ż")
        .replace(/Ĺº/g, "ź")
        .replace(/Ä…/g, "ą")
        .replace(/Ä‡/g, "ć")
        .replace(/Ä™/g, "ę")
        .replace(/Ĺ„/g, "ń")
        .replace(/Ăł/g, "ó")
        .replace(/Ĺ„/g, "ń")
        .replace(/ĹĄ/g, "Ś")
        .replace(/Ĺ/g, "Ś")
        .replace(/Ĺť/g, "Ż")
        .replace(/Ĺą/g, "ą")
        .replace(/Ĺź/g, "ź")
        .replace(/Ĺ/g, "Ł")
        .replace(/Ĺ/g, "Ń")
        .replace(/Ä„/g, "Ą")
        .replace(/Ä†/g, "Ć")
        .replace(/Ä˜/g, "Ę")
        .replace(/Ă"/g, "Ó")
        .replace(/Ĺ»/g, "Ż")
        .replace(/Ĺš/g, "Ś")
        .replace(/Ĺ"/g, "Ó")
        .replace(/Ĺ"/g, "ó")
        .replace(/Ĺ/g, "Ń")
        .replace(/Ĺ/g, "Ś");
    return fixed;
}

// Funkcja naprawiająca nagłówki kolumn CSV
function fixCsvHeader(header: string): string {
    return header
        .replace(/ĹąrĂłdĹ‚o/g, 'Źródło')
        .replace(/Data zĹ‚oĹĽenia/g, 'Data złożenia')
        .replace(/Klient\/GoĹ›Ä‡/g, 'Klient/Gość')
        .replace(/Miejsca noclegowe/g, 'Miejsca noclegowe')
        .replace(/Lokalizacje/g, 'Lokalizacje')
        .replace(/Status/g, 'Status')
        .replace(/PĹ‚atnoĹ›ci/g, 'Płatności')
        .replace(/WartoĹ›Ä‡/g, 'Wartość')
        .replace(/Waluta/g, 'Waluta')
        .replace(/ID/g, 'ID')
        .replace(/Data przyjazdu/g, 'Data przyjazdu')
        .replace(/Data wyjazdu/g, 'Data wyjazdu');
}

// Funkcja naprawiająca polskie znaki we wszystkich polach tekstowych obiektu
function fixAllPolishFields<T extends Record<string, string | undefined | null>>(row: T): T {
    const fixed: Record<string, string | undefined | null> = {};
    for (const key in row) {
        if (typeof row[key] === 'string') {
            fixed[key] = fixBrokenPolish(fixPolishCharacters(row[key]));
        } else {
            fixed[key] = row[key];
        }
    }
    return fixed as T;
}

// Schema dla importu CSV
const importCsvSchema = z.object({
    csvData: z.string(),
});

// Prosty obiekt do przechowywania progresu importu w pamięci (dla demo)
const importProgressMap: Record<string, { processed: number; total: number; done: boolean; errors: number }> = {};

export const csvImportRouter = createTRPCRouter({
    importReservations: protectedProcedure
        .input(importCsvSchema)
        .mutation(async ({ input, ctx }) => {
            // Sprawdź czy użytkownik jest adminem
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą importować dane CSV",
                });
            }

            // Wygeneruj unikalny identyfikator importu
            const importBatchId = uuidv4();

            try {
                const lines = input.csvData.split('\n').filter(line => line.trim());
                // Napraw nagłówki kolumn przed mapowaniem
                const headers = lines[0]?.split(';').map(h => fixCsvHeader(h.trim().replace(/"/g, ''))) ?? [];

                // Mapowanie kolumn CSV na nasze pola
                const columnMapping = {
                    id: headers.findIndex(h => h === 'ID'),
                    source: headers.findIndex(h => h === 'Źródło'),
                    createDate: headers.findIndex(h => h === 'Data złożenia'),
                    guest: headers.findIndex(h => h === 'Klient/Gość'),
                    start: headers.findIndex(h => h === 'Data przyjazdu'),
                    end: headers.findIndex(h => h === 'Data wyjazdu'),
                    apartmentName: headers.findIndex(h => h === 'Miejsca noclegowe'),
                    address: headers.findIndex(h => h === 'Lokalizacje'),
                    status: headers.findIndex(h => h === 'Status'),
                    payment: headers.findIndex(h => h === 'Płatności'),
                    value: headers.findIndex(h => h === 'Wartość'),
                    currency: headers.findIndex(h => h === 'Waluta'),
                };

                // Sprawdź czy wszystkie wymagane kolumny zostały znalezione
                const missingColumns = Object.entries(columnMapping)
                    .filter(([, index]) => index === -1)
                    .map(([key]) => key);

                if (missingColumns.length > 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: `Brakujące kolumny w CSV: ${missingColumns.join(', ')}`,
                    });
                }

                // Sprawdź czy wszystkie indeksy kolumn są poprawne
                const hasInvalidColumns = Object.values(columnMapping).some(index => index === -1);
                if (hasInvalidColumns) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "Nieprawidłowa struktura pliku CSV",
                    });
                }

                let apartmentsCreated = 0;
                let apartmentsSkipped = 0;
                let reservationsCreated = 0;
                let reservationsSkipped = 0;
                const errors: string[] = [];

                // Zainicjuj progres importu
                importProgressMap[importBatchId] = { processed: 0, total: lines.length - 1, done: false, errors: 0 };

                // Przetwarzaj każdy wiersz (pomijając nagłówek)
                for (let i = 1; i < lines.length; i++) {
                    try {
                        const line = lines[i];
                        if (!line) continue;

                        const values = line.split(';').map(v => v.trim().replace(/"/g, ''));

                        // Sprawdź czy mamy wystarczającą liczbę kolumn
                        if (values.length < Math.max(...Object.values(columnMapping)) + 1) {
                            errors.push(`Wiersz ${i + 1}: Nieprawidłowa liczba kolumn`);
                            continue;
                        }

                        // Wyciągnij dane z wiersza
                        let rowData = {
                            id: values[columnMapping.id],
                            source: values[columnMapping.source] ?? "",
                            createDate: values[columnMapping.createDate],
                            guest: values[columnMapping.guest] ?? "",
                            start: values[columnMapping.start],
                            end: values[columnMapping.end],
                            apartmentName: values[columnMapping.apartmentName] ?? "",
                            address: values[columnMapping.address] ?? "",
                            status: values[columnMapping.status] ?? "",
                            payment: values[columnMapping.payment] ?? "",
                            value: values[columnMapping.value],
                            currency: values[columnMapping.currency],
                        };
                        // Napraw polskie znaki we wszystkich polach tekstowych
                        rowData = fixAllPolishFields(rowData);

                        // Sprawdź czy apartament istnieje (po nazwie)
                        let apartment = await ctx.db.apartment.findFirst({
                            where: { name: rowData.apartmentName }
                        });

                        // Jeśli apartament nie istnieje, utwórz go
                        if (!apartment) {
                            const slug = slugify(rowData.apartmentName);

                            // Sprawdź czy slug jest unikalny
                            const existingSlug = await ctx.db.apartment.findUnique({
                                where: { slug }
                            });

                            if (existingSlug) {
                                // Jeśli slug już istnieje, dodaj liczbę
                                let counter = 1;
                                let newSlug = `${slug}-${counter}`;
                                while (await ctx.db.apartment.findUnique({ where: { slug: newSlug } })) {
                                    counter++;
                                    newSlug = `${slug}-${counter}`;
                                }
                                apartment = await ctx.db.apartment.create({
                                    data: {
                                        name: rowData.apartmentName,
                                        slug: newSlug,
                                        address: rowData.address,
                                        importSource: 'csv',
                                        importBatchId: importBatchId,
                                    }
                                });
                            } else {
                                apartment = await ctx.db.apartment.create({
                                    data: {
                                        name: rowData.apartmentName,
                                        slug,
                                        address: rowData.address,
                                        importSource: 'csv',
                                        importBatchId: importBatchId,
                                    }
                                });
                            }
                            apartmentsCreated++;
                        } else {
                            apartmentsSkipped++;
                        }

                        // Sprawdź czy rezerwacja już istnieje
                        // Używamy kombinacji: ID z CSV + nazwa apartamentu + data przyjazdu + data wyjazdu

                        const existingReservation = await ctx.db.reservation.findFirst({
                            where: {
                                OR: [
                                    // Sprawdź po ID z CSV (jeśli istnieje)
                                    ...(rowData.id ? [{ idobookingId: parseInt(rowData.id) }] : []),
                                    // Sprawdź po kombinacji pól
                                    {
                                        apartmentName: rowData.apartmentName,
                                        start: rowData.start ? new Date(rowData.start) : undefined,
                                        end: rowData.end ? new Date(rowData.end) : undefined,
                                        guest: rowData.guest,
                                    }
                                ]
                            }
                        });

                        if (existingReservation) {
                            reservationsSkipped++;
                            continue;
                        }

                        // Konwertuj wartości - sprawdź czy dane są poprawne
                        if (!rowData.createDate || !rowData.start || !rowData.end || !rowData.value) {
                            errors.push(`Wiersz ${i + 1}: Brakujące wymagane dane`);
                            continue;
                        }

                        // TypeScript guard - upewniamy się, że wartości nie są undefined
                        const createDateStr = rowData.createDate;
                        const startDateStr = rowData.start;
                        const endDateStr = rowData.end;
                        const valueStr = rowData.value;

                        if (!createDateStr || !startDateStr || !endDateStr || !valueStr) {
                            errors.push(`Wiersz ${i + 1}: Brakujące wymagane dane po sprawdzeniu`);
                            continue;
                        }
                        const createDate = new Date(createDateStr.split(' ')[0] ?? '');
                        const startDate = new Date(startDateStr);
                        const endDate = new Date(endDateStr);
                        const paymentValue = parseFloat(valueStr.replace(',', '.'));

                        // Utwórz rezerwację
                        await ctx.db.reservation.create({
                            data: {
                                source: rowData.source,
                                createDate,
                                guest: rowData.guest,
                                start: startDate,
                                end: endDate,
                                apartmentName: rowData.apartmentName,
                                address: rowData.address,
                                status: rowData.status,
                                payment: rowData.payment,
                                paymantValue: paymentValue,
                                currency: rowData.currency!,
                                apartmentId: apartment.id,
                                ...(rowData.id && { idobookingId: parseInt(rowData.id) }),
                                importSource: 'csv',
                                importBatchId: importBatchId,
                            }
                        });

                        reservationsCreated++;

                    } catch (error) {
                        errors.push(`Wiersz ${i + 1}: ${error instanceof Error ? error.message : 'Nieznany błąd'}`);
                    }
                    // Aktualizuj progres po każdym wierszu
                    importProgressMap[importBatchId].processed = i;
                    importProgressMap[importBatchId].errors = errors.length;
                }
                // Oznacz import jako zakończony
                importProgressMap[importBatchId].done = true;

                return {
                    importBatchId,
                    summary: {
                        apartmentsCreated,
                        apartmentsSkipped,
                        reservationsCreated,
                        reservationsSkipped,
                        totalRows: lines.length - 1,
                        errors: errors.length,
                    },
                    errors: errors.length > 0 ? errors : undefined,
                };

            } catch (error) {
                console.error('Błąd podczas importu CSV:', error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "Błąd podczas importu CSV",
                });
            }
        }),

    // Endpoint do pobierania statystyk importu
    getImportStats: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą przeglądać statystyki importu",
                });
            }

            const totalApartments = await ctx.db.apartment.count();
            const totalReservations = await ctx.db.reservation.count();

            // Pobierz unikalne statusy rezerwacji
            const statuses = await ctx.db.reservation.findMany({
                select: { status: true },
                distinct: ['status'],
            });

            return {
                totalApartments,
                totalReservations,
                uniqueStatuses: statuses.map(s => s.status).sort(),
            };
        }),

    // Endpoint: lista batchy importów CSV
    getCsvImportBatches: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą przeglądać importy CSV",
                });
            }
            // Pobierz unikalne batchId z rezerwacji
            const batches = await ctx.db.reservation.groupBy({
                by: ['importBatchId'],
                where: { importSource: 'csv', importBatchId: { not: null } },
                _count: { _all: true },
                _min: { createDate: true },
                _max: { createDate: true },
            });
            return batches.map(b => ({
                importBatchId: b.importBatchId,
                count: b._count._all,
                minDate: b._min.createDate,
                maxDate: b._max.createDate,
            })).sort((a, b) => (b.minDate && a.minDate ? b.minDate.getTime() - a.minDate.getTime() : 0));
        }),

    // Endpoint: usuwanie batcha importu CSV
    deleteCsvImportBatch: protectedProcedure
        .input(z.object({ importBatchId: z.string() }))
        .mutation(async ({ input, ctx }) => {
            if (ctx.session.user.type !== UserType.ADMIN) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Tylko administratorzy mogą usuwać importy CSV",
                });
            }
            // Usuń rezerwacje
            await ctx.db.reservation.deleteMany({
                where: { importSource: 'csv', importBatchId: input.importBatchId },
            });
            // Usuń apartamenty
            await ctx.db.apartment.deleteMany({
                where: { importSource: 'csv', importBatchId: input.importBatchId },
            });
            return { success: true };
        }),

    // Endpoint do pobierania progresu importu CSV
    getCsvImportProgress: protectedProcedure
        .input(z.object({ importBatchId: z.string() }))
        .query(({ input }) => {
            const progress = importProgressMap[input.importBatchId];
            if (!progress) {
                throw new TRPCError({ code: "NOT_FOUND", message: "Brak progresu dla tego importu" });
            }
            return progress;
        }),
}); 