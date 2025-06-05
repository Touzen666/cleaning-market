import NextAuth from "next-auth";
import { type User, type Session } from "next-auth";
import { type AdapterUser } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import { authConfig } from '../../../../../auth.config'; // Zakładamy, że auth.config.ts jest w głównym katalogu projektu

const prisma = new PrismaClient();

export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async session({ session, user }: { session: Session; user: User | AdapterUser }) {
            if (session.user && user.id) {
                session.user.id = user.id;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET!,
    session: {
        strategy: "database" as const,
    },
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
const handler = NextAuth(authOptions as any);

const { handlers } = NextAuth(authConfig);

export const { GET, POST } = handlers;
