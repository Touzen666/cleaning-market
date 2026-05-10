-- CreateEnum
CREATE TYPE "TerminationOwnerPaymentKind" AS ENUM ('REFUND', 'REVENUE');

-- AlterTable
ALTER TABLE "ReportTerminationCost" ADD COLUMN "ownerPaymentKind" "TerminationOwnerPaymentKind";

-- Istniejące pozycje po stronie właściciela: domyślnie przychód (ostrożniejsza interpretacja podatkowa)
UPDATE "ReportTerminationCost"
SET "ownerPaymentKind" = 'REVENUE'
WHERE "side" = 'OWNER_SIDE';
