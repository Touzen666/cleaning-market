import NextAuth from "next-auth";
import { authConfig } from '@/server/auth/config'; // Zakładamy, że auth.config.ts jest w głównym katalogu projektu


const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
