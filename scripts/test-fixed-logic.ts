import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFixedLogic() {
    try {
        const reportId = 'e6441539-e007-4ee9-96f9-39e6409768ae';

        console.log('🔍 Testing fixed logic for report ID:', reportId);

        // Test 1: Check if report exists in MonthlyReport (should fail)
        console.log('\n📋 Test 1: Checking MonthlyReport table...');
        const monthlyReport = await prisma.monthlyReport.findUnique({
            where: { id: reportId },
            select: { id: true, month: true, year: true, status: true }
        });

        if (monthlyReport) {
            console.log('❌ Unexpected: Report found in MonthlyReport table');
        } else {
            console.log('✅ Expected: Report not found in MonthlyReport table');
        }

        // Test 2: Check if report exists in HistoricalReport (should succeed)
        console.log('\n📋 Test 2: Checking HistoricalReport table...');
        const historicalReport = await prisma.historicalReport.findUnique({
            where: { id: reportId },
            select: {
                id: true,
                month: true,
                year: true,
                status: true,
                deletedAt: true,
                deletionReason: true,
                apartment: { select: { name: true } },
                owner: { select: { firstName: true, lastName: true } }
            }
        });

        if (historicalReport) {
            console.log('✅ Expected: Report found in HistoricalReport table');
            console.log('📊 Report details:', {
                id: historicalReport.id,
                month: historicalReport.month,
                year: historicalReport.year,
                status: historicalReport.status,
                apartmentName: historicalReport.apartment.name,
                ownerName: `${historicalReport.owner.firstName} ${historicalReport.owner.lastName}`,
                deletedAt: historicalReport.deletedAt,
                deletionReason: historicalReport.deletionReason
            });
        } else {
            console.log('❌ Unexpected: Report not found in HistoricalReport table');
        }

        // Test 3: Simulate the application logic
        console.log('\n📋 Test 3: Simulating application logic...');

        // Simulate reportQuery.isError = true (report not found in MonthlyReport)
        const reportQueryError = !monthlyReport;
        console.log('📊 reportQuery.isError:', reportQueryError);

        // Simulate status === "authenticated" = true (user is logged in)
        const isAuthenticated = true;
        console.log('📊 status === "authenticated":', isAuthenticated);

        // Simulate historicalReportQuery.enabled condition
        const historicalQueryEnabled = !!reportId && reportQueryError && isAuthenticated;
        console.log('📊 historicalReportQuery.enabled:', historicalQueryEnabled);

        if (historicalQueryEnabled) {
            console.log('✅ Historical report query would be enabled');
            if (historicalReport) {
                console.log('✅ Historical report would be successfully retrieved');
                console.log('✅ Application would display historical report with "Zarchiwizowany i anulowany" badge');
            } else {
                console.log('❌ Historical report query would fail');
            }
        } else {
            console.log('❌ Historical report query would not be enabled');
        }

    } catch (error) {
        console.error('❌ Error testing fixed logic:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void testFixedLogic();
