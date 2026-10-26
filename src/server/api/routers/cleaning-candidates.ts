import { z } from "zod";
import { TRPCError, type inferProcedureOutput } from "@trpc/server";
import { publicProcedure } from "@/server/api/trpc";
import { getCleaningSnapshot } from "@/server/cleaning/snapshot";
import { revision, validateRange } from "@/server/idobooking/operations";
import { buildCleaningCandidates } from "@/server/cleaning/candidates";

export const cleaningReadInput = z
  .object({
    from: z.string(),
    to: z.string(),
    unitId: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    includeReviews: z.boolean().default(true),
    forceRefresh: z.boolean().default(false),
  })
  .strict()
  .superRefine((input, context) => {
    try {
      validateRange(input.from, input.to);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Use valid YYYY-MM-DD dates; to is exclusive and the range is limited to 31 days",
      });
    }
  });

type AccessContext = {
  session?: { user?: { type?: string } } | null;
  cleaningAuth?: { userId: string; role?: string };
};

export function accessFor(ctx: AccessContext) {
  // An explicit cleaning login defines the active identity in this panel. An
  // unrelated admin session in the browser must not elevate a cleaner token.
  if (ctx.cleaningAuth?.userId) {
    const role = ctx.cleaningAuth.role ?? "UNKNOWN";
    return {
      canPlan: ["CLEANING_ADMIN", "MANAGER", "ADMIN"].includes(role),
      role,
      authSource: "cleaning" as const,
    };
  }
  if (ctx.session?.user?.type === "ADMIN")
    return { canPlan: true, role: "ADMIN", authSource: "session" as const };
  if (ctx.session?.user)
    return {
      canPlan: false,
      role: ctx.session.user.type ?? "UNKNOWN",
      authSource: "session" as const,
    };
  throw new TRPCError({
    code: "UNAUTHORIZED",
    message: "Sign in to the cleaning panel",
  });
}

/** UI capability discovery uses the verified request context and never reads reservation data. */
export const cleaningAccess = publicProcedure.query(({ ctx }) =>
  accessFor(ctx),
);

export const listCleaningCandidates = publicProcedure
  .use(({ ctx, next }) => {
    if (!accessFor(ctx).canPlan) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "Planning access requires an administrator or cleaning coordinator",
      });
    }
    return next();
  })
  .input(cleaningReadInput)
  .query(async ({ input }) => {
    try {
      const state = await getCleaningSnapshot(input.from, input.to, {
        forceRefresh: input.forceRefresh,
      });
      const fetchedAt = Date.parse(state.fetchedAt);
      const age = Date.now() - fetchedAt;
      if (!Number.isFinite(fetchedAt) || age < -60000 || age > 300000) {
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message:
            "The reservation snapshot is stale; no cleaning candidates published",
        });
      }
      if (state.from !== input.from || state.to !== input.to)
        throw new Error("Mismatched snapshot coverage");
      if (
        input.unitId !== undefined &&
        !state.units.some((u) => u.id === input.unitId)
      )
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown unitId" });
      // The cleaning snapshot owns native source IDs. Do not read admin inventory,
      // reservations or finances, and do not infer a mapping from property names.
      const all = buildCleaningCandidates(state, {
        accountId: state.accountId,
      });
      // A filter must never reduce the occupancy context used by the builder.
      const candidates = all.candidates.filter(
        (c) => input.unitId === undefined || c.unit.unitId === input.unitId,
      );
      const reviews = all.reviews.filter(
        (c) => input.unitId === undefined || c.unit.unitId === input.unitId,
      );
      const excluded = all.excluded.filter(
        (c) => input.unitId === undefined || c.unitId === input.unitId,
      );
      const data = {
        schemaVersion: all.schemaVersion,
        from: all.from,
        to: all.to,
        timeZone: all.timeZone,
        policy: all.policy,
        candidates,
        reviews: input.includeReviews ? reviews : [],
        excluded,
        counts: {
          acceptedCandidates: candidates.filter(
            (c) => c.certainty === "accepted",
          ).length,
          provisionalCandidates: candidates.filter(
            (c) => c.certainty === "provisional",
          ).length,
          reviews: reviews.length,
          excluded: excluded.length,
        },
        source: {
          apiVersion: state.apiVersion,
          reservationsComplete: true,
          availabilityLocksComplete: true,
        },
      };
      return { ...data, revision: revision(data), fetchedAt: state.fetchedAt };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      // Upstream errors, auth echoes and lock notes must not reach the planning feed.
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message:
          "Could not obtain complete reservation data; no cleaning candidates published",
      });
    }
  });

export type CleaningCandidatesResponse = inferProcedureOutput<
  typeof listCleaningCandidates
>;
