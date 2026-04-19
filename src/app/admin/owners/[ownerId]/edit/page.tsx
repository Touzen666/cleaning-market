"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { VATOption } from "@/lib/types";

export default function EditOwnerPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const router = useRouter();
  const actualParams = React.use(params);
  const { ownerId } = actualParams;

  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName: string;
    nip: string;
    address: string;
    city: string;
    postalCode: string;
    isActive: boolean;
    vatOption: VATOption;
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    nip: "",
    address: "",
    city: "",
    postalCode: "",
    isActive: true,
    vatOption: VATOption.NO_VAT,
  });

  // Query do pobierania danych właściciela
  const ownerQuery = api.apartmentOwners.getById.useQuery({ ownerId });

  // Mutacja do aktualizacji właściciela
  const updateOwnerMutation = api.apartmentOwners.update.useMutation({
    onSuccess: () => {
      // Usuwamy automatyczne przekierowanie - użytkownik sam zdecyduje kiedy opuścić stronę
    },
    onError: (err: { message: string }) => {
      alert(`Błąd aktualizacji: ${err.message}`);
    },
  });

  // Wypełnij formularz danymi właściciela
  useEffect(() => {
    if (ownerQuery.data) {
      const owner = ownerQuery.data;
      setForm({
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phone: owner.phone ?? "",
        companyName: owner.companyName ?? "",
        nip: owner.nip ?? "",
        address: owner.address ?? "",
        city: owner.city ?? "",
        postalCode: owner.postalCode ?? "",
        isActive: owner.isActive,
        vatOption: owner.vatOption,
      });
    }
  }, [ownerQuery.data]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwnerMutation.mutate({
      ownerId,
      ...form,
    });
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Edytuj właściciela
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Zmień dane właściciela i zapisz zmiany
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => router.push(`/admin/owners/${ownerId}`)}
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
                Powrót do szczegółów
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
                  Imię *
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwisko *
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Telefon
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwa firmy
                </label>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, companyName: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  NIP
                </label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nip: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Adres
                </label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Miasto
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Kod pocztowy
                </label>
                <input
                  type="text"
                  value={form.postalCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, postalCode: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Aktywny
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Opcja VAT
              </label>
              <select
                value={form.vatOption}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    vatOption: e.target.value as VATOption,
                  }))
                }
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value={VATOption.NO_VAT}>Bez VAT</option>
                <option value={VATOption.VAT_8}>VAT 8%</option>
                <option value={VATOption.VAT_23}>VAT 23%</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.push(`/admin/owners/${ownerId}`)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={updateOwnerMutation.isPending}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700"
              >
                {updateOwnerMutation.isPending
                  ? "Zapisywanie..."
                  : "Zapisz zmiany"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
