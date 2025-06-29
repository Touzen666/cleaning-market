"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type ApartmentOwner = RouterOutputs["apartmentOwners"]["getAll"][0];

export default function AdminOwnersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  // tRPC queries
  const ownersQuery = api.apartmentOwners.getAll.useQuery();
  const apartmentsQuery = api.apartments.getAll.useQuery();

  const {
    data: owners,
    refetch: refetchOwners,
    error: ownersError,
    isLoading: ownersLoading,
  } = ownersQuery;
  const {
    data: apartments,
    error: apartmentsError,
    isLoading: apartmentsLoading,
  } = apartmentsQuery;

  // Handle errors and loading
  if (ownersError) {
    return (
      <div className="p-4 text-red-600">
        Error loading owners: {ownersError.message}
      </div>
    );
  }
  if (apartmentsError) {
    return (
      <div className="p-4 text-red-600">
        Error loading apartments: {apartmentsError.message}
      </div>
    );
  }
  if (ownersLoading || apartmentsLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Zarządzanie Właścicielami
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Dodawaj i zarządzaj właścicielami apartamentów w systemie
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
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
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Dodaj Właściciela
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Wszyscy właściciele
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {owners?.length ?? 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Aktywni
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {owners?.filter((o) => o.isActive).length ?? 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Pierwsze logowanie
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {owners?.filter((o) => o.isFirstLogin).length ?? 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5m14 0v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Apartamenty
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {apartments?.apartments?.length ?? 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Owners List */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white shadow">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="mb-4 text-lg font-medium text-gray-900">
                  Lista Właścicieli
                </h3>

                {!owners || owners.length === 0 ? (
                  <div className="py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Brak właścicieli
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Zacznij od dodania pierwszego właściciela apartamentu.
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => setShowAddForm(true)}
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
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                        Dodaj pierwszego właściciela
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {owners.map((owner) => (
                      <OwnerCard
                        key={owner.id}
                        owner={owner}
                        onSelect={() => setSelectedOwner(owner.id)}
                        isSelected={selectedOwner === owner.id}
                        onRefetch={refetchOwners}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {selectedOwner ? (
              <OwnerDetails
                ownerId={selectedOwner}
                onClose={() => setSelectedOwner(null)}
                apartments={apartments?.apartments ?? []}
              />
            ) : (
              <div className="rounded-lg bg-white p-6 shadow">
                <h3 className="mb-4 text-lg font-medium text-gray-900">
                  Informacje
                </h3>
                <p className="text-sm text-gray-600">
                  Wybierz właściciela z listy, aby zobaczyć szczegóły i
                  zarządzać jego apartamentami.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Owner Modal */}
        {showAddForm && (
          <AddOwnerModal
            onClose={() => setShowAddForm(false)}
            onSuccess={() => {
              setShowAddForm(false);
              void refetchOwners();
            }}
            apartments={apartments?.apartments ?? []}
          />
        )}
      </div>
    </div>
  );
}

// Owner Card Component
function OwnerCard({
  owner,
  onSelect,
  isSelected,
  onRefetch: _onRefetch,
}: {
  owner: ApartmentOwner;
  onSelect: () => void;
  isSelected: boolean;
  onRefetch: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    void navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  };

  return (
    <div
      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
        isSelected
          ? "border-indigo-500 bg-indigo-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              owner.isActive
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">
              {owner.firstName} {owner.lastName}
            </h4>
            <p className="text-sm text-gray-500">{owner.email}</p>

            {/* Temporary Password Display */}
            {owner.isFirstLogin && owner.temporaryPassword && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs text-gray-600">Hasło tymczasowe:</span>
                <div className="flex items-center space-x-1 rounded bg-yellow-50 px-2 py-1">
                  <code className="font-mono text-xs text-yellow-800">
                    {owner.temporaryPassword}
                  </code>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(owner.temporaryPassword!);
                    }}
                    className="text-yellow-600 hover:text-yellow-800"
                    title="Kopiuj hasło"
                  >
                    {copied ? (
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-3 w-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {owner.isFirstLogin && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
              Pierwsze logowanie
            </span>
          )}
          {!owner.isActive && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              Nieaktywny
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Owner Details Component (placeholder)
function OwnerDetails({
  ownerId: _ownerId,
  onClose,
  apartments: _apartments,
}: {
  ownerId: string;
  onClose: () => void;
  apartments: Array<{ id: string; name: string; slug: string }>;
}) {
  return (
    <div className="rounded-lg bg-white shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Szczegóły właściciela
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Szczegóły będą dostępne wkrótce...
        </p>
      </div>
    </div>
  );
}

// Add Owner Modal Component
function AddOwnerModal({
  onClose,
  onSuccess: _onSuccess,
  apartments: _apartments,
}: {
  onClose: () => void;
  onSuccess: () => void;
  apartments: Array<{ id: string; name: string; slug: string }>;
}) {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    apartmentIds: [] as string[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createOwnerMutation = api.apartmentOwners.create.useMutation({
    onSuccess: (data) => {
      alert(
        `✅ Właściciel został utworzony!\n\nTymczasowe hasło: ${data.temporaryPassword}\n\nPrześlij te dane właścicielowi.`,
      );
      _onSuccess();
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Walidacja
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = "Email jest wymagany";
    if (!formData.firstName) newErrors.firstName = "Imię jest wymagane";
    if (!formData.lastName) newErrors.lastName = "Nazwisko jest wymagane";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    createOwnerMutation.mutate({
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      phone: formData.phone || undefined,
      apartmentIds: formData.apartmentIds.map((id) => parseInt(id)),
    });
  };

  const handleApartmentToggle = (apartmentId: string) => {
    setFormData((prev) => ({
      ...prev,
      apartmentIds: prev.apartmentIds.includes(apartmentId)
        ? prev.apartmentIds.filter((id) => id !== apartmentId)
        : [...prev.apartmentIds, apartmentId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
      <div className="relative top-10 mx-auto w-full max-w-2xl rounded-md border bg-white p-6 shadow-lg">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-medium text-gray-900">
            Dodaj nowego właściciela apartamentu
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {errors.general && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-800">{errors.general}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                errors.email ? "border-red-300" : "border-gray-300"
              }`}
              placeholder="jan.kowalski@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Imię i Nazwisko */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Imię *
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                  errors.firstName ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Jan"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nazwisko *
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                  errors.lastName ? "border-red-300" : "border-gray-300"
                }`}
                placeholder="Kowalski"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Telefon */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Telefon (opcjonalnie)
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="+48 123 456 789"
            />
          </div>

          {/* Apartamenty */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Przypisane apartamenty
            </label>
            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border border-gray-200 p-3">
              {_apartments.length > 0 ? (
                _apartments.map((apartment) => (
                  <label key={apartment.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.apartmentIds.includes(apartment.id)}
                      onChange={() => handleApartmentToggle(apartment.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {apartment.name}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-gray-500">
                  Brak dostępnych apartamentów
                </p>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-400"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={createOwnerMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {createOwnerMutation.isPending
                ? "Tworzenie..."
                : "Utwórz właściciela"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
