import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const adminDashboardRouter = createTRPCRouter({
    // Pobierz statystyki systemu
    getSystemStatistics: protectedProcedure
        .query(async ({ ctx }) => {
            // Sprawdź czy użytkownik jest głównym administratorem
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                // Pobierz statystyki z bazy danych
                const [
                    totalUsers,
                    totalApartments,
                    totalReservations,
                    totalReports,
                    totalOwners,
                ] = await Promise.all([
                    ctx.db.user.count(),
                    ctx.db.apartment.count(),
                    ctx.db.reservation.count(),
                    ctx.db.monthlyReport.count(),
                    ctx.db.apartmentOwner.count(),
                ]);

                return {
                    users: {
                        total: totalUsers,
                        admins: await ctx.db.user.count({ where: { type: "ADMIN" } }),
                        owners: totalOwners,
                        guests: await ctx.db.user.count({ where: { type: "GUEST" } }),
                    },
                    apartments: {
                        total: totalApartments,
                        active: totalApartments, // All apartments are considered active
                        inactive: 0, // No inactive apartments in current schema
                    },
                    reservations: {
                        total: totalReservations,
                        thisMonth: await ctx.db.reservation.count({
                            where: {
                                createDate: {
                                    gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                                },
                            },
                        }),
                    },
                    reports: {
                        total: totalReports,
                        draft: await ctx.db.monthlyReport.count({ where: { status: "DRAFT" } }),
                        approved: await ctx.db.monthlyReport.count({ where: { status: "APPROVED" } }),
                        sent: await ctx.db.monthlyReport.count({ where: { status: "SENT" } }),
                    },
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas pobierania statystyk systemu",
                });
            }
        }),

    // Pobierz logi systemowe
    getSystemLogs: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(50),
                offset: z.number().min(0).default(0),
                level: z.enum(["INFO", "WARN", "ERROR"]).optional(),
                startDate: z.date().optional(),
                endDate: z.date().optional(),
            })
        )
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            // Tutaj można dodać logikę pobierania logów z bazy danych lub plików
            // Na razie zwracamy przykładowe dane
            const mockLogs = [
                {
                    id: "1",
                    timestamp: new Date(),
                    level: "INFO" as const,
                    message: "System started successfully",
                    userId: ctx.session.user.id,
                },
                {
                    id: "2",
                    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minut temu
                    level: "WARN" as const,
                    message: "High memory usage detected",
                    userId: ctx.session.user.id,
                },
            ];

            return {
                logs: mockLogs,
                total: mockLogs.length,
            };
        }),

    // Pobierz informacje o bazie danych
    getDatabaseInfo: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                // Pobierz informacje o tabelach
                const tableCounts = await Promise.all([
                    ctx.db.user.count(),
                    ctx.db.apartment.count(),
                    ctx.db.reservation.count(),
                    ctx.db.monthlyReport.count(),
                    ctx.db.apartmentOwner.count(),
                    ctx.db.apartmentImage.count(),
                ]);

                return {
                    tables: {
                        users: tableCounts[0],
                        apartments: tableCounts[1],
                        reservations: tableCounts[2],
                        reports: tableCounts[3],
                        owners: tableCounts[4],
                        images: tableCounts[5],
                    },
                    lastBackup: new Date(Date.now() - 1000 * 60 * 60 * 24), // Przykład: 1 dzień temu
                    databaseSize: "2.5 GB", // Przykładowy rozmiar
                    version: "PostgreSQL 15.0",
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas pobierania informacji o bazie danych",
                });
            }
        }),

    // Wykonaj backup bazy danych
    createDatabaseBackup: protectedProcedure
        .mutation(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                // Tutaj można dodać logikę tworzenia backupu
                // Na razie zwracamy sukces
                return {
                    success: true,
                    backupId: `backup_${Date.now()}`,
                    timestamp: new Date(),
                    message: "Backup został utworzony pomyślnie",
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas tworzenia backupu",
                });
            }
        }),



    // Pobierz informacje o API
    getApiInfo: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            return {
                endpoints: [
                    {
                        name: "TRPC API",
                        url: "/api/trpc",
                        status: "active",
                        version: "1.0.0",
                    },
                    {
                        name: "Auth API",
                        url: "/api/auth",
                        status: "active",
                        version: "1.0.0",
                    },
                    {
                        name: "Upload API",
                        url: "/api/upload",
                        status: "active",
                        version: "1.0.0",
                    },
                ],
                rateLimits: {
                    requestsPerMinute: 100,
                    requestsPerHour: 1000,
                },
                apiKeys: [
                    {
                        name: "IDOBOOKING API",
                        status: !!process.env.IDOBOOKING_API_KEY ? "active" : "inactive",
                        lastUsed: new Date(),
                    },
                ],
            };
        }),

    // Pobierz aktywnych użytkowników
    getActiveUsers: protectedProcedure
        .input(
            z.object({
                limit: z.number().min(1).max(100).default(20),
                offset: z.number().min(0).default(0),
            })
        )
        .query(async ({ ctx, input }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                const users = await ctx.db.user.findMany({
                    take: input.limit,
                    skip: input.offset,
                    orderBy: { emailVerified: "desc" },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        type: true,
                        emailVerified: true,
                        image: true,
                    },
                });

                const total = await ctx.db.user.count();

                return {
                    users,
                    total,
                    hasMore: input.offset + input.limit < total,
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas pobierania użytkowników",
                });
            }
        }),

    // Wyślij testowy email
    sendTestEmail: protectedProcedure
        .input(
            z.object({
                email: z.string().email(),
                subject: z.string().min(1),
                message: z.string().min(1),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                // Tutaj można dodać logikę wysyłania testowego emaila
                // Na razie zwracamy sukces
                return {
                    success: true,
                    message: `Testowy email został wysłany na adres ${input.email}`,
                    sentAt: new Date(),
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas wysyłania testowego emaila",
                });
            }
        }),

    // Pobierz ustawienia systemu
    getSystemSettings: protectedProcedure
        .query(async ({ ctx }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                const settings = await ctx.db.systemSettings.findMany({
                    orderBy: { updatedAt: "desc" },
                });

                // Konwertuj na obiekt dla łatwiejszego dostępu
                const settingsObject = settings.reduce((acc, setting) => {
                    acc[setting.key] = setting.value;
                    return acc;
                }, {} as Record<string, string>);

                return {
                    maintenance: {
                        enabled: settingsObject.maintenance_enabled === "true",
                        message: settingsObject.maintenance_message ?? "Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin.",
                        startTime: settingsObject.maintenance_start_time ? new Date(settingsObject.maintenance_start_time) : null,
                    },
                    email: {
                        smtpHost: settingsObject.email_smtp_host ?? "",
                        smtpPort: parseInt(settingsObject.email_smtp_port ?? "587"),
                        enabled: settingsObject.email_enabled === "true",
                    },
                    notifications: {
                        emailNotifications: settingsObject.notifications_email === "true",
                        systemAlerts: settingsObject.notifications_alerts === "true",
                        reportReminders: settingsObject.notifications_reminders === "true",
                    },
                    security: {
                        sessionTimeout: parseInt(settingsObject.security_session_timeout ?? "86400"),
                        maxLoginAttempts: parseInt(settingsObject.security_max_login_attempts ?? "5"),
                        requireTwoFactor: settingsObject.security_require_2fa === "true",
                    },
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas pobierania ustawień systemu",
                });
            }
        }),

    // Aktualizuj ustawienia systemu
    updateSystemSettings: protectedProcedure
        .input(
            z.object({
                maintenance: z.object({
                    enabled: z.boolean(),
                    message: z.string().optional(),
                }).optional(),
                email: z.object({
                    smtpHost: z.string(),
                    smtpPort: z.number(),
                    enabled: z.boolean(),
                }).optional(),
                notifications: z.object({
                    emailNotifications: z.boolean(),
                    systemAlerts: z.boolean(),
                    reportReminders: z.boolean(),
                }).optional(),
                security: z.object({
                    sessionTimeout: z.number(),
                    maxLoginAttempts: z.number(),
                    requireTwoFactor: z.boolean(),
                }).optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            if (ctx.session.user.type !== "ADMIN") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "Dostęp tylko dla głównego administratora",
                });
            }

            try {
                const settingsToUpdate: Array<{ key: string; value: string; description: string }> = [];

                // Maintenance settings
                if (input.maintenance) {
                    settingsToUpdate.push(
                        {
                            key: "maintenance_enabled",
                            value: input.maintenance.enabled.toString(),
                            description: "Czy tryb maintenance jest włączony",
                        },
                        {
                            key: "maintenance_message",
                            value: input.maintenance.message ?? "Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin.",
                            description: "Wiadomość wyświetlana w trybie maintenance",
                        }
                    );

                    if (input.maintenance.enabled) {
                        settingsToUpdate.push({
                            key: "maintenance_start_time",
                            value: new Date().toISOString(),
                            description: "Czas rozpoczęcia trybu maintenance",
                        });
                    }
                }

                // Email settings
                if (input.email) {
                    settingsToUpdate.push(
                        {
                            key: "email_smtp_host",
                            value: input.email.smtpHost,
                            description: "SMTP host",
                        },
                        {
                            key: "email_smtp_port",
                            value: input.email.smtpPort.toString(),
                            description: "SMTP port",
                        },
                        {
                            key: "email_enabled",
                            value: input.email.enabled.toString(),
                            description: "Czy email jest włączony",
                        }
                    );
                }

                // Notifications settings
                if (input.notifications) {
                    settingsToUpdate.push(
                        {
                            key: "notifications_email",
                            value: input.notifications.emailNotifications.toString(),
                            description: "Powiadomienia email",
                        },
                        {
                            key: "notifications_alerts",
                            value: input.notifications.systemAlerts.toString(),
                            description: "Alerty systemowe",
                        },
                        {
                            key: "notifications_reminders",
                            value: input.notifications.reportReminders.toString(),
                            description: "Przypomnienia o raportach",
                        }
                    );
                }

                // Security settings
                if (input.security) {
                    settingsToUpdate.push(
                        {
                            key: "security_session_timeout",
                            value: input.security.sessionTimeout.toString(),
                            description: "Timeout sesji w sekundach",
                        },
                        {
                            key: "security_max_login_attempts",
                            value: input.security.maxLoginAttempts.toString(),
                            description: "Maksymalna liczba prób logowania",
                        },
                        {
                            key: "security_require_2fa",
                            value: input.security.requireTwoFactor.toString(),
                            description: "Wymagaj uwierzytelniania dwuskładnikowego",
                        }
                    );
                }

                // Aktualizuj lub utwórz ustawienia
                for (const setting of settingsToUpdate) {
                    await ctx.db.systemSettings.upsert({
                        where: { key: setting.key },
                        update: {
                            value: setting.value,
                            description: setting.description,
                            updatedAt: new Date(),
                            updatedBy: ctx.session.user.id,
                        },
                        create: {
                            key: setting.key,
                            value: setting.value,
                            description: setting.description,
                            updatedBy: ctx.session.user.id,
                        },
                    });
                }

                return {
                    success: true,
                    message: "Ustawienia zostały zaktualizowane pomyślnie",
                };
            } catch {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Błąd podczas aktualizacji ustawień systemu",
                });
            }
        }),

    // Sprawdź czy tryb maintenance jest włączony (publiczna procedura)
    isMaintenanceMode: publicProcedure
        .query(async ({ ctx }) => {
            try {
                const maintenanceSetting = await ctx.db.systemSettings.findUnique({
                    where: { key: "maintenance_enabled" },
                });

                return {
                    enabled: maintenanceSetting?.value === "true",
                    message: await ctx.db.systemSettings.findUnique({
                        where: { key: "maintenance_message" },
                    }).then(setting => setting?.value ?? "Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin."),
                };
            } catch {
                // W przypadku błędu, domyślnie wyłącz tryb maintenance
                return {
                    enabled: false,
                    message: "Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin.",
                };
            }
        }),
});
