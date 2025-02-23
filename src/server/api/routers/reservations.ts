
import {createTRPCRouter, protectedProcedure} from "@/server/api/trpc";

export const reservationRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ctx}) => {
    return ctx.db.reservation.findMany({
      where: {end: { gte: new Date() }},
      orderBy: {start: "desc"}, // Sortuj od najnowszych
    });
  }),

});
