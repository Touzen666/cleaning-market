"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import ApartmentImageManager from "@/components/ApartmentImageManager";

export default function EditApartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ apartmentId: string }>;
  searchParams: Promise<{ ownerId?: string }>;
}) {
  const router = useRouter();
  const actualParams = React.use(params);
  const actualSearchParams = React.use(searchParams);
  const { apartmentId } = actualParams;
  const { ownerId } = actualSearchParams;
  const [form, setForm] = useState({
    name: "",
    address: "",
    defaultRentAmount: 0,
    defaultUtilitiesAmount: 0,
    hasBalcony: false,
    hasParking: false,
    maxGuests: 4,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState<string>("/admin/apartments");
  const [createdApartmentId, setCreatedApartmentId] = useState<string | null>(
    null,
  );

  // Zapisz URL strony, z której użytkownik przyszedł
  useEffect(() => {
    // Jeśli mamy ownerId w URL, to znaczy że przyszliśmy ze strony właściciela
    if (ownerId) {
      setReturnUrl(`/admin/owners/${ownerId}`);
    } else {
      const referrer = document.referrer;
      if (referrer) {
        const url = new URL(referrer);
        const path = url.pathname;

        // Sprawdź czy to strona właściciela lub lista apartamentów
        if (path.startsWith("/admin/owners/") || path === "/admin/apartments") {
          setReturnUrl(path);
        }
      }
    }
  }, [ownerId]);

  // Query do pobierania danych apartamentu
  const apartmentQuery = api.apartments.getById.useQuery(
    { id: createdApartmentId ?? apartmentId },
    {
      enabled:
        apartmentId !== "new" ||
        (createdApartmentId !== null && createdApartmentId !== ""),
    },
  );

  // Mutacja do aktualizacji apartamentu
  const updateApartment = api.apartments.update.useMutation({
    onSuccess: () => {
      setStatus("success");
      setTimeout(() => {
        // Przekieruj z powrotem do strony, z której użytkownik przyszedł
        router.push(returnUrl);
      }, 1500);
    },
    onError: (err) => {
      setStatus(err.message);
    },
  });

  // Mutacja do tworzenia nowego apartamentu
  const createApartment = api.apartments.create.useMutation({
    onSuccess: (data) => {
      setStatus("success");
      setCreatedApartmentId(data.apartment.id);

      // Jeśli utworzyliśmy apartament z poziomu właściciela, przekieruj z powrotem
      if (ownerId) {
        setTimeout(() => {
          router.push(`/admin/owners/${ownerId}?fromApartmentCreation=true`);
        }, 1500);
      }
      // W przeciwnym razie zostajemy na tej samej stronie z nowym ID
    },
    onError: (err) => {
      setStatus(err.message);
    },
  });

  // Wypełnij formularz danymi apartamentu
  useEffect(() => {
    if (apartmentQuery.data && (apartmentId !== "new" || createdApartmentId)) {
      const apartment = apartmentQuery.data;
      setForm({
        name: apartment.name,
        address: apartment.address,
        defaultRentAmount: apartment.defaultRentAmount ?? 0,
        defaultUtilitiesAmount: apartment.defaultUtilitiesAmount ?? 0,
        hasBalcony: apartment.hasBalcony,
        hasParking: apartment.hasParking,
        maxGuests: apartment.maxGuests ?? 4,
      });
    }
  }, [apartmentQuery.data, apartmentId, createdApartmentId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);

    const currentApartmentId = createdApartmentId ?? apartmentId;

    if (apartmentId === "new" && !createdApartmentId) {
      createApartment.mutate({
        ...form,
        defaultRentAmount: Number(form.defaultRentAmount),
        defaultUtilitiesAmount: Number(form.defaultUtilitiesAmount),
        maxGuests: Number(form.maxGuests),
        ownerId: ownerId, // Przekaż ID właściciela jeśli jest dostępne
      });
    } else {
      updateApartment.mutate({
        id: currentApartmentId,
        ...form,
        defaultRentAmount: Number(form.defaultRentAmount),
        defaultUtilitiesAmount: Number(form.defaultUtilitiesAmount),
        maxGuests: Number(form.maxGuests),
      });
    }
  };

  const isNew = apartmentId === "new" && !createdApartmentId;
  const isLoading = apartmentQuery.isLoading && !isNew;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-600">Ładowanie apartamentu...</p>
        </div>
      </div>
    );
  }

  if (apartmentQuery.isError && apartmentId !== "new") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">{apartmentQuery.error.message}</p>
          <button
            onClick={() => router.push(returnUrl)}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Powrót
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {apartmentId === "new" && !createdApartmentId
                  ? "Dodaj nowy apartament"
                  : "Edytuj apartament"}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {apartmentId === "new" && !createdApartmentId
                  ? "Wypełnij formularz aby dodać nowy apartament do systemu"
                  : "Zmień dane apartamentu i zapisz zmiany"}
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => router.push(returnUrl)}
                className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
              >
                <svg
                  className="-ml-0.5 mr-1.5 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Powrót
              </button>
            </div>
          </div>
        </div>

        {/* Formularz */}
        <div className="rounded-lg bg-white p-6 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwa apartamentu *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="np. Apartament nad morzem"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Adres *
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="np. ul. Morska 123, Gdynia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Domyślny czynsz (PLN)
                </label>
                <input
                  type="number"
                  value={form.defaultRentAmount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultRentAmount: Number(e.target.value),
                    }))
                  }
                  min={0}
                  step={0.01}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Domyślne media (PLN)
                </label>
                <input
                  type="number"
                  value={form.defaultUtilitiesAmount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      defaultUtilitiesAmount: Number(e.target.value),
                    }))
                  }
                  min={0}
                  step={0.01}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Maksymalna liczba gości
                </label>
                <input
                  type="number"
                  value={form.maxGuests}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      maxGuests: Number(e.target.value),
                    }))
                  }
                  min={1}
                  max={20}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.hasBalcony}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hasBalcony: e.target.checked }))
                  }
                  id="hasBalcony"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="hasBalcony"
                  className="text-sm font-medium text-gray-700"
                >
                  Balkon
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={form.hasParking}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hasParking: e.target.checked }))
                  }
                  id="hasParking"
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="hasParking"
                  className="text-sm font-medium text-gray-700"
                >
                  Parking
                </label>
              </div>
            </div>

            {/* Status messages */}
            {status && (
              <div
                className={`rounded-md p-4 ${
                  status === "success"
                    ? "bg-green-50 text-green-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {status === "success"
                  ? "Apartament został zapisany pomyślnie!"
                  : status}
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => router.push(returnUrl)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={
                  updateApartment.isPending || createApartment.isPending
                }
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {updateApartment.isPending || createApartment.isPending
                  ? "Zapisywanie..."
                  : apartmentId === "new" && !createdApartmentId
                    ? "Dodaj apartament"
                    : "Zapisz zmiany"}
              </button>
            </div>
          </form>
        </div>

        {/* Sekcja zarządzania zdjęciami - dla istniejących apartamentów i nowo utworzonych */}
        {apartmentQuery.data &&
          ((createdApartmentId !== null && createdApartmentId !== "") ||
            apartmentId !== "new") && (
            <div className="mt-8 rounded-lg bg-white p-6 shadow">
              <ApartmentImageManager
                apartmentId={createdApartmentId ?? apartmentId}
                images={apartmentQuery.data.images}
                onImagesChange={() => {
                  void apartmentQuery.refetch();
                }}
              />
            </div>
          )}

        {/* Debug info - usuń po testach */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 rounded-lg bg-gray-100 p-4 text-sm">
            <p>Debug info:</p>
            <p>apartmentId: {apartmentId}</p>
            <p>
              createdApartmentId: &quot;{createdApartmentId}&quot; (length:{" "}
              {createdApartmentId?.length ?? 0})
            </p>
            <p>createdApartmentId type: {typeof createdApartmentId}</p>
            <p>
              apartmentQuery.data: {apartmentQuery.data ? "exists" : "null"}
            </p>
            <p>
              apartmentQuery.isLoading:{" "}
              {apartmentQuery.isLoading ? "true" : "false"}
            </p>
            <p>
              apartmentQuery.isError:{" "}
              {apartmentQuery.isError ? "true" : "false"}
            </p>
            <p>
              Query enabled:{" "}
              {apartmentId !== "new" ||
              (createdApartmentId !== null && createdApartmentId !== "")
                ? "true"
                : "false"}
            </p>
            <p>Query ID: {createdApartmentId ?? apartmentId}</p>
          </div>
        )}
      </div>
    </div>
  );
}
