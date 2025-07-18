/*
  Warnings:

  - The `finalSettlementType` column on the `MonthlyReport` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "MonthlyReport" DROP COLUMN "finalSettlementType",
ADD COLUMN     "finalSettlementType" "SettlementType";
