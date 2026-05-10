import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

// Force Node.js and disable caching for API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Pełna synchronizacja IdoBooking z panelu (tRPC `syncReservations`) trwa często 45–90+ s.
// Bez tego Vercel kończy funkcję po domyślnym limicie (~10–15 s) i klient dostaje TRPCClientError „Stream closed”.
// Limit 300 s — plan Vercel Pro (Hobby ma twardy max 10 s; wtedy sync tylko cron / `npm run sync:idobooking`).
export const maxDuration = 300;

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  return createTRPCContext({
    headers: req.headers,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
          console.error(
            `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
          );
        }
        : undefined,
  });

export { handler as GET, handler as POST };
