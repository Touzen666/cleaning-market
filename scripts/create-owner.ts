import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createOwner() {
    try {
        // First, get the admin user
        const adminUser = await prisma.user.findFirst({
            where: { email: 'admin@example.com' }
        });

        if (!adminUser) {
            console.error('Użytkownik admin nie został znaleziony. Uruchom najpierw skrypt seed.');
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
                vatOption: 'NO_VAT',
                createdByAdminId: adminUser.id,
                temporaryPassword: 'temp123456',
                temporaryPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
            },
        });

        console.log('Właściciel utworzony pomyślnie:', owner);
        console.log('Email: ochedowski.bartosz@gmail.com');
        console.log('Tymczasowe hasło zostało ustawione i wysłane e-mailem');
        console.log('Możesz się teraz zalogować używając tymczasowego hasła');
    } catch (error) {
        console.error('Błąd podczas tworzenia właściciela:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void createOwner(); 