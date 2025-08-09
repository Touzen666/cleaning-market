"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import ApartmentImageManager from "@/components/ApartmentImageManager";

// Extended apartment type with new fields
interface ExtendedApartment {
  id: string;
  name: string;
  address: string;
  slug: string;
  defaultRentAmount: number | null;
  defaultUtilitiesAmount: number | null;
  weeklyLaundryCost: number | null;
  cleaningSuppliesCost: number | null;
  capsuleCostPerGuest: number | null;
  wineCost: number | null;
  hasBalcony: boolean;
  hasParking: boolean;
  maxGuests: number | null;
  cleaningCosts: Record<string, number> | null;
  averageRating: number | null;
  paymentType: "COMMISSION" | "FIXED_AMOUNT" | "FIXED_AMOUNT_MINUS_UTILITIES";
  fixedPaymentAmount: number | null;
  images: Array<{
    id: string;
    url: string;
    alt: string | null;
    isPrimary: boolean;
    order: number;
  }>;
}

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
    weeklyLaundryCost: 120,
    hasBalcony: false,
    hasParking: false,
    maxGuests: 4,
    cleaningCosts: {} as Record<string, number>,
    paymentType: "COMMISSION" as
      | "COMMISSION"
      | "FIXED_AMOUNT"
      | "FIXED_AMOUNT_MINUS_UTILITIES",
    fixedPaymentAmount: 0,
  });
  const [status, setStatus] = useState<string | null>(null);
  const [ratingStatus, setRatingStatus] = useState<string | null>(null);
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
      // Usuwamy automatyczne przekierowanie - użytkownik sam zdecyduje kiedy opuścić stronę
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
      // Usuwamy automatyczne przekierowanie - użytkownik sam zdecyduje kiedy opuścić stronę
    },
    onError: (err) => {
      setStatus(err.message);
    },
  });

  const recalculateRating = api.apartments.recalculateRating.useMutation({
    onSuccess: () => {
      setRatingStatus("success");
      void apartmentQuery.refetch();
      setTimeout(() => {
        setRatingStatus(null);
      }, 2000);
    },
    onError: (err) => {
      setRatingStatus(err.message);
      setTimeout(() => {
        setRatingStatus(null);
      }, 3000);
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
        weeklyLaundryCost:
          (apartment as ExtendedApartment).weeklyLaundryCost ?? 120,
        hasBalcony: apartment.hasBalcony,
        hasParking: apartment.hasParking,
        maxGuests: apartment.maxGuests ?? 4,
        cleaningCosts: apartment.cleaningCosts ?? {},
        paymentType: apartment.paymentType ?? "COMMISSION",
        fixedPaymentAmount: apartment.fixedPaymentAmount ?? 0,
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
        weeklyLaundryCost: Number(form.weeklyLaundryCost),
        maxGuests: Number(form.maxGuests),
        cleaningCosts: form.cleaningCosts,
        ownerId: ownerId, // Przekaż ID właściciela jeśli jest dostępne
      });
    } else {
      updateApartment.mutate({
        id: currentApartmentId,
        ...form,
        defaultRentAmount: Number(form.defaultRentAmount),
        defaultUtilitiesAmount: Number(form.defaultUtilitiesAmount),
        weeklyLaundryCost: Number(form.weeklyLaundryCost),
        maxGuests: Number(form.maxGuests),
        cleaningCosts: form.cleaningCosts,
      });
    }
  };

  const handleRecalculateRating = () => {
    const currentApartmentId = createdApartmentId ?? apartmentId;
    if (currentApartmentId && currentApartmentId !== "new") {
      recalculateRating.mutate({ apartmentId: currentApartmentId });
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
                  Koszt prania tygodniowo (PLN)
                </label>
                <input
                  type="number"
                  value={form.weeklyLaundryCost}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      weeklyLaundryCost: Number(e.target.value),
                    }))
                  }
                  min={0}
                  step={0.01}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  placeholder="120.00"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Ustaw indywidualną stawkę za pranie dla tego apartamentu
                  (domyślnie 120 PLN)
                </p>
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

            {/* Koszty sprzątania */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Koszty sprzątania (za liczbę gości)
              </label>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
                {Array.from({ length: form.maxGuests }, (_, i) => i + 1).map(
                  (guestCount) => (
                    <div key={guestCount}>
                      <label className="mb-1 block text-xs text-gray-600">
                        {guestCount}{" "}
                        {guestCount === 1
                          ? "gość"
                          : guestCount < 5
                            ? "gości"
                            : "gości"}
                      </label>
                      <input
                        type="number"
                        value={form.cleaningCosts[guestCount.toString()] ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cleaningCosts: {
                              ...f.cleaningCosts,
                              [guestCount.toString()]:
                                Number(e.target.value) || 0,
                            },
                          }))
                        }
                        min={0}
                        step={0.01}
                        className="block w-full rounded-md border-gray-300 px-2 py-1 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                  ),
                )}
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

            {/* Rozliczenia */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Ustawienia rozliczeń
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Typ rozliczenia
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        value="COMMISSION"
                        checked={form.paymentType === "COMMISSION"}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentType: e.target.value as "COMMISSION",
                          }))
                        }
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Rozliczenie właściciela: prowizyjne
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        value="FIXED_AMOUNT"
                        checked={form.paymentType === "FIXED_AMOUNT"}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentType: e.target.value as "FIXED_AMOUNT",
                          }))
                        }
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Rozliczenie właściciela: kwota stała
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="paymentType"
                        value="FIXED_AMOUNT_MINUS_UTILITIES"
                        checked={
                          form.paymentType === "FIXED_AMOUNT_MINUS_UTILITIES"
                        }
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            paymentType: e.target
                              .value as "FIXED_AMOUNT_MINUS_UTILITIES",
                          }))
                        }
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">
                        Rozliczenie właściciela: kwota stała po odliczeniu
                        mediów
                      </span>
                    </label>
                  </div>
                </div>

                {(form.paymentType === "FIXED_AMOUNT" ||
                  form.paymentType === "FIXED_AMOUNT_MINUS_UTILITIES") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kwota stała (PLN)
                    </label>
                    <input
                      type="number"
                      value={form.fixedPaymentAmount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          fixedPaymentAmount: Number(e.target.value) || 0,
                        }))
                      }
                      min={0}
                      step={0.01}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Rating */}
            {!isNew && apartmentQuery.data && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Aktualna ocena
                </label>
                <div className="mt-1 flex items-center gap-x-4">
                  <p className="rounded-md bg-gray-100 px-3 py-2 text-lg font-semibold text-gray-800">
                    {apartmentQuery.data.averageRating?.toFixed(2) ??
                      "Brak oceny"}
                  </p>
                  <button
                    type="button"
                    onClick={handleRecalculateRating}
                    disabled={recalculateRating.isPending}
                    className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-cyan-700"
                  >
                    {recalculateRating.isPending
                      ? "Przeliczanie..."
                      : "Wylicz ocenę"}
                  </button>
                </div>
                {ratingStatus && (
                  <p
                    className={`mt-2 text-sm ${ratingStatus === "success" ? "text-green-600" : "text-red-600"}`}
                  >
                    {ratingStatus === "success"
                      ? "Ocena została pomyślnie zaktualizowana!"
                      : `Błąd: ${ratingStatus}`}
                  </p>
                )}
              </div>
            )}

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
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-indigo-700"
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
