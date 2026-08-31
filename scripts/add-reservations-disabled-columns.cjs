const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "reservationsDisabled" BOOLEAN NOT NULL DEFAULT false',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "reservationsDisabledFrom" DATE',
  );
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "reservationsDisabledTo" DATE',
  );
  console.log("Kolumny wyłączenia rezerwacji dodane lub już istnieją.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
