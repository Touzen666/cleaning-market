import { postRouter } from "@/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { contactRouter } from "@/server/api/routers/contact.router";
import { reservationsRouter } from "@/server/api/routers/reservations";
import { apartmentsRouter } from "@/server/api/routers/apartments";
import { guestAuthRouter } from "@/server/api/routers/guest-auth";
import { checkInRouter } from "@/server/api/routers/check-in";
import { guestCheckinRouter } from "@/server/api/routers/guest-checkin";
import { leadApplicationRouter } from "@/server/api/routers/lead-application";
import { apartmentOwnersRouter } from "@/server/api/routers/apartment-owners";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    post: postRouter,
    contact: contactRouter,
    reservation: reservationsRouter,
    apartments: apartmentsRouter,
    guestAuth: guestAuthRouter,
    checkIn: checkInRouter,
    guestCheckin: guestCheckinRouter,
    leadApplication: leadApplicationRouter,
    apartmentOwners: apartmentOwnersRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
