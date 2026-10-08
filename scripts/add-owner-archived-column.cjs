/**
 * Dodaje kolumnę ApartmentOwner.archived, gdy `prisma migrate deploy` jest zablokowany
 * przez starszą nieudaną migrację w historii bazy.
 *
 * Używa DIRECT_URL (port sesji), tak jak scripts/prisma-migrate-direct.mjs.
 */
const { readFileSync, existsSync } = require("node:fs");
const { resolve } = require("node:path");
const { PrismaClient } = require("@prisma/client");

const envPath = resolve(__dirname, "..", ".env");
if (!existsSync(envPath)) {
  console.error("Brak pliku .env");
  process.exit(1);
}

for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  if (process.env[key] == null) process.env[key] = val;
}

if (!process.env.DIRECT_URL) {
  console.error("Ustaw DIRECT_URL w .env");
  process.exit(1);
}

process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "ApartmentOwner" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "ApartmentOwner_archived_idx" ON "ApartmentOwner"("archived")',
  );
  const rows = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type, column_default
     FROM information_schema.columns
     WHERE table_name = 'ApartmentOwner' AND column_name = 'archived'`,
  );
  console.log("Kolumna archived:", JSON.stringify(rows));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
