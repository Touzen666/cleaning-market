"use client";

import { useState } from "react";
import { api } from "@/trpc/react";

export default function Form() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "", // 🔥 Upewnij się, że 'message' istnieje
  });
  const utils = api.useUtils();
  // const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //     setFormData({...formData, [e.target.name]: e.target.value});
  // };
  const sendMessage = api.contact.sendMessage.useMutation({
    onSuccess: async (data) => {
      console.log("Wiadomość zapisana w bazie:", data); // 🔥 Sprawdź w konsoli
      alert("Wiadomość wysłana!");
      setFormData({ name: "", email: "", message: "" });
      await utils.contact.invalidate(); // Odśwież listę postów
    },
    onError: (error) => {
      console.error("Błąd podczas zapisu wiadomości:", error); // 🔥 Sprawdź, czy jest jakiś błąd
      alert(`Błąd: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Wysyłane dane:", formData); // 🔥 Sprawdź, jakie dane są wysyłane
    sendMessage.mutate(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-lg border p-4"
    >
      <input
        type="text"
        placeholder="Imię"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        className="rounded border p-2 text-black"
      />

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        className="rounded border p-2 text-black"
      />

      <textarea
        placeholder="Wiadomość"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        className="h-24 rounded border p-2 text-black"
      />

      <button type="submit" className="bg-brand-gold rounded p-2 text-white">
        Wyślij wiadomość
      </button>
    </form>
  );
}
