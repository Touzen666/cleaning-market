import NextAuth from "next-auth";
import { type User, type Session } from "next-auth";
import { type AdapterUser } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { authConfig } from '@/server/auth/config'; // Zakładamy, że auth.config.ts jest w głównym katalogu projektu


const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
