import { db } from "@/server/db";
import { vi } from "vitest";
import { type User, type UserType } from "@prisma/client";

/**
 * Creates a test admin user in the DB and returns the user object.
 */
export async function createTestAdminUser(): Promise<User> {
  const user = await db.user.create({
    data: {
      name: "Test Admin",
      email: `test-admin-${Date.now()}@example.com`,
      type: "ADMIN",
    },
  });
  return user;
}

/**
 * Creates a tRPC caller context for a given user.
 * Accepts a Prisma User object (email may be null).
 */
export function createCallerContext(user: User) {
  return {
    db,
    session: {
      user: {
        id: user.id,
        type: user.type,
        email: user.email ?? "test@example.com",
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    headers: new Headers(),
  };
}

/**
 * Mocks Next.js/NextAuth modules and fetch globally. Call at the top of test files.
 * Returns the fetch mock for further configuration.
 */
export function setupGlobalTestMocks() {
  vi.mock("next/server", () => ({
    NextRequest: class MockNextRequest {},
    NextResponse: {
      json: vi.fn(),
    },
  }));

  vi.mock("next-auth", () => ({
    default: vi.fn(() => ({
      auth: vi.fn(),
      handlers: {},
      signIn: vi.fn(),
      signOut: vi.fn(),
    })),
    getServerSession: vi.fn(),
  }));

  vi.mock("@/server/auth", () => ({
    auth: vi.fn(),
    handlers: {},
    signIn: vi.fn(),
    signOut: vi.fn(),
  }));

  const mockFetch = vi.fn();
  global.fetch = mockFetch;
  return mockFetch;
}
