-- Pola dokumentacji wypowiedzenia przy raporcie rozwiązania umowy
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "agreementTerminationNoticeDate" DATE;
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "agreementTerminationNoticeParty" "TerminationCostSide";
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "agreementTerminationNoticeDocumentUrl" TEXT;
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "agreementTerminationNoticeDeliveryNote" TEXT;
