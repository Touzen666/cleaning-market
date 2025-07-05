import { beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";

// Create MSW server for mocking HTTP requests
export const server = setupServer();

// Start server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());
