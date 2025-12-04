"use client";

import React from "react";
import { api } from "@/trpc/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function OwnerRoomDetailsPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const router = useRouter();
  const actual = React.use(params);
  const { roomId } = actual;

  const { data, isLoading, error } = api.rooms.getById.useQuery({ id: roomId });

  if (isLoading) {
    return <div className="p-6">Ładowanie...</div>;
  }
  if (error || !data) {
    return (
      <div className="p-6 text-red-600">
        Błąd: {error?.message ?? "Nie znaleziono pokoju"}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Szczegóły pokoju: {data.name}</h1>
        <button
          onClick={() => router.back()}
          className="rounded-md border px-3 py-2 text-sm"
        >
          Wróć
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow">
        {data.apartmentPrimaryImageUrl && (
          <div className="relative h-56 w-full">
            <Image
              src={data.apartmentPrimaryImageUrl}
              alt={data.name}
              fill
              // Kontener ma max-w-4xl (~896px). Użyjemy dokładnego sizes,
              // żeby Next dobrał ostrzejszy wariant i uniknął rozmycia.
              sizes="(max-width: 896px) 100vw, 896px"
              quality={100}
              priority
              className="object-cover"
            />
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
          <div>
            <div className="text-sm text-gray-500">Kod pokoju</div>
            <div className="font-medium">{data.code}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Adres</div>
            <div className="font-medium">{data.address}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Maks. gości</div>
            <div className="font-medium">{data.maxGuests ?? "-"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Balkon</div>
            <div className="font-medium">{data.hasBalcony ? "Tak" : "Nie"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Parking</div>
            <div className="font-medium">{data.hasParking ? "Tak" : "Nie"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Czynsz domyślny</div>
            <div className="font-medium">{data.defaultRentAmount ?? 0} PLN</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Media domyślne</div>
            <div className="font-medium">
              {data.defaultUtilitiesAmount ?? 0} PLN
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Pranie tygodniowe</div>
            <div className="font-medium">{data.weeklyLaundryCost ?? 0} PLN</div>
          </div>
        </div>
      </div>
    </div>
  );
}

