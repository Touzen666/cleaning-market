-- CreateEnum
CREATE TYPE "TerminationCostSide" AS ENUM ('HOST_COMPANY', 'OWNER_SIDE');

-- CreateTable
CREATE TABLE "ReportTerminationCost" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "side" "TerminationCostSide" NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "countsTowardOwnerTaxBase" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReportTerminationCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportTerminationCost_reportId_order_idx" ON "ReportTerminationCost"("reportId", "order");

-- AddForeignKey
ALTER TABLE "ReportTerminationCost" ADD CONSTRAINT "ReportTerminationCost_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
