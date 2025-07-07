"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { PaymentType, VATOption } from "@/lib/types";
import ApartmentList from "@/components/ApartmentList";

export default function OwnerDetailsPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actualParams = React.use(params);
  const { ownerId } = actualParams;

  // Stan dla notatek
  const [noteForm, setNoteForm] = useState({
    type: "GENERAL" as const,
    title: "",
    content: "",
    isImportant: false,
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  // tRPC queries
  const ownerQuery = api.apartmentOwners.getById.useQuery({ ownerId });
  const ownerApartmentsQuery = api.apartmentOwners.getOwnerApartments.useQuery({
    ownerId,
  });
  const ownerNotesQuery = api.ownerNotes.getByOwnerId.useQuery({ ownerId });

  // Sprawdź czy wróciliśmy z tworzenia apartamentu
  useEffect(() => {
    const fromApartmentCreation = searchParams.get("fromApartmentCreation");
    if (fromApartmentCreation === "true") {
      // Odśwież listę apartamentów
      void ownerApartmentsQuery.refetch();
      // Usuń parametr z URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("fromApartmentCreation");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, ownerApartmentsQuery, router]);

  // Mutacje
  const deleteApartmentMutation = api.apartments.delete.useMutation({
    onSuccess: () => {
      void ownerApartmentsQuery.refetch();
    },
  });

  // Mutacje dla notatek
  const createNoteMutation = api.ownerNotes.create.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  const updateNoteMutation = api.ownerNotes.update.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  const deleteNoteMutation = api.ownerNotes.delete.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  if (ownerQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-600">Ładowanie właściciela...</p>
        </div>
      </div>
    );
  }

  if (ownerQuery.isError || !ownerQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">
            {ownerQuery.error?.message ?? "Właściciel nie został znaleziony"}
          </p>
          <button
            onClick={() => router.push("/admin/owners")}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  const owner = ownerQuery.data;
  const ownerApartments = ownerApartmentsQuery.data ?? [];

  const handleDeleteApartment = (apartmentId: string) => {
    if (confirm("Czy na pewno chcesz usunąć ten apartament?")) {
      deleteApartmentMutation.mutate({ id: apartmentId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Szczegóły właściciela
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {owner.firstName} {owner.lastName} - {owner.email}
              </p>
            </div>
            <div className="mt-4 flex gap-3 sm:mt-0">
              <button
                onClick={() => router.push("/admin/owners")}
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
                Powrót do listy
              </button>
              <button
                onClick={() => router.push(`/admin/owners/${ownerId}/edit`)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
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
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edytuj właściciela
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Informacje o właścicielu */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Informacje o właścicielu
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imię i nazwisko
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.firstName} {owner.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{owner.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1">
                    {owner.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Aktywny
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Nieaktywny
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Typ płatności
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.paymentType === PaymentType.COMMISSION
                      ? "Prowizja od przychodów"
                      : `Kwota stała: ${Number(owner.fixedPaymentAmount).toFixed(2)} PLN`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Opcja VAT
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.vatOption === VATOption.NO_VAT && "Bez VAT"}
                    {owner.vatOption === VATOption.VAT_8 && "VAT 8%"}
                    {owner.vatOption === VATOption.VAT_23 && "VAT 23%"}
                  </p>
                </div>

                {owner.isFirstLogin && owner.temporaryPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hasło tymczasowe
                    </label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="rounded bg-yellow-50 px-2 py-1 font-mono text-sm text-yellow-800">
                        {owner.temporaryPassword}
                      </code>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            owner.temporaryPassword!,
                          );
                        }}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Kopiuj hasło"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lista apartamentów */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Apartamenty właściciela ({ownerApartments.length})
                </h3>
                <button
                  onClick={() =>
                    router.push(`/admin/apartments/new?ownerId=${ownerId}`)
                  }
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Dodaj apartament
                </button>
              </div>

              {/* Loader podczas refetch */}
              {ownerApartmentsQuery.isRefetching && (
                <div className="mb-4 rounded-md bg-blue-50 p-4">
                  <div className="flex items-center">
                    <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="text-sm text-blue-700">
                      Odświeżanie listy apartamentów...
                    </p>
                  </div>
                </div>
              )}

              {ownerApartments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">Brak apartamentów</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Dodaj pierwszy apartament dla tego właściciela
                  </p>
                </div>
              ) : (
                <ApartmentList
                  apartments={ownerApartments}
                  mode="admin"
                  onEdit={(apartmentId) =>
                    router.push(`/admin/apartments/${apartmentId}`)
                  }
                  onDelete={handleDeleteApartment}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
