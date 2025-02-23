import {db} from "@/server/db";




async function main() {
    await db.post.create({
        data: {
            title: 'tytuł1',
            createdBy: {connect: {id: 'cm7gl1y0j0000vbfrlqbdvd7x'}},
        }
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
