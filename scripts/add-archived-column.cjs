const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false'
  );
  console.log('Kolumna archived dodana lub juz istnieje.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
