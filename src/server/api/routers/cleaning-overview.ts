import { TRPCError, type inferProcedureOutput } from "@trpc/server";
import { publicProcedure } from "@/server/api/trpc";
import { getCleaningSnapshot } from "@/server/cleaning/snapshot";
import { buildCleaningOverview } from "@/server/cleaning/overview";
import { revision } from "@/server/idobooking/operations";
import { accessFor, cleaningReadInput } from "./cleaning-candidates";
import { effectiveStays } from "@/server/cleaning/workforce-domain";
import {
  decodeState,
  operationalSnapshot,
} from "@/server/cleaning/workforce-store";

/** Read-only cleaning projection. Never invokes admin sync, mappings writes or financial queries. */
export const listCleaningOverview = publicProcedure
  .use(({ ctx, next }) => {
    if (!accessFor(ctx).canPlan)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Planning access requires a coordinator",
      });
    return next();
  })
  .input(cleaningReadInput)
  .query(async ({ input, ctx }) => {
    try {
      let state = await getCleaningSnapshot(input.from, input.to, {
        forceRefresh: input.forceRefresh,
      });
      const age = Date.now() - Date.parse(state.fetchedAt);
      if (!Number.isFinite(age) || age < -60000 || age > 300000)
        throw new TRPCError({
          code: "SERVICE_UNAVAILABLE",
          message: "The reservation snapshot is stale",
        });
      if (state.from !== input.from || state.to !== input.to)
        throw new Error("Mismatched snapshot coverage");
      const localWorkspace = await ctx.db.cleaningWorkspace.findUnique({
        where: { id: state.accountId },
        select: { state: true },
      });
      if (localWorkspace) {
        const adjustments = decodeState(localWorkspace.state).adjustments;
        if (adjustments.some((a) => a.lateMinutes > 0))
          state = await operationalSnapshot(
            input.from,
            input.to,
            input.forceRefresh,
            adjustments,
          );
        state = { ...state, stays: effectiveStays(state.stays, adjustments) };
      }
      if (
        input.unitId !== undefined &&
        !state.units.some((unit) => unit.id === input.unitId)
      )
        throw new TRPCError({ code: "NOT_FOUND", message: "Unknown unitId" });
      const [apartments, archived] = await Promise.all([
        ctx.db.apartment.findMany({
          where: { archived: false },
          select: {
            id: true,
            name: true,
            idobookingId: true,
            address: true,
            images: { select: { url: true, isPrimary: true, order: true } },
            rooms: { select: { code: true } },
          },
          orderBy: { name: "asc" },
        }),
        // Only IDs are read for archived records, to prevent a name fallback resurrecting an archived unit.
        ctx.db.apartment.findMany({
          where: {
            archived: true,
            idobookingId: { in: state.units.map((unit) => unit.id) },
          },
          select: { idobookingId: true },
        }),
      ]);
      const all = buildCleaningOverview(state, {
        accountId: state.accountId,
        apartments,
        archivedUnitIds: new Set(
          archived.flatMap((apartment) =>
            apartment.idobookingId === null ? [] : [apartment.idobookingId],
          ),
        ),
      });
      const matches = (unitId: number) =>
        input.unitId === undefined || input.unitId === unitId;
      const candidates = all.candidates.filter((candidate) =>
        matches(candidate.unit.unitId),
      );
      const reviews = all.reviews.filter((candidate) =>
        matches(candidate.unit.unitId),
      );
      const excluded = all.excluded.filter((candidate) =>
        matches(candidate.unitId),
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
            (candidate) => candidate.certainty === "accepted",
          ).length,
          provisionalCandidates: candidates.filter(
            (candidate) => candidate.certainty === "provisional",
          ).length,
          reviews: reviews.length,
          excluded: excluded.length,
        },
        overview: {
          ...all.overview,
          units: all.overview.units.filter((unit) => matches(unit.unitId)),
          reservations: all.overview.reservations.filter((reservation) =>
            matches(reservation.unitId),
          ),
          locks: all.overview.locks.filter(
            (lock) =>
              input.unitId === undefined ||
              lock.unitId === input.unitId ||
              (lock.unitId === null &&
                all.overview.units.some(
                  (unit) =>
                    unit.unitId === input.unitId &&
                    unit.objectId === lock.objectId,
                )),
          ),
          mappingIssues: all.overview.mappingIssues.filter((issue) =>
            matches(issue.unitId),
          ),
        },
        source: {
          apiVersion: state.apiVersion,
          reservationsComplete: true,
          availabilityLocksComplete: true,
          catalogSource: "active-admin-readonly" as const,
        },
      };
      return { ...data, revision: revision(data), fetchedAt: state.fetchedAt };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "BAD_GATEWAY",
        message: "Could not obtain complete cleaning overview",
      });
    }
  });

export type CleaningOverviewResponse = inferProcedureOutput<
  typeof listCleaningOverview
>;
