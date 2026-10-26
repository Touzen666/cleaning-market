import { configFromEnv, systemKey } from "@/server/idobooking/operations";
const record = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new Error("Niepełne dane liczby gości");
  return v as Record<string, unknown>;
};
const count = (v: unknown, optional = false) => {
  if (optional && v == null) return 0;
  if (typeof v !== "number" && (typeof v !== "string" || !/^\d+$/.test(v))) throw new Error("Nieprawidłowa liczba gości");
  const n = Number(v);
  if (v === "" || v == null || !Number.isInteger(n) || n < 0 || n > 1000)
    throw new Error("Nieprawidłowa liczba gości");
  return n;
};
/** Only whitelisted item counts survive. Guest names, contact details and notes are never retained. */
export async function readGuestCounts(
  ids: number[],
  fetcher: typeof fetch = fetch,
) {
  const config = configFromEnv(),
    result: Record<string, number> = {};
  for (let offset = 0; offset < ids.length; offset += 100) {
    const batch = ids.slice(offset, offset + 100),
      seen = new Set<number>();
    let expected: number | undefined;
    for (let page = 1; page <= 100; page++) {
      const response = await fetcher(
        `${config.baseUrl}/api/reservations/get/${config.version}/json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json;charset=UTF-8",
            Accept: "application/json",
          },
          body: JSON.stringify({
            authenticate: {
              systemLogin: config.login,
              systemKey: systemKey(
                config.password,
                new Date(),
                config.timeZone,
              ),
              lang: "pol",
            },
            paramsSearch: { ids: batch },
            result: { page, number: 100, returnElements: ["items"] },
          }),
          signal: AbortSignal.timeout(30000),
          cache: "no-store",
          redirect: "error",
        },
      );
      if (!response.ok) throw new Error("Nie udało się odczytać liczby gości");
      const envelope = record(await response.json()),
        body = Array.isArray(envelope.reservations)
          ? envelope
          : record(envelope.result);
      if (
        (body.errors != null && (!Array.isArray(body.errors) || body.errors.length)) ||
        (envelope.errors != null && (!Array.isArray(envelope.errors) || envelope.errors.length)) ||
        body.success === false ||
        !Array.isArray(body.reservations)
      )
        throw new Error("Niepełne dane liczby gości");
      const meta = record(body.result),
        total = Number(meta.countAll);
      if (
        !Number.isInteger(total) ||
        total < 0 ||
        total > batch.length ||
        (expected !== undefined && total !== expected)
      )
        throw new Error("Niespójna lista liczby gości");
      expected = total;
      for (const raw of body.reservations) {
        const row = record(raw),
          id = Number(row.id);
        if (!batch.includes(id) || seen.has(id) || !Array.isArray(row.items))
          throw new Error("Niespójne jednostki rezerwacji");
        seen.add(id);
        for (const rawItem of row.items) {
          const item = record(rawItem),
            unitId = Number(item.objectItemId),
            key = `${id}:${unitId}`;
          if (!Number.isSafeInteger(unitId) || unitId < 1 || key in result)
            throw new Error("Niespójne jednostki rezerwacji");
          result[key] =
            count(item.numberOfAdults) +
            count(item.numberOfBigChildren, true) +
            count(item.numberOfSmallChildren, true);
        }
      }
      if (seen.size === total) break;
      if (!body.reservations.length || page === 100)
        throw new Error("Niepełna lista liczby gości");
    }
    if (seen.size !== batch.length)
      throw new Error(
        "Rezerwacje zmieniły się podczas odczytu. Odśwież ponownie.",
      );
  }
  return result;
}
