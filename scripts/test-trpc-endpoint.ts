import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testTRPCEndpoint() {
    try {
        const reportId = 'e6441539-e007-4ee9-96f9-39e6409768ae';

        console.log('🔍 Testing tRPC endpoint for report ID:', reportId);

        // Symulacja endpointu getHistoricalById
        const report = await prisma.historicalReport.findUnique({
            where: { id: reportId },
            include: {
                apartment: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        defaultRentAmount: true,
                        defaultUtilitiesAmount: true,
                        weeklyLaundryCost: true,
                        cleaningSuppliesCost: true,
                        capsuleCostPerGuest: true,
                        wineCost: true,
                        cleaningCosts: true,
                        paymentType: true,
                        fixedPaymentAmount: true
                    },
                },
                owner: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        vatOption: true,
                    },
                },
                createdByAdmin: {
                    select: { name: true, email: true },
                },
                approvedByAdmin: {
                    select: { name: true, email: true },
                },
                sentByAdmin: {
                    select: { name: true, email: true },
                },
                deletedByAdmin: {
                    select: { name: true, email: true },
                },
                items: {
                    include: {
                        reservation: {
                            select: { id: true, guest: true, start: true, end: true, source: true, adults: true, children: true, status: true },
                        },
                    },
                    orderBy: [{ type: "asc" }, { date: "asc" }],
                },
                additionalDeductions: {
                    orderBy: { order: "asc" },
                },
            },
        });

        if (report) {
            console.log('✅ tRPC endpoint would return report successfully');
            console.log('📊 Report summary:', {
                id: report.id,
                month: report.month,
                year: report.year,
                status: report.status,
                apartmentName: report.apartment.name,
                ownerName: `${report.owner.firstName} ${report.owner.lastName}`,
                itemsCount: report.items.length,
                deductionsCount: report.additionalDeductions.length,
                deletedAt: report.deletedAt,
                deletionReason: report.deletionReason
            });
        } else {
            console.log('❌ tRPC endpoint would return null');
        }

    } catch (error) {
        console.error('❌ Error testing tRPC endpoint:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void testTRPCEndpoint();
