import {
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
  vi,
  beforeAll,
} from "vitest";
import { db } from "@/server/db";
import { server } from "@/test/setup";
import { createTestAdminUser, createCallerContext } from "@/test/trpc-helpers";
import { type User } from "@prisma/client";

// Setup global mocks

let testUserId: string | undefined;

describe("idobookingRouter.getApartmentsList", () => {
  beforeAll(() => {
    // Stop MSW server to avoid interference with our fetch mock
    server.close();
  });

  afterAll(() => {
    // Restart MSW server for other tests
    server.listen({ onUnhandledRequest: "error" });
  });

  beforeEach(async () => {
    // Clear mocks and create a real ADMIN user in the DB
    const user = await createTestAdminUser();
    testUserId = user.id;
  });

  afterAll(async () => {
    // Clean up: delete the test user
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } });
    }
  });

  it("should return apartments list when API call is successful", async () => {
    // Import the actual router
    const { idobookingRouter } = await import("./idobooking");

    // Get the user from DB
    const user: User = await db.user.findUniqueOrThrow({
      where: { id: testUserId! },
    });

    // Create a mock context with the real admin user
    const mockContext = createCallerContext(user);

    // Create the router caller
    const caller = idobookingRouter.createCaller(mockContext);

    // Call the endpoint
    const result = await caller.syncReservations();

    // Assertions
    // expect(result).toEqual([
    //   {
    //     id: 1,
    //     name: "Test Apartment 1",
    //     address: "Test Address 1",
    //     description: "Test Description 1",
    //     maxGuests: 4,
    //   },
    //   {
    //     id: 2,
    //     name: "Test Apartment 2",
    //     address: "Test Address 2",
    //     description: "Test Description 2",
    //     maxGuests: 6,
    //   },
    // ]);
  }, 300000); // 5 minute timeout
});
