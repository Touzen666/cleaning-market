import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

const leadApplicationInput = z.object({
    firstName: z.string().min(1, "Imię jest wymagane"),
    lastName: z.string().min(1, "Nazwisko jest wymagane"),
    phone: z.string().optional(),
    email: z.string().email("Nieprawidłowy adres email"),
    message: z.string().optional(),
    apartmentId: z.number().optional(),
});

export const leadApplicationRouter = createTRPCRouter({
    create: publicProcedure
        .input(leadApplicationInput)
        .mutation(async ({ input, ctx }) => {
            try {
                const leadApplication = await ctx.db.leadApplication.create({
                    data: {
                        name: input.firstName,
                        surname: input.lastName,
                        phone: input.phone ?? '',
                        email: input.email,
                        message: input.message ?? null,
                    }
                });

                return {
                    success: true,
                    data: leadApplication,
                    message: 'Lead application created successfully'
                };

            } catch (error) {
                console.error('Error creating lead application:', error);
                throw new Error('Failed to create lead application');
            }
        }),
}); 