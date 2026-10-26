import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
const t = initTRPC.create({ transformer: superjson });
export const publicProcedure = t.procedure;
export const adminProcedure = t.procedure.use(({ ctx, next }) => {
  if (ctx.cleaningAuth?.role !== "MANAGER")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next();
});
export const createTRPCRouter = t.router;
