// Usage: node tools/findReport.js <reportId>
import { PrismaClient } from "@prisma/client";

async function main() {
  const reportId = process.argv[2];
  if (!reportId) {
    console.error("Usage: node tools/findReport.js <reportId>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const monthly = await prisma.monthlyReport.findUnique({
      where: { id: reportId },
      select: { id: true, apartmentId: true, year: true, month: true, status: true },
    });
    const historical = await prisma.historicalReport.findFirst({
      where: { OR: [{ id: reportId }, { originalReportId: reportId }] },
      select: { id: true, originalReportId: true, apartmentId: true, year: true, month: true, status: true },
    });
    const result = {
      inputId: reportId,
      monthly: monthly ?? null,
      historical: historical ?? null,
      location: monthly ? "MonthlyReport" : historical ? "HistoricalReport" : "NotFound",
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("Error querying database:", message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();


