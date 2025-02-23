import {z} from "zod";

import {createTRPCRouter, protectedProcedure, publicProcedure,} from "@/server/api/trpc";

export const postRouter = createTRPCRouter({
    getAll: protectedProcedure.query(async ({ctx}) => {
        return ctx.db.post.findMany({
            where: {createdBy: {id: ctx.session.user.id}}, // Pobieraj tylko posty zalogowanego użytkownika
            orderBy: {createdAt: "desc"}, // Sortuj od najnowszych
        });
    }),

    hello: publicProcedure
        .input(z.object({text: z.string()}))
        .query(({input}) => {
            return {
                greeting: `Hello ${input.text}`,
            };
        }),

    create: protectedProcedure
        .input(z.object({title: z.string().min(1)}))
        .mutation(async ({ctx, input}) => {
            return ctx.db.post.create({
                data: {
                    title: input.title,
                    createdBy: {connect: {id: ctx.session.user.id}},
                },
            });
        }),

    getLatest: protectedProcedure.query(async ({ctx}) => {
        const post = await ctx.db.post.findFirst({
            orderBy: {createdAt: "desc"},
            where: {createdBy: {id: ctx.session.user.id}},
        });

        return post ?? null;
    }),

    getSecretMessage: protectedProcedure.query(() => {
        return "you can now see this secret message!";
    }),
});
