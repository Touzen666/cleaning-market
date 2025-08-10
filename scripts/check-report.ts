import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkReport() {
    try {
        const reportId = 'e6441539-e007-4ee9-96f9-39e6409768ae';

        console.log('🔍 Checking for report with ID:', reportId);

        // Check if report exists in MonthlyReport table
        const monthlyReport = await prisma.monthlyReport.findUnique({
            where: { id: reportId },
            select: {
                id: true,
                month: true,
                year: true,
                status: true,
                apartmentId: true,
                ownerId: true,
                createdAt: true,
            }
        });

        if (monthlyReport) {
            console.log('✅ Report found in MonthlyReport table:', monthlyReport);
        } else {
            console.log('❌ Report not found in MonthlyReport table');
        }

        // Check if report exists in HistoricalReport table
        const historicalReport = await prisma.historicalReport.findUnique({
            where: { id: reportId },
            select: {
                id: true,
                month: true,
                year: true,
                status: true,
                apartmentId: true,
                ownerId: true,
                createdAt: true,
                deletedAt: true,
                deletionReason: true,
            }
        });

        if (historicalReport) {
            console.log('✅ Report found in HistoricalReport table:', historicalReport);
        } else {
            console.log('❌ Report not found in HistoricalReport table');
        }

        // Check all reports to see if there are any similar IDs
        const allMonthlyReports = await prisma.monthlyReport.findMany({
            select: {
                id: true,
                month: true,
                year: true,
                status: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        console.log('📋 Recent MonthlyReports:', allMonthlyReports);

        const allHistoricalReports = await prisma.historicalReport.findMany({
            select: {
                id: true,
                month: true,
                year: true,
                status: true,
                deletedAt: true,
            },
            take: 10,
            orderBy: { createdAt: 'desc' }
        });

        console.log('📋 Recent HistoricalReports:', allHistoricalReports);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void checkReport();
