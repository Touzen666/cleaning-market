import NextAuth from "next-auth";
import { authConfig } from '@/server/auth/config'; // Zakładamy, że auth.config.ts jest w głównym katalogu projektu

// Force Node.js and disable caching for auth
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
