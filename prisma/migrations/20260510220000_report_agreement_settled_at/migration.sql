-- AlterTable
ALTER TABLE "MonthlyReport" ADD COLUMN "agreementSettledAt" TIMESTAMP(3);

-- Istniejące raporty już w statusie zamknięcia umowy — data odliczenia archiwum
UPDATE "MonthlyReport"
SET "agreementSettledAt" = COALESCE("updatedAt", "createdAt")
WHERE "status" = 'AGREEMENT_SETTLED';
