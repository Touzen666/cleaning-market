-- AlterTable
ALTER TABLE "MonthlyReport" ADD COLUMN     "fixedPayoutProrateEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fixedPayoutActiveDays" INTEGER;
