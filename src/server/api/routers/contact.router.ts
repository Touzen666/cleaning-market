import {db} from "@/server/db";
import {createTRPCRouter, publicProcedure} from "@/server/api/trpc";
import {z} from "zod";

export const contactRouter = createTRPCRouter({
    sendMessage: publicProcedure
        .input(
            z.object({
                name: z.string().min(1, "Imię jest wymagane"),
                email: z.string().min(3, "Email musi mieć min. 3 znaki"),
                message: z.string().min(5, "Wiadomość powinna mieć min. 5 znaków"), // 🔥 Musi być w input!
            })
        )
        .mutation(async ({input}) => {
            console.log("Przyjęto wiadomość do zapisania:", input); // 🔥 Sprawdź w terminalu

            const newMessage = await db.contactMessage.create({
                data: {
                    name: input.name,
                    email: input.email,
                    message: input.message,
                },
            });

            console.log("Wiadomość zapisana w bazie:", newMessage);
            return newMessage;
        }),

    // 🔥 NOWA FUNKCJA: Pobieranie wszystkich wiadomości
    getMessages: publicProcedure.query(async () => {
        return db.contactMessage.findMany({
            orderBy: {createdAt: "desc"}, // Sortowanie od najnowszych
        });
    }),
});

