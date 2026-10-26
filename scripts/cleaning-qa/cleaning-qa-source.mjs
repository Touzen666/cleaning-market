export const cleaningAccountId = () => "isolated-memory-cleaning-qa";
const day = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Warsaw",
}).format(new Date());
const add = (n) =>
  new Date(Date.parse(day + "T12:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const units = Array.from({ length: 6 }, (_, i) => ({
  id: 100 + i,
  objectId: 200 + i,
  name: [
    "Apartament Słoneczny",
    "Apartament Ogrodowy",
    "Apartament Nad Rzeką",
    "Apartament Jasny",
    "Apartament Parkowy",
    "Apartament Tarasowy",
  ][i],
  code: String(i + 1),
  mapping: "source-id",
  address: "Adres testowy " + (i + 1),
}));
export async function getCleaningSnapshot(from, to) {
  return {
    accountId: cleaningAccountId(),
    apiVersion: "36",
    from,
    to,
    fetchedAt: new Date().toISOString(),
    timeZone: "Europe/Warsaw",
    units,
    locks: [],
    stays: units.flatMap((u, i) => [
      {
        id: 90000 + i,
        unitId: u.id,
        from: add(-2) + "T15:00",
        to: day + "T10:00",
        status: i === 5 ? "toClarify" : "accepted",
      },
      {
        id: 91000 + i,
        unitId: u.id,
        from: day + "T15:00",
        to: add(2) + "T10:00",
        status: "accepted",
      },
    ]),
  };
}
export async function readGuestCounts() {
  return Object.fromEntries(
    units.flatMap((u, i) => [
      [`${90000 + i}:${u.id}`, 2],
      [`${91000 + i}:${u.id}`, (i % 4) + 1],
    ]),
  );
}
