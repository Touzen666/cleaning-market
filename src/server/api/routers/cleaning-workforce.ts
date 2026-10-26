import { z } from "zod";
import crypto from "node:crypto";
import { TRPCError } from "@trpc/server";
import { publicProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  adjustmentMinutes,
  balance,
  checklistKeys,
  completeTask,
  localNow,
  offerNext,
  photoSchema,
  REWARDS,
  respond,
  rulesSchema,
  slotFor,
  type Task,
} from "@/server/cleaning/workforce-domain";
import {
  asJson,
  changeWorkforce,
  readWorkforce,
  reconcileState,
  sourceForWorkforce,
  synchronizeWorkforce,
  refreshTaskBeforeDecision,
} from "@/server/cleaning/workforce-store";
import { cleaningAccountId } from "@/server/cleaning/snapshot";
import { validateRange } from "@/server/idobooking/operations";
import {
  hashCleaningPassword,
  verifyCleaningPassword,
} from "@/server/cleaning/passwords";
import jwt from "jsonwebtoken";
import { env } from "@/env";

const authorized = publicProcedure.use(async ({ ctx, next }) => {
  if (ctx.cleaningAuth?.role === "CLEANING_ADMIN")
    return next({
      ctx: {
        ...ctx,
        workforceActor: `admin:${ctx.cleaningAuth.userId}`,
        workforceUserId: null as number | null,
        workforceManager: true,
      },
    });
  if (ctx.cleaningAuth) {
    const id = Number(ctx.cleaningAuth.userId);
    if (!Number.isSafeInteger(id) || id < 1)
      throw new TRPCError({ code: "UNAUTHORIZED" });
    const user = await ctx.db.cleaningUser.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        cleaningProfile: { select: { active: true } },
      },
    });
    if (!user || user.cleaningProfile?.active === false)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Konto jest nieaktywne. Skontaktuj się z koordynatorem.",
      });
    const current = await readWorkforce(ctx.db);
    if (
      (ctx.cleaningAuth.credentialVersion ?? 0) !==
      (current.state.credentialVersions[String(id)] ?? 0)
    )
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Zaloguj się ponownie po zmianie hasła.",
      });
    return next({
      ctx: {
        ...ctx,
        workforceActor: `cleaning:${id}`,
        workforceUserId: id as number | null,
        workforceManager: ["MANAGER", "ADMIN"].includes(user.role),
      },
    });
  }
  if (ctx.session?.user?.type === "ADMIN")
    return next({
      ctx: {
        ...ctx,
        workforceActor: `admin:${ctx.session.user.id}`,
        workforceUserId: null as number | null,
        workforceManager: true,
      },
    });
  throw new TRPCError({ code: "UNAUTHORIZED" });
});
const manager = authorized.use(({ ctx, next }) => {
  if (!ctx.workforceManager) throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});
const profileFields = z.object({
  displayName: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .regex(/^\+[1-9]\d{7,14}$/, "Numer telefonu w formacie +48123456789")
    .nullable(),
  photo: photoSchema.nullable(),
});
const range = z
  .object({ from: z.string().date(), to: z.string().date() })
  .superRefine((r, ctx) => {
    try {
      validateRange(r.from, r.to);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Zakres musi obejmować 1–31 dni",
      });
    }
  });
