import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOwner() {
    try {
        // First, get the admin user
        const adminUser = await prisma.user.findFirst({
            where: { email: 'admin@example.com' }
        });

        if (!adminUser) {
            console.error('Admin user not found. Please run the seed script first.');
            return;
        }

        const owner = await prisma.apartmentOwner.create({
            data: {
                email: 'ochedowski.bartosz@gmail.com',
                firstName: 'Bartosz',
                lastName: 'Ochedowski',
                phone: '+48 123 456 789',
                isActive: true,
                isFirstLogin: true,
                paymentType: 'COMMISSION',
                vatOption: 'NO_VAT',
                createdByAdminId: adminUser.id,
                temporaryPassword: 'temp123456',
                temporaryPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            },
        });

        console.log('Owner created successfully:', owner);
        console.log('Temporary password: temp123456');
        console.log('Email: ochedowski.bartosz@gmail.com');
        console.log('You can now log in with these credentials');
    } catch (error) {
        console.error('Error creating owner:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void createOwner(); 