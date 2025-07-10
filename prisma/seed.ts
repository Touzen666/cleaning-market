import { db } from "@/server/db";
import { UserType } from "@prisma/client";

async function main() {
    const adminUser = await db.user.create({
        data: {
            name: "Admin",
            email: "admin@example.com",
            type: UserType.ADMIN,
        },
    });

    await db.post.create({
        data: {
            title: "tytuł1",
            createdBy: { connect: { id: adminUser.id } },
        },
    });
}

main()
    .then(async () => {
        await db.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await db.$disconnect();
        process.exit(1);
    });
