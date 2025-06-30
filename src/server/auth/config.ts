import { PrismaAdapter, } from "@auth/prisma-adapter";
import { type DefaultSession, type User, type Session, type Account, type Profile } from "next-auth";
import { type AdapterUser } from "next-auth/adapters";
import DiscordProvider from "next-auth/providers/discord";
import { type UserType } from "@prisma/client";

import { db } from "@/server/db";

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
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  adapter: PrismaAdapter(db),
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
    async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
      // Only allow Discord authentication for the main admin
      if (account?.provider === "discord") {
        const adminEmail = process.env.ADMIN_EMAIL ?? "ochedowski.bartosz@gmail.com";

        // Check if user has admin email and name Bartosz
        const isAdminEmail = user.email === adminEmail;
        const discordProfile = profile as { global_name?: string; username?: string } | undefined;
        const isNameBartosz = discordProfile?.global_name?.includes("Bartosz") ??
          discordProfile?.username?.includes("Bartosz") ??
          user.name?.includes("Bartosz") ??
          false;

        if (!isAdminEmail || !isNameBartosz) {
          console.log(`Authentication rejected for ${user.email ?? 'unknown'} (${user.name ?? 'unknown'})`);
          return false; // Reject sign in
        }

        console.log(`Admin authentication successful for ${user.email ?? 'unknown'}`);
        return true;
      }

      return true; // Allow other providers (if any)
    },
    async session({ session, user }: { session: Session; user: User | AdapterUser }) {
      if (session.user && user.id) {
        session.user.id = user.id;

        // Get full user data with type from database
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { type: true }
        });

        // Set user type as ADMIN for verified admin user
        session.user.type = dbUser?.type === "ADMIN" ? "ADMIN" : "ADMIN"; // Force ADMIN for authenticated Discord users
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: "database" as const,
  },
};
