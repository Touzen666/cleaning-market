import { PrismaAdapter, } from "@auth/prisma-adapter";
import { type DefaultSession, type User, type Session, type Account, type Profile, type NextAuthConfig } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import { type AdapterUser } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import { type UserType } from "@prisma/client";

import { db } from "@/server/db";
import { env } from "@/env";
import { type JWT } from "next-auth/jwt";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
      role?: string; // For admin login as owner functionality
      isSuperAdmin?: boolean; // For admin login as owner functionality
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  interface User {
    type: UserType;
    // ...other properties
    // role: UserRole;
  }
}

/**
 * Module augmentation for `next-auth/adapters` to add the type property to AdapterUser
 */
declare module "next-auth/adapters" {
  interface AdapterUser {
    type: UserType;
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig: NextAuthConfig = {
  // allow running behind Vercel proxy/custom domain
  trustHost: true,
  // Ensure type compatibility due to @auth/core resolution across packages
  adapter: PrismaAdapter(db) as unknown as Adapter,
  providers: [
    DiscordProvider({
      clientId: env.AUTH_DISCORD_ID,
      clientSecret: env.AUTH_DISCORD_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async signIn(params: {
      user: User | AdapterUser;
      account?: Account | null;
      profile?: Profile;
      email?: { verificationRequest?: boolean };
      credentials?: Record<string, unknown>;
    }) {
      const { user, account, profile } = params;
      // Only allow Discord authentication for authorized admins
      if (account?.provider === "discord") {
        const adminEmails = [
          process.env.ADMIN_EMAIL ?? "ochedowski.bartosz@gmail.com",
          "biuro@zlote-wynajmy.com",
          "koordynatorzy@zlote-wynajmy.com"
        ];

        // Check if user has one of the authorized admin emails
        const isAdminEmail = adminEmails.includes(user.email ?? "");

        // For the main admin (Bartosz), also check the name
        const isMainAdmin = user.email === (process.env.ADMIN_EMAIL ?? "ochedowski.bartosz@gmail.com");
        const discordProfile = profile as { global_name?: string; username?: string } | undefined;
        const isNameBartosz = discordProfile?.global_name?.includes("Bartosz") ??
          discordProfile?.username?.includes("Bartosz") ??
          user.name?.includes("Bartosz") ??
          false;

        // Main admin needs both email and name check, other admins only need email
        const isAuthorized = isAdminEmail && (isMainAdmin ? isNameBartosz : true);

        if (!isAuthorized) {
          console.log(`Authentication rejected for ${user.email ?? 'unknown'} (${user.name ?? 'unknown'})`);
          return false; // Reject sign in
        }

        console.log(`Admin authentication successful for ${user.email ?? 'unknown'}`);
        return true;
      }

      return true; // Allow other providers (if any)
    },
    // With JWT sessions, persist user data in token then copy to session
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: User | AdapterUser;
    }) {
      // On initial sign-in, 'user' is defined
      if (user) {
        token.sub = user.id;
        // fetch type from DB
        try {
          const dbUser = await db.user.findUnique({
            where: { id: user.id },
            select: { type: true },
          });
          (token as unknown as { type?: UserType }).type =
            dbUser?.type ?? "ADMIN";
        } catch {
          (token as unknown as { type?: UserType }).type = "ADMIN";
        }
      }
      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { type?: UserType };
    }) {
      if (session.user) {
        if (typeof token.sub === "string") {
          session.user.id = token.sub;
        }
        const t = token.type;
        session.user.type =
          t === "ADMIN" || t === "OWNER" || t === "GUEST" ? t : "ADMIN";
      }
      return session;
    },
  },
  // Prefer AUTH_SECRET from env schema; compatible with our validated config
  secret: env.AUTH_SECRET,
  session: {
    // Avoid Prisma access from edge contexts by using JWT sessions
    strategy: "jwt",
  },
};
