const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "Apartment" ADD COLUMN IF NOT EXISTS "textileCostPerReservation" DOUBLE PRECISION'
  );
  console.log('Kolumna textileCostPerReservation dodana lub juz istnieje.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
