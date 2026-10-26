import { afterEach, describe, expect, it, vi } from "vitest";
import { configFromEnv } from "./operations";

afterEach(() => vi.unstubAllEnvs());

function configure() {
  vi.stubEnv("IDOBOOKING_PASSWORD", "fixture-password");
  vi.stubEnv("IDOBOOKING_BASE_URL", "https://booking.example.test");
  vi.stubEnv("IDOBOOKING_LOGIN", undefined);
  vi.stubEnv("IDOBOOKING_USER", undefined);
}

describe("iDoBooking production configuration", () => {
  it("accepts the existing production IDOBOOKING_USER variable", () => {
    configure();
    vi.stubEnv("IDOBOOKING_USER", "production-fixture");
    expect(configFromEnv()).toMatchObject({
      login: "production-fixture",
      baseUrl: "https://booking.example.test",
    });
  });

  it("preserves the explicit IDOBOOKING_LOGIN override", () => {
    configure();
    vi.stubEnv("IDOBOOKING_USER", "legacy-fixture");
    vi.stubEnv("IDOBOOKING_LOGIN", "explicit-fixture");
    expect(configFromEnv().login).toBe("explicit-fixture");
  });

  it("uses the production variable when the override is empty", () => {
    configure();
    vi.stubEnv("IDOBOOKING_USER", "production-fixture");
    vi.stubEnv("IDOBOOKING_LOGIN", "");
    expect(configFromEnv().login).toBe("production-fixture");
  });

  it("fails closed without a login or password", () => {
    configure();
    expect(() => configFromEnv()).toThrow("IDOBOOKING_USER");
    vi.stubEnv("IDOBOOKING_USER", "production-fixture");
    vi.stubEnv("IDOBOOKING_PASSWORD", undefined);
    expect(() => configFromEnv()).toThrow("IDOBOOKING_PASSWORD");
  });

  it("continues to reject insecure or credential-bearing upstream URLs", () => {
    configure();
    vi.stubEnv("IDOBOOKING_USER", "production-fixture");
    for (const url of [
      "http://booking.example.test",
      "https://user:secret@booking.example.test",
      "https://booking.example.test/path",
    ]) {
      vi.stubEnv("IDOBOOKING_BASE_URL", url);
      expect(() => configFromEnv()).toThrow("HTTPS origin");
    }
  });
});
