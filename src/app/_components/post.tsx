"use client";

import {useState} from "react";
import type {RouterOutputs} from "@/trpc/react";
import {api} from "@/trpc/react";
import Form from "@/app/_components/Form";
import MessagesList from "@/app/_components/MessagesList";

type Post = RouterOutputs["post"]["getAll"][0];

export function LatestPost() {
    // Pobierz wszystkie posty zamiast tylko jednego
    const {data: posts, isLoading} = api.post.getAll.useQuery();

    const utils = api.useUtils();
    const [name, setName] = useState("");

    const createPost = api.post.create.useMutation({
        onSuccess: async () => {
            await utils.post.invalidate(); // Odśwież listę postów
            setName("");
        },
    });

    return (
        <div className="w-full max-w-md mx-auto">
            <Form/>
            <MessagesList/>
            <h2 className="text-lg font-bold mt-4">Twoje posty:</h2>

            {isLoading ? (
                <p>Ładowanie postów...</p>
            ) : (
                <ul className="mt-2 space-y-2">
                    {posts && posts.length > 0 ? (
                        posts.map((post: Post) => (
                            <li
                                key={post.id}
                                className="p-2 border rounded"
                            >
                                {post.title}
                            </li>
                        ))
                    ) : (
                        <p>Brak postów.</p>
                    )}
                </ul>
            )}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createPost.mutate({name});
                }}
                className="flex flex-col gap-2 mt-4"
            >
                <input
                    type="text"
                    placeholder="Dodaj tytuł posta"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg px-4 py-2 border border-gray-300 text-black"
                />
                <button
                    type="submit"
                    className="rounded-lg bg-blue-500 text-white py-2 px-4 hover:bg-blue-600 transition"
                    disabled={createPost.isPending}
                >
                    {createPost.isPending ? "Dodawanie..." : "Dodaj post"}
                </button>
            </form>
        </div>
    );
}
