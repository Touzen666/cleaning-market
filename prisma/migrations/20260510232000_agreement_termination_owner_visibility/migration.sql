ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "agreementTerminationVisibleToOwner" BOOLEAN NOT NULL DEFAULT false;
