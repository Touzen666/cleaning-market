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
import { ownerAuthRouter } from "@/server/api/routers/owner-auth";
import { monthlyReportsRouter } from "@/server/api/routers/monthly-reports";
import { idobookingRouter } from "@/server/api/routers/idobooking";
import { ownerNotesRouter } from "@/server/api/routers/owner-notes";
import { csvImportRouter } from "@/server/api/routers/csv-import";
import { emailRouter } from "@/server/api/routers/email";
import { adminDashboardRouter } from "@/server/api/routers/admin-dashboard";
import { uploadRouter } from "@/server/api/routers/upload";
import { roomsRouter } from "@/server/api/routers/rooms";

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
    ownerAuth: ownerAuthRouter,
    monthlyReports: monthlyReportsRouter,
    idobooking: idobookingRouter,
    ownerNotes: ownerNotesRouter,
    csvImport: csvImportRouter,
    email: emailRouter,
    adminDashboard: adminDashboardRouter,
    upload: uploadRouter,
    rooms: roomsRouter,
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
