import NextAuth from "next-auth";
import { authConfig } from '@/server/auth/config'; // Zakładamy, że auth.config.ts jest w głównym katalogu projektu

// Force Node.js runtime — Prisma is not supported on Edge
export const runtime = "nodejs";


const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
