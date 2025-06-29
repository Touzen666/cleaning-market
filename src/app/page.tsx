"use client";

import { api } from "@/trpc/react";
import Link from "next/link";

export default function HomePage() {
  const {
    data: apartmentsData,
    isLoading,
    error,
  } = api.apartments.getAll.useQuery();

  if (isLoading) {
    return <div className="py-8 text-center">Ładowanie apartamentów...</div>;
  }

  if (error) {
    return (
      <div className="py-8 text-center text-red-600">
        Błąd ładowania apartamentów
      </div>
    );
  }

  return (
    <main className="container mx-auto py-8">
      <h1 className="mb-8 text-center text-3xl font-bold">
        Wybierz Apartament
      </h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {apartmentsData?.apartments?.map((apartment) => (
          <Link
            key={apartment.id}
            href={`/check-in-card/${apartment.slug}`}
            className="block rounded-lg border border-gray-200 p-6 transition-all hover:bg-gray-50 hover:shadow-md"
          >
            <h2 className="text-xl font-semibold text-gray-800">
              {apartment.name}
            </h2>
            <p className="mt-2 text-gray-600">
              Kliknij aby wypełnić kartę meldunkową
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
