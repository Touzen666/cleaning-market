import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany();
        console.log('Admin users:', users.map(u => ({ id: u.id, email: u.email, name: u.name })));

        const owners = await prisma.apartmentOwner.findMany();
        console.log('Owners:', owners.map(o => ({ id: o.id, email: o.email, firstName: o.firstName, lastName: o.lastName })));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

void checkUsers(); 