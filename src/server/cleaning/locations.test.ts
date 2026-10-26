import { afterEach, describe, expect, it, vi } from "vitest";
import { systemKey, type Unit } from "@/server/idobooking/operations";
import { enrichCleaningLocations } from "./locations";

const config = {
  baseUrl: "https://cleaning-source.example",
  version: "36",
  login: "synthetic-user",
  password: "synthetic-password",
  timeZone: "Europe/Warsaw",
};
const unit = (id: number, objectId = 10): Unit => ({
  id,
  objectId,
  name: "Testowy obiekt",
  code: `ROOM-${id}`,
});
const location = (
  objectId = 10,
  locationId = 20,
  address = "Testowa 1, Warszawa",
) => ({ objectId, locationId, address });
const errorMessage = "Could not obtain cleaning property locations";
type Request = {
  authenticate: { systemLogin: string; systemKey: string; lang: string };
  paramsSearchObjectLocation: { objects: { id: number }[] };
  result?: unknown;
};

function request(
  fetcher: ReturnType<typeof vi.fn<typeof fetch>>,
  index = 0,
): Request {
  const body = fetcher.mock.calls[index]?.[1]?.body;
  if (typeof body !== "string")
    throw new Error("Expected a serialized JSON request");
  return JSON.parse(body) as Request;
}

afterEach(() => vi.useRealTimers());

