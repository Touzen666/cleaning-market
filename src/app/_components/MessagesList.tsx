"use client";

import {api} from "@/trpc/react";

export default function MessagesList() {
    const {data: messages, isLoading, error} = api.contact.getMessages.useQuery();

    if (isLoading) return <p>Ładowanie wiadomości...</p>;
    if (error) return <p>Błąd: {error.message}</p>;

    return (
        <div className="max-w-lg mx-auto mt-4">
            <h2 className="text-xl font-bold mb-4">Lista wiadomości</h2>
            {messages && messages.length === 0 ? (
                <p>Brak wiadomości.</p>
            ) : (
                <ul className="space-y-4">
                    {messages?.map((msg) => (
                        <li key={msg.id} className="p-4 border rounded-lg bg-gray-100 text-black">
                            <p className="font-semibold">{msg.name} ({msg.email})</p>
                            <p>{msg.message}</p>
                            <span className="text-sm text-gray-500">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
