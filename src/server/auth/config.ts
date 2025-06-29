import { PrismaAdapter, } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig, type User, type Session, } from "next-auth";
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
    async session({ session, user }: { session: Session; user: User | AdapterUser }) {
      if (session.user && user.id) {
        session.user.id = user.id;

        // Get full user data with type from database
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: { type: true }
        });

        session.user.type = dbUser?.type ?? "UNKNOWN";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  session: {
    strategy: "database" as const,
  },
};
