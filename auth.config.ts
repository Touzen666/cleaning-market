import type { NextAuthConfig, Session, User } from 'next-auth';
import { type AdapterUser } from 'next-auth/adapters';
import Discord from "next-auth/providers/discord";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const authConfig = {
    adapter: PrismaAdapter(prisma),
    providers: [
        Discord({
            clientId: process.env.DISCORD_CLIENT_ID!,
            clientSecret: process.env.DISCORD_CLIENT_SECRET!,
        }),
    ],
    pages: {
        signIn: '/login', // Upewnij się, że ta strona istnieje
    },
    session: { strategy: "database" },
    callbacks: {
        async session({ session, user }: { session: Session, user: User | AdapterUser }) {
            if (session?.user && user?.id) {
                session.user.id = user.id;
            }
            return session;
        },
        // Example of an `authorized` callback for route protection (can be in middleware too)
        /* authorized({ auth, request: { nextUrl } }) { 
            const isLoggedIn = !!auth?.user;
            const pathsToProtect = ["/apartments"]; // Add paths to protect
            const isProtected = pathsToProtect.some(path => nextUrl.pathname.startsWith(path));

            if (isProtected && !isLoggedIn) {
                const redirectUrl = new URL("/login", nextUrl.origin);
                redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname);
                return Response.redirect(redirectUrl);
            }
            return true;
        }, */
    },
    // W NextAuth.js v5 (Auth.js) sekret jest zwykle brany z zmiennej środowiskowej AUTH_SECRET
    // secret: process.env.NEXTAUTH_SECRET, // Jeśli nadal jest potrzebny jawnie
} satisfies NextAuthConfig; 