const taskInput = z.object({
  taskId: z.string().min(1).max(200),
  version: z.number().int().positive(),
});
function taskById(tasks: Task[], id: string, version: number) {
  const task = tasks.find((t) => t.id === id);
  if (!task) throw new TRPCError({ code: "NOT_FOUND" });
  if (task.version !== version)
    throw new TRPCError({
      code: "CONFLICT",
      message: "Zadanie zmieniło się. Odśwież widok.",
    });
  return task;
}
function ownTask(task: Task, userId: number | null) {
  if (!userId || task.userId !== userId)
    throw new TRPCError({ code: "FORBIDDEN" });
  return userId;
}
export const cleaningWorkforceRouter = createTRPCRouter({
  requestPasswordHelp: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(200) }))
    .mutation(async ({ ctx, input }) => {
      const message =
        "Jeśli konto istnieje, koordynator otrzymał zgłoszenie w aplikacji. Skontaktuj się z nim, aby uzyskać nowe hasło.";
      const requestedUser = await ctx.db.cleaningUser.findUnique({
        where: { email: input.email.toLowerCase() },
        select: { id: true },
      });
      if (!requestedUser) return { message };
      const current = await readWorkforce(ctx.db);
      if (
        current.state.passwordHelp.some(
          (h) =>
            h.userId === requestedUser.id &&
            !h.resolved &&
            Date.now() - Date.parse(h.createdAt) < 86400000,
        )
      )
        return { message };
      await changeWorkforce(
        ctx.db,
        "public:password-help",
        "PASSWORD_HELP_REQUESTED",
        async (state, tx) => {
          const user = await tx.cleaningUser.findUnique({
            where: { email: input.email.toLowerCase() },
            select: { id: true },
          });
          if (
            user &&
            !state.passwordHelp.some(
              (h) =>
                h.userId === user.id &&
                !h.resolved &&
                Date.now() - Date.parse(h.createdAt) < 86400000,
            )
          )
            state.passwordHelp.push({
              userId: user.id,
              createdAt: new Date().toISOString(),
              resolved: false,
            });
        },
      );
      return { message };
    }),
  resetEmployeePassword: manager
    .input(
      z.object({
        userId: z.number().int().positive(),
        password: z.string().min(10).max(128),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PASSWORD_RESET",
        async (state, tx) => {
          const user = await tx.cleaningUser.findUnique({
            where: { id: input.userId },
            select: { role: true },
          });
          if (user?.role !== "CLEANER")
            throw new TRPCError({ code: "FORBIDDEN" });
          await tx.cleaningUser.update({
            where: { id: input.userId },
            data: { passwordHash: hashCleaningPassword(input.password) },
          });
          state.credentialVersions[String(input.userId)] =
            (state.credentialVersions[String(input.userId)] ?? 0) + 1;
          state.passwordHelp
            .filter((h) => h.userId === input.userId)
            .forEach((h) => {
              h.resolved = true;
            });
          return { success: true };
        },
      ),
    ),
  changePassword: authorized
    .input(
      z.object({
        oldPassword: z.string().min(1).max(128),
        newPassword: z.string().min(10).max(128),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PASSWORD_CHANGED",
        async (state, tx) => {
          if (!ctx.workforceUserId) throw new TRPCError({ code: "FORBIDDEN" });
          const user = await tx.cleaningUser.findUnique({
            where: { id: ctx.workforceUserId },
          });
          if (
            !user ||
            !verifyCleaningPassword(input.oldPassword, user.passwordHash)
          )
            throw new Error("Nieprawidłowe obecne hasło.");
          await tx.cleaningUser.update({
            where: { id: user.id },
            data: { passwordHash: hashCleaningPassword(input.newPassword) },
          });
          const version = (state.credentialVersions[String(user.id)] ?? 0) + 1;
          state.credentialVersions[String(user.id)] = version;
          const secret = env.CLEANING_JWT_SECRET ?? env.AUTH_SECRET;
          if (!secret) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          return {
            token: jwt.sign(
              {
                sub: String(user.id),
                email: user.email,
                role: user.role,
                cv: version,
              },
              secret,
            ),
          };
        },
      ),
    ),
  requestProfileChange: authorized
    .input(
      profileFields.omit({ photo: true }).extend({
        email: z.string().trim().email().max(200),
        reason: z.string().trim().min(5).max(500),
        photo: photoSchema.nullable().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PROFILE_CHANGE_REQUESTED",
        async (state, tx) => {
          if (!ctx.workforceUserId) throw new TRPCError({ code: "FORBIDDEN" });
          if (
            state.profileRequests.some(
              (r) =>
                r.userId === ctx.workforceUserId && r.status === "REQUESTED",
            )
          )
            throw new Error(
              "Poprzedni wniosek o zmianę danych nadal oczekuje na rozpatrzenie.",
            );
          const { photo, ...contactFields } = input;
          if (photo !== undefined)
            await tx.cleaningProfile.update({
              where: { userId: ctx.workforceUserId },
              data: { photo },
            });
          state.profileRequests.push({
            id: crypto.randomUUID(),
            userId: ctx.workforceUserId,
            ...contactFields,
            email: input.email.toLowerCase(),
            status: "REQUESTED",
            createdAt: new Date().toISOString(),
          });
          return { success: true };
        },
      ),
    ),
  reviewProfileChange: manager
    .input(z.object({ id: z.string().uuid(), approve: z.boolean() }))
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PROFILE_CHANGE_REVIEWED",
        async (state, tx) => {
          const request = state.profileRequests.find(
            (r) => r.id === input.id && r.status === "REQUESTED",
          );
          if (!request) throw new Error("Wniosek został już rozpatrzony.");
          if (input.approve) {
            await tx.cleaningProfile.upsert({
              where: { userId: request.userId },
              create: {
                userId: request.userId,
                displayName: request.displayName,
                phone: request.phone,
                active: false,
                rules: asJson(rulesSchema.parse({})),
              },
              update: {
                displayName: request.displayName,
                phone: request.phone,
              },
            });
            await tx.cleaningUser.update({
              where: { id: request.userId },
              data: { email: request.email },
            });
          }
          request.status = input.approve ? "APPROVED" : "REJECTED";
          return { success: true };
        },
      ),
    ),
  board: authorized.input(range).query(async ({ ctx, input }) => {
    const { state, revision } = await readWorkforce(ctx.db);
    const ownId = ctx.workforceUserId;
    const tasks = state.tasks.filter(
      (t) =>
        t.serviceDate >= input.from &&
        t.serviceDate < input.to &&
        (ctx.workforceManager || t.userId === ownId),
    );
    const ids = [
      ...new Set(tasks.flatMap((t) => (t.userId ? [t.userId] : []))),
    ];
    const profiles = await ctx.db.cleaningProfile.findMany({
      where: { userId: { in: ids } },
      select: { userId: true, displayName: true, photo: true },
    });
    // Employee never receives the source feed, other employees, local rules or notification phones.
    return {
      tasks,
      profiles,
      lastSync: state.lastSync,
      revision,
      manager: ctx.workforceManager,
      userId: ownId,
      adjustments: ctx.workforceManager ? state.adjustments : [],
      ledger: state.ledger.filter(
        (l) => ctx.workforceManager || l.userId === ownId,
      ),
      balance: ownId ? balance(state.ledger, ownId) : null,
      profileRequests: state.profileRequests.filter(
        (r) => ctx.workforceManager || r.userId === ownId,
      ),
      passwordHelp: ctx.workforceManager
        ? state.passwordHelp.filter((h) => !h.resolved)
        : [],
      notifications: ctx.workforceManager
        ? await ctx.db.cleaningNotification.groupBy({
            by: ["status"],
            where: { workspaceId: (await readWorkforce(ctx.db)).accountId },
            _count: true,
          })
        : [],
    };
  }),
  team: manager.query(async ({ ctx }) =>
    ctx.db.cleaningUser.findMany({
      where: { role: "CLEANER" },
      select: { id: true, email: true, cleaningProfile: true },
      orderBy: { id: "asc" },
    }),
  ),
  available: authorized.query(async ({ ctx }) => {
    const { state } = await readWorkforce(ctx.db),
      now = localNow();
    const profile =
      !ctx.workforceManager && ctx.workforceUserId
        ? await ctx.db.cleaningProfile.findUnique({
            where: { userId: ctx.workforceUserId },
            select: {
              active: true,
              dailyLimit: true,
              rules: true,
              displayName: true,
            },
          })
        : null;
    const worker =
      profile && ctx.workforceUserId
        ? {
            id: ctx.workforceUserId,
            name: profile.displayName,
            active: profile.active,
            dailyLimit: profile.dailyLimit,
            rules: rulesSchema.parse(profile.rules),
          }
        : null;
    return state.tasks
      .filter(
        (t) =>
          t.status === "UNASSIGNED" &&
          t.serviceDate >= now.slice(0, 10) &&
          !t.declined.includes(ctx.workforceUserId ?? -1) &&
          (ctx.workforceManager ||
            !!(worker && slotFor(t, worker, state.tasks, now))),
      )
      .map((t) => ({ ...t, declined: [], forcedReason: null }));
  }),
  claim: authorized.input(taskInput).mutation(async ({ ctx, input }) => {
    await refreshTaskBeforeDecision(ctx.db, ctx.workforceActor, input.taskId);
    return changeWorkforce(
      ctx.db,
      ctx.workforceActor,
      "TASK_CLAIMED",
      (state, _tx, workers) => {
        const task = taskById(state.tasks, input.taskId, input.version);
        if (task.status !== "UNASSIGNED" || !ctx.workforceUserId)
          throw new Error("Zadanie jest już przydzielone.");
        offerNext(task, workers, state.tasks, localNow(), ctx.workforceUserId);
        task.status = "ACCEPTED";
        return { success: true };
      },
      input.taskId,
    );
  }),
  confirmEntry: manager.input(taskInput).mutation(({ ctx, input }) =>
    changeWorkforce(
      ctx.db,
      ctx.workforceActor,
      "ENTRY_CONFIRMED",
      (state) => {
        const task = taskById(state.tasks, input.taskId, input.version);
        if (["CANCELLED", "REVIEW", "DONE"].includes(task.status))
          throw new Error("Zadanie nie jest gotowe do wejścia.");
        task.entryApproved = true;
        task.version++;
        return { success: true };
      },
      input.taskId,
    ),
  ),
  createEmployee: manager
    .input(
      profileFields.extend({
        email: z.string().trim().email().max(200),
        password: z.string().min(10).max(128),
        dailyLimit: z.number().int().min(1).max(4).default(4),
        rules: rulesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "EMPLOYEE_CREATED",
        async (_state, tx) => {
          const user = await tx.cleaningUser.create({
            data: {
              email: input.email.toLowerCase(),
              passwordHash: hashCleaningPassword(input.password),
              role: "CLEANER",
              cleaningProfile: {
                create: {
                  displayName: input.displayName,
                  phone: input.phone,
                  photo: input.photo,
                  dailyLimit: input.dailyLimit,
                  rules: asJson(input.rules),
                },
              },
            },
            select: { id: true, email: true },
          });
          return user;
        },
      ),
    ),
  updateEmployee: manager
    .input(
      profileFields.extend({
        userId: z.number().int().positive(),
        active: z.boolean(),
        dailyLimit: z.number().int().min(1).max(4),
        rules: rulesSchema,
      }),
    )
    .mutation(async ({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "EMPLOYEE_UPDATED",
        async (state, tx) => {
          const user = await tx.cleaningUser.findUnique({
            where: { id: input.userId },
            select: { role: true },
          });
          if (user?.role !== "CLEANER")
            throw new TRPCError({ code: "FORBIDDEN" });
          const { userId, ...data } = input;
          await tx.cleaningProfile.upsert({
            where: { userId },
            create: { userId, ...data, rules: asJson(data.rules) },
            update: { ...data, rules: asJson(data.rules) },
          });
          for (const task of state.tasks.filter(
            (t) =>
              t.userId === userId &&
              ["OFFERED", "ACCEPTED", "FORCED"].includes(t.status),
          )) {
            task.status = "REVIEW";
            task.alert =
              "Zmieniono zasady pracownika. Odśwież rezerwacje, aby przeliczyć przydział.";
            task.version++;
          }
          return { success: true };
        },
      ),
    ),
  profile: authorized.query(async ({ ctx }) => {
    if (!ctx.workforceUserId) return null;
    const user = await ctx.db.cleaningUser.findUnique({
      where: { id: ctx.workforceUserId },
      select: { id: true, email: true, cleaningProfile: true },
    });
    return user;
  }),
  saveProfile: authorized
    .input(profileFields)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.workforceUserId) throw new TRPCError({ code: "FORBIDDEN" });
      return changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PROFILE_UPDATED",
        async (_state, tx) => {
          const existing = await tx.cleaningProfile.findUnique({
            where: { userId: ctx.workforceUserId! },
          });
          if (
            existing &&
            (existing.displayName !== input.displayName ||
              existing.phone !== input.phone)
          )
            throw new Error(
              "Zmianę danych kontaktowych zgłoś do zatwierdzenia przez koordynatora.",
            );
          await tx.cleaningProfile.upsert({
            where: { userId: ctx.workforceUserId! },
            create: {
              userId: ctx.workforceUserId!,
              ...input,
              active: false,
              rules: asJson(rulesSchema.parse({})),
            },
            update: input,
          });
          return { success: true };
        },
      );
    }),
  synchronize: manager
    .input(range)
    .mutation(({ ctx, input }) =>
      synchronizeWorkforce(
        ctx.db,
        ctx.workforceActor,
        input.from,
        input.to,
        true,
      ),
    ),
  adjustStay: manager
    .input(
      z.object({
        reservationId: z.number().int().positive(),
        unitId: z.number().int().positive(),
        earlyMinutes: adjustmentMinutes,
        lateMinutes: adjustmentMinutes,
        expectedAdjustment: z
          .object({
            earlyMinutes: adjustmentMinutes,
            lateMinutes: adjustmentMinutes,
          })
          .optional(),
        from: z.string().date(),
        to: z.string().date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      validateRange(input.from, input.to);
      const source = await sourceForWorkforce(
        ctx.db,
        input.from,
        input.to,
        true,
      );
      if (
        !source.snapshot.stays.some(
          (s) => s.id === input.reservationId && s.unitId === input.unitId,
        )
      )
        throw new TRPCError({ code: "NOT_FOUND" });
      return changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "LOCAL_STAY_ADJUSTED",
        (state, _tx, workers) => {
          const current = state.adjustments.find(
            (adjustment) =>
              adjustment.reservationId === input.reservationId &&
              adjustment.unitId === input.unitId,
          );
          if (
            input.expectedAdjustment &&
            ((current?.earlyMinutes ?? 0) !==
              input.expectedAdjustment.earlyMinutes ||
              (current?.lateMinutes ?? 0) !==
                input.expectedAdjustment.lateMinutes)
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message:
                "Korekta została zmieniona przez inną osobę. Odśwież rezerwacje i spróbuj ponownie.",
            });
          }
          state.adjustments = state.adjustments.filter(
            (a) =>
              a.reservationId !== input.reservationId ||
              a.unitId !== input.unitId,
          );
          state.adjustments.push({
            reservationId: input.reservationId,
            unitId: input.unitId,
            earlyMinutes: input.earlyMinutes,
            lateMinutes: input.lateMinutes,
          });
          return reconcileState(state, source, workers, localNow());
        },
      );
    }),
  assign: manager
    .input(
      taskInput.extend({
        userId: z.number().int().positive().optional(),
        force: z.boolean().default(false),
        reason: z.string().trim().max(500).default(""),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await refreshTaskBeforeDecision(ctx.db, ctx.workforceActor, input.taskId);
      return changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "TASK_ASSIGNED",
        (state, _tx, workers) => {
          const task = taskById(state.tasks, input.taskId, input.version);
          if (
            ["REVIEW", "CANCELLED", "DONE", "IN_PROGRESS"].includes(task.status)
          )
            throw new Error("Najpierw wyjaśnij kwalifikację zadania.");
          if (input.force && (!input.userId || input.reason.length < 5))
            throw new Error(
              "Przymusowy przydział wymaga wyboru osoby i uzasadnienia.",
            );
          offerNext(
            task,
            workers,
            state.tasks,
            localNow(),
            input.userId,
            input.force,
          );
          task.forcedReason = input.force ? input.reason : null;
          return { success: true };
        },
        input.taskId,
      );
    }),
  respond: authorized
    .input(taskInput.extend({ accept: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await refreshTaskBeforeDecision(ctx.db, ctx.workforceActor, input.taskId);
      return changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        input.accept ? "TASK_ACCEPTED" : "TASK_DECLINED",
        (state, _tx, workers) => {
          const task = taskById(state.tasks, input.taskId, input.version);
          respond(
            task,
            ownTask(task, ctx.workforceUserId),
            input.version,
            input.accept,
            workers,
            state.tasks,
            localNow(),
          );
          return { success: true };
        },
        input.taskId,
      );
    }),
  start: authorized.input(taskInput).mutation(async ({ ctx, input }) => {
    await refreshTaskBeforeDecision(ctx.db, ctx.workforceActor, input.taskId);
    return changeWorkforce(
      ctx.db,
      ctx.workforceActor,
      "TASK_STARTED",
      (state) => {
        const task = taskById(state.tasks, input.taskId, input.version);
        ownTask(task, ctx.workforceUserId);
        const now = localNow();
        if (
          !["ACCEPTED", "FORCED"].includes(task.status) ||
          (task.provisional && !task.entryApproved) ||
          !task.start ||
          !task.end ||
          now < task.start.slice(0, 16) ||
          now >= task.end.slice(0, 16)
        )
          throw new Error(
            task.provisional && !task.entryApproved
              ? "Rezerwacja oczekująca wymaga potwierdzenia przez koordynatora przed wejściem."
              : "Rozpocznij przyjęte sprzątanie w przydzielonym terminie.",
          );
        task.status = "IN_PROGRESS";
        task.startedAt = new Date().toISOString();
        task.version++;
        return { success: true };
      },
      input.taskId,
    );
  }),
  saveChecklist: authorized
    .input(taskInput.extend({ checks: z.array(z.string().max(40)).max(100) }))
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "CHECKLIST_UPDATED",
        (state) => {
          const task = taskById(state.tasks, input.taskId, input.version);
          ownTask(task, ctx.workforceUserId);
          if (
            task.status !== "IN_PROGRESS" ||
            input.checks.some((k) => !checklistKeys(task).includes(k))
          )
            throw new Error("Nieprawidłowa checklista");
          task.checks = [...new Set(input.checks)];
          task.version++;
          return { success: true };
        },
        input.taskId,
      ),
    ),
  addPhoto: authorized
    .input(
      taskInput.extend({
        category: z.enum(["kitchen", "room", "bathroom", "extra"]),
        photo: photoSchema,
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "TASK_PHOTO_ADDED",
        async (state, tx) => {
          const task = taskById(state.tasks, input.taskId, input.version);
          const userId = ownTask(task, ctx.workforceUserId);
          if (task.status !== "IN_PROGRESS" || task.photos.length >= 12)
            throw new Error(
              "Zdjęcia można dodać podczas sprzątania, maksymalnie 12.",
            );
          const asset = await tx.cleaningAsset.create({
            data: {
              workspaceId: cleaningAccountId(),
              taskId: task.id,
              userId,
              category: input.category,
              data: input.photo,
            },
            select: { id: true },
          });
          task.photos.push({ id: asset.id, category: input.category });
          task.version++;
          return { success: true };
        },
        input.taskId,
      ),
    ),
  photo: authorized
    .input(z.object({ id: z.string().max(100) }))
    .query(async ({ ctx, input }) => {
      const { state, accountId } = await readWorkforce(ctx.db),
        asset = await ctx.db.cleaningAsset.findUnique({
          where: { id: input.id },
        });
      if (
        asset?.workspaceId !== accountId ||
        !state.tasks.some(
          (t) =>
            t.id === asset.taskId &&
            (ctx.workforceManager ||
              (t.userId === ctx.workforceUserId &&
                asset.userId === ctx.workforceUserId)),
        )
      )
        throw new TRPCError({ code: "NOT_FOUND" });
      return { data: asset.data };
    }),
  complete: authorized.input(taskInput).mutation(({ ctx, input }) =>
    changeWorkforce(
      ctx.db,
      ctx.workforceActor,
      "TASK_COMPLETED",
      (state) => {
        const task = taskById(state.tasks, input.taskId, input.version),
          userId = ownTask(task, ctx.workforceUserId),
          instant = new Date().toISOString();
        completeTask(task, userId, localNow(), instant);
        if (
          !state.ledger.some((l) => l.kind === "EARN" && l.taskId === task.id)
        )
          state.ledger.push({
            id: crypto.randomUUID(),
            userId,
            kind: "EARN",
            cents: task.rewardCents,
            points: task.rewardPoints,
            stars: 0,
            taskId: task.id,
            status: "COMPLETED",
            createdAt: instant,
            updatedAt: instant,
            option: null,
          });
        return {
          success: true,
          rewardCents: task.rewardCents,
          rewardPoints: task.rewardPoints,
        };
      },
      input.taskId,
    ),
  ),
  configureTask: manager
    .input(
      taskInput.extend({
        rewardCents: z.number().int().min(0).max(100000),
        rewardPoints: z.number().int().min(0).max(10000),
        extraItems: z.array(z.string().trim().min(2).max(200)).max(30),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "TASK_CONFIGURED",
        (state) => {
          const task = taskById(state.tasks, input.taskId, input.version);
          if (["IN_PROGRESS", "DONE"].includes(task.status))
            throw new Error("Nie można zmienić rozpoczętego zadania.");
          task.rewardCents = input.rewardCents;
          task.rewardPoints = input.rewardPoints;
          task.extraItems = input.extraItems;
          task.version++;
          return { success: true };
        },
        input.taskId,
      ),
    ),
  requestPayout: authorized
    .input(z.object({ cents: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PAYOUT_REQUESTED",
        (state) => {
          const userId = ctx.workforceUserId;
          if (!userId || balance(state.ledger, userId).cents < input.cents)
            throw new Error("Niewystarczające środki do wypłaty.");
          const now = new Date().toISOString();
          state.ledger.push({
            id: crypto.randomUUID(),
            userId,
            kind: "PAYOUT",
            cents: -input.cents,
            points: 0,
            stars: 0,
            taskId: null,
            status: "REQUESTED",
            createdAt: now,
            updatedAt: now,
            option: null,
          });
          return { success: true };
        },
      ),
    ),
  redeem: authorized
    .input(
      z.object({ option: z.enum(["cash10", "cash50", "cash100", "star"]) }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "POINTS_REDEEMED",
        (state) => {
          const userId = ctx.workforceUserId,
            reward = REWARDS.find((r) => r.id === input.option)!;
          if (!userId || balance(state.ledger, userId).points < reward.cost)
            throw new Error("Niewystarczająca liczba punktów.");
          const date = localNow().slice(0, reward.period === "year" ? 4 : 7);
          if (
            state.ledger.some(
              (l) =>
                l.userId === userId &&
                l.kind === "REDEEM" &&
                l.option === reward.id &&
                l.status !== "REJECTED" &&
                localNow(new Date(l.createdAt)).startsWith(date),
            )
          )
            throw new Error(
              "Ten wariant wymiany został już wykorzystany w tym okresie.",
            );
          const now = new Date().toISOString();
          state.ledger.push({
            id: crypto.randomUUID(),
            userId,
            kind: "REDEEM",
            cents: reward.cents,
            points: -reward.cost,
            stars: reward.stars,
            taskId: null,
            status: "COMPLETED",
            createdAt: now,
            updatedAt: now,
            option: reward.id,
          });
          return { success: true };
        },
      ),
    ),
  payoutStatus: manager
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["APPROVED", "COMPLETED", "REJECTED"]),
      }),
    )
    .mutation(({ ctx, input }) =>
      changeWorkforce(
        ctx.db,
        ctx.workforceActor,
        "PAYOUT_STATUS_CHANGED",
        (state) => {
          const entry = state.ledger.find(
            (l) => l.id === input.id && l.kind === "PAYOUT",
          );
          if (
            !entry ||
            !(
              (entry.status === "REQUESTED" &&
                ["APPROVED", "REJECTED"].includes(input.status)) ||
              (entry.status === "APPROVED" &&
                ["COMPLETED", "REJECTED"].includes(input.status))
            )
          )
            throw new Error("Nieprawidłowa zmiana statusu wypłaty.");
          entry.status = input.status;
          entry.updatedAt = new Date().toISOString();
          return { success: true };
        },
      ),
    ),
});
