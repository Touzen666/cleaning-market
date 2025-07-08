"use client";

import { useState } from "react";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import Form from "@/app/_components/Form";
import MessagesList from "@/app/_components/MessagesList";

type Post = RouterOutputs["post"]["getAll"][0];
//test
export function LatestPost() {
  // Pobierz wszystkie posty zamiast tylko jednego
  const { data: posts, isLoading } = api.post.getAll.useQuery();

  const utils = api.useUtils();
  const [title, setTitle] = useState("");

  const createPost = api.post.create.useMutation({
    onSuccess: async () => {
      await utils.post.invalidate(); // Odśwież listę postów
      setTitle("");
    },
  });

  return (
    <div className="mx-auto w-full max-w-md">
      <Form />
      <MessagesList />
      <h2 className="mt-4 text-lg font-bold">Twoje posty:</h2>

      {isLoading ? (
        <p>Ładowanie postów...</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {posts && posts.length > 0 ? (
            posts.map((post: Post) => (
              <li key={post.id} className="rounded border p-2">
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
          createPost.mutate({ title });
        }}
        className="mt-4 flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Dodaj tytuł posta"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-black"
        />
        <button
          type="submit"
          className="bg-brand-gold rounded-lg px-4 py-2 text-white transition hover:bg-yellow-500"
          disabled={createPost.isPending}
        >
          {createPost.isPending ? "Dodawanie..." : "Dodaj post"}
        </button>
      </form>
    </div>
  );
}