describe("cleaning source locations", () => {
  it("uses the documented read-only JSON method and the Warsaw daily key with one request per object", async () => {
    const now = new Date("2026-10-25T23:30:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(now);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        success: true,
        errors: [],
        objectLocations: [location()],
      }),
    );
    const result = await enrichCleaningLocations(
      config,
      [unit(1), unit(2)],
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "https://cleaning-source.example/api/objects/getLocation/36/json",
    );
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      cache: "no-store",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json;charset=UTF-8",
      },
    });
    expect(fetcher.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(request(fetcher)).toEqual({
      authenticate: {
        systemLogin: config.login,
        systemKey: systemKey(config.password, now, config.timeZone),
        lang: "pol",
      },
      paramsSearchObjectLocation: { objects: [{ id: 10 }] },
    });
    expect(request(fetcher)).not.toHaveProperty("result");
    expect(result).toEqual(
      [1, 2].map((id) => ({
        ...unit(id),
        mapping: "source-id",
        locationStatus: "known",
        locationId: 20,
        address: "Testowa 1, Warszawa",
      })),
    );
    expect(result.map((item) => item.id)).toEqual([1, 2]);
  });

  it("reads a result envelope and joins by objectId even when response rows have a different order", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        result: {
          success: true,
          objectLocations: [
            location(11, 21, "Druga 2"),
            { objectId: "10", locationId: "20", address: "  Pierwsza 1  " },
          ],
        },
      }),
    );
    const result = await enrichCleaningLocations(
      config,
      [unit(7, 10), unit(8, 11)],
      fetcher,
    );
    expect(
      result.map((item) => ({
        id: item.id,
        objectId: item.objectId,
        address: item.address,
        locationId: item.locationId,
      })),
    ).toEqual([
      { id: 7, objectId: 10, address: "Pierwsza 1", locationId: 20 },
      { id: 8, objectId: 11, address: "Druga 2", locationId: 21 },
    ]);
  });

  it("does not reuse legacy admin identities, addresses or property exclusion flags", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ objectLocations: [] }));
    const source = {
      ...unit(7),
      apartmentId: 999,
      address: "OLD ADMIN ADDRESS",
      mapping: "id" as const,
      archived: true,
      disabled: true,
      disabledFrom: "2026-01-01",
      disabledTo: "2026-12-31",
    };
    const result = await enrichCleaningLocations(config, [source], fetcher);
    expect(result).toEqual([
      { ...unit(7), mapping: "source-id", locationStatus: "missing" },
    ]);
    expect(source.apartmentId).toBe(999);
    expect(result[0]).not.toHaveProperty("apartmentId");
    expect(result[0]).not.toHaveProperty("address");
    expect(result[0]).not.toHaveProperty("archived");
  });

  it.each([
    ["absent row", []],
    ["empty address", [location(10, 20, "")]],
    ["whitespace address", [location(10, 20, "   ")]],
  ])(
    "marks a %s as missing instead of inventing an address",
    async (_name, rows) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ objectLocations: rows }));
      const result = await enrichCleaningLocations(config, [unit(7)], fetcher);
      expect(result).toEqual([
        { ...unit(7), mapping: "source-id", locationStatus: "missing" },
      ]);
      expect(result[0]).not.toHaveProperty("locationId");
    },
  );

  it.each([
    ["repeated identical rows", [location(), location()]],
    ["different addresses", [location(), location(10, 21, "Inny adres 2")]],
    [
      "same address with different location IDs",
      [location(), location(10, 21)],
    ],
    ["empty and populated address", [location(10, 20, ""), location()]],
  ])(
    "marks %s as ambiguous without choosing the first response row",
    async (_name, rows) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ objectLocations: rows }));
      const result = await enrichCleaningLocations(
        config,
        [unit(7), unit(8)],
        fetcher,
      );
      expect(result).toEqual(
        [7, 8].map((id) => ({
          ...unit(id),
          mapping: "source-id",
          locationStatus: "ambiguous",
        })),
      );
      expect(result[0]).not.toHaveProperty("locationId");
      expect(result[0]).not.toHaveProperty("address");
    },
  );

  it("batches no more than 100 unique object IDs without adding undocumented pagination", async () => {
    const units = Array.from({ length: 205 }, (_, index) =>
      unit(index + 1, index + 1000),
    );
    units.push(unit(999, 1000));
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => Response.json({ objectLocations: [] }));
    const result = await enrichCleaningLocations(config, units, fetcher);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(
      [0, 1, 2].map(
        (index) =>
          request(fetcher, index).paramsSearchObjectLocation.objects.length,
      ),
    ).toEqual([100, 100, 5]);
    expect(
      [0, 1, 2].flatMap((index) =>
        request(fetcher, index).paramsSearchObjectLocation.objects.map(
          (item) => item.id,
        ),
      ),
    ).toEqual(Array.from({ length: 205 }, (_, index) => index + 1000));
    expect(result).toHaveLength(206);
  });

  it("performs no network request for an empty native catalog", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await enrichCleaningLocations(config, [], fetcher)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses each account's URL and authentication independently without exposing them in results", async () => {
    const other = {
      ...config,
      baseUrl: "https://another-source.example",
      login: "other-user",
      password: "other-password",
      version: "34",
    };
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json({ objectLocations: [location()] }),
      );
    const first = await enrichCleaningLocations(config, [unit(7)], fetcher);
    const second = await enrichCleaningLocations(other, [unit(7)], fetcher);
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://another-source.example/api/objects/getLocation/34/json",
    );
    expect(request(fetcher, 0).authenticate.systemLogin).toBe(config.login);
    expect(request(fetcher, 1).authenticate.systemLogin).toBe(other.login);
    expect(request(fetcher, 1).authenticate.systemKey).not.toBe(
      request(fetcher, 0).authenticate.systemKey,
    );
    expect(JSON.stringify([first, second])).not.toMatch(
      /systemLogin|systemKey|password|synthetic-user|other-user/,
    );
  });

  it.each(
    [
      { success: false, objectLocations: [] },
      { success: "false", objectLocations: [] },
      {
        errors: [{ faultCode: 3, faultString: "PRIVATE ERROR" }],
        objectLocations: [],
      },
      { errors: { faultString: "PRIVATE ERROR" }, objectLocations: [] },
      { objectLocations: null },
      { objectLocations: {} },
      { result: { success: false, objectLocations: [] } },
      { errors: [{ faultCode: 3 }], result: { objectLocations: [] } },
      { objectLocations: [location(999)] },
      { objectLocations: [location(10, 0)] },
      { objectLocations: [{ ...location(), objectId: true }] },
      { objectLocations: [{ ...location(), address: null }] },
      {
        objectLocations: [
          { ...location(), locationId: Number.MAX_SAFE_INTEGER + 1 },
        ],
      },
      [],
      null,
    ].map((body) => ({ body })),
  )(
    "rejects a malformed, failed or unrelated response without echoing source fields: %j",
    async ({ body }) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json(body));
      await expect(
        enrichCleaningLocations(config, [unit(7)], fetcher),
      ).rejects.toThrow(errorMessage);
    },
  );

  it("suppresses HTTP bodies, invalid JSON and transport failures that may include secrets", async () => {
    const responses = [
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("PRIVATE AUTH BODY", { status: 401 })),
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response("not JSON: PRIVATE AUTH BODY", { status: 200 }),
        ),
      vi
        .fn<typeof fetch>()
        .mockRejectedValue(new Error("PRIVATE TRANSPORT AUTH")),
    ];
    for (const fetcher of responses) {
      const result = await enrichCleaningLocations(
        config,
        [unit(7)],
        fetcher,
      ).catch((error: unknown) => error);
      expect(result).toBeInstanceOf(Error);
      expect((result as Error).message).toBe(errorMessage);
      expect(String(result)).not.toContain("PRIVATE");
    }
  });

  it("does not return a partial enrichment after a later batch fails", async () => {
    const units = Array.from({ length: 101 }, (_, index) =>
      unit(index + 1, index + 1000),
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({ objectLocations: [location(1000)] }),
      )
      .mockRejectedValueOnce(new Error("PRIVATE"));
    await expect(
      enrichCleaningLocations(config, units, fetcher),
    ).rejects.toThrow(errorMessage);
  });

  it.each([
    { units: [unit(0)] },
    { units: [unit(1, -10)] },
    { units: [unit(1), unit(1, 11)] },
  ])(
    "rejects invalid or duplicate native identities before requesting metadata",
    async ({ units }) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        enrichCleaningLocations(config, units, fetcher),
      ).rejects.toThrow(errorMessage);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
});
