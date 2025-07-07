"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { PaymentType, VATOption } from "@/lib/types";

type ApartmentOwner = RouterOutputs["apartmentOwners"]["getAll"][0];

export default function AdminOwnersPage() {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);

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
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/admin/reservations")}
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
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
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  Rezerwacje
                </button>
                <button
                  onClick={() => router.push("/admin/reports")}
                  className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
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
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Edytor Raportów
                </button>
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
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
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
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Informacje
              </h3>
              <p className="text-sm text-gray-600">
                Kliknij na właściciela z listy, aby zobaczyć szczegóły i
                zarządzać jego apartamentami.
              </p>
            </div>
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

        {/* Dodaj nowy przycisk Edytor Apartamentów */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center">
            <div className="rounded-lg bg-purple-500 p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
                />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                Edytor Apartamentów
              </h3>
              <p className="text-sm text-gray-500">
                Dodawaj nowe apartamenty i edytuj istniejące ustawienia
              </p>
              <button
                onClick={() => router.push("/admin/apartments")}
                className="mt-3 inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Zarządzaj apartamentami
                <svg
                  className="ml-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Owner Card Component
function OwnerCard({
  owner,
  onRefetch,
}: {
  owner: ApartmentOwner;
  onRefetch: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState<
    "owner-only" | "with-apartments" | null
  >(null);
  const router = useRouter();

  // Mutations for deleting
  const deleteOwnerOnlyMutation =
    api.apartmentOwners.deleteOwnerOnly.useMutation({
      onSuccess: () => {
        onRefetch();
        setShowDeleteModal(false);
        setDeleteType(null);
        alert("✅ Właściciel został usunięty.");
      },
      onError: (error) => {
        alert(`❌ Błąd podczas usuwania właściciela: ${error.message}`);
      },
    });

  const deleteOwnerWithApartmentsMutation =
    api.apartmentOwners.deleteOwnerWithApartments.useMutation({
      onSuccess: (data) => {
        onRefetch();
        setShowDeleteModal(false);
        setDeleteType(null);
        alert(
          `✅ Właściciel i ${data.deletedApartments} apartamentów zostały usunięte.`,
        );
      },
      onError: (error) => {
        alert(
          `❌ Błąd podczas usuwania właściciela i apartamentów: ${error.message}`,
        );
      },
    });

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
      className="cursor-pointer rounded-lg border border-gray-200 p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
      onClick={() => router.push(`/admin/owners/${owner.id}`)}
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

          {/* Delete buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteType("owner-only");
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center rounded-md bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800 hover:bg-orange-200"
              title="Usuń tylko właściciela"
            >
              <svg
                className="mr-1 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Tylko właściciel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteType("with-apartments");
                setShowDeleteModal(true);
              }}
              className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
              title="Usuń właściciela i apartamenty"
            >
              <svg
                className="mr-1 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Wszystko
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteModal(false);
            setDeleteType(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                Potwierdź usunięcie
              </h3>
            </div>

            <div className="mb-6">
              {deleteType === "owner-only" ? (
                <div>
                  <p className="mb-2 text-sm text-gray-600">
                    Czy na pewno chcesz usunąć właściciela{" "}
                    <strong>
                      {owner.firstName} {owner.lastName}
                    </strong>
                    ?
                  </p>
                  <div className="rounded-md bg-yellow-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          Uwaga
                        </h3>
                        <div className="mt-2 text-sm text-yellow-700">
                          <p>
                            Ta operacja usunie tylko właściciela. Apartamenty
                            pozostaną w systemie bez przypisanego właściciela.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-sm text-gray-600">
                    Czy na pewno chcesz usunąć właściciela{" "}
                    <strong>
                      {owner.firstName} {owner.lastName}
                    </strong>{" "}
                    wraz ze wszystkimi apartamentami?
                  </p>
                  <div className="rounded-md bg-red-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Operacja nieodwracalna
                        </h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>Ta operacja usunie:</p>
                          <ul className="mt-1 list-inside list-disc">
                            <li>Właściciela</li>
                            <li>Wszystkie apartamenty</li>
                            <li>Wszystkie rezerwacje</li>
                            <li>Wszystkie dane związane z apartamentami</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(false);
                  setDeleteType(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (deleteType === "owner-only") {
                    deleteOwnerOnlyMutation.mutate({ ownerId: owner.id });
                  } else if (deleteType === "with-apartments") {
                    deleteOwnerWithApartmentsMutation.mutate({
                      ownerId: owner.id,
                    });
                  }
                }}
                disabled={
                  deleteOwnerOnlyMutation.isPending ||
                  deleteOwnerWithApartmentsMutation.isPending
                }
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteOwnerOnlyMutation.isPending ||
                deleteOwnerWithApartmentsMutation.isPending
                  ? "Usuwanie..."
                  : "Usuń"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    paymentType: PaymentType.COMMISSION as PaymentType,
    fixedPaymentAmount: "",
    vatOption: VATOption.NO_VAT as VATOption,
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
    if (
      formData.paymentType === PaymentType.FIXED_AMOUNT &&
      !formData.fixedPaymentAmount
    ) {
      newErrors.fixedPaymentAmount =
        "Kwota stała jest wymagana dla tego typu rozliczenia";
    }
    if (
      formData.paymentType === PaymentType.FIXED_AMOUNT &&
      isNaN(parseFloat(formData.fixedPaymentAmount))
    ) {
      newErrors.fixedPaymentAmount = "Wprowadź prawidłową kwotę";
    }

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
      paymentType: formData.paymentType,
      fixedPaymentAmount:
        formData.paymentType === PaymentType.FIXED_AMOUNT
          ? parseFloat(formData.fixedPaymentAmount)
          : undefined,
      vatOption: formData.vatOption,
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

          {/* Konfiguracja płatności */}
          <div className="space-y-4 rounded-lg border border-gray-200 p-4">
            <h4 className="text-sm font-medium text-gray-900">
              Konfiguracja rozliczenia
            </h4>

            {/* Typ płatności */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Sposób rozliczenia *
              </label>
              <select
                value={formData.paymentType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    paymentType: e.target.value as PaymentType,
                    fixedPaymentAmount:
                      e.target.value === PaymentType.COMMISSION
                        ? ""
                        : prev.fixedPaymentAmount,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="COMMISSION">Prowizja od przychodów</option>
                <option value="FIXED_AMOUNT">Kwota stała miesięcznie</option>
              </select>
            </div>

            {/* Kwota stała (tylko dla FIXED_AMOUNT) */}
            {formData.paymentType === PaymentType.FIXED_AMOUNT && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Miesięczna kwota stała (PLN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.fixedPaymentAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      fixedPaymentAmount: e.target.value,
                    }))
                  }
                  className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                    errors.fixedPaymentAmount
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                  placeholder="1500.00"
                />
                {errors.fixedPaymentAmount && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.fixedPaymentAmount}
                  </p>
                )}
              </div>
            )}

            {/* Opcja VAT */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Konfiguracja VAT *
              </label>
              <select
                value={formData.vatOption}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vatOption: e.target.value as VATOption,
                  }))
                }
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="NO_VAT">Bez VAT (zwolniony z podatku)</option>
                <option value="VAT_8">VAT 8%</option>
                <option value="VAT_23">VAT 23%</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.vatOption === VATOption.NO_VAT &&
                  "Właściciel jest zwolniony z VAT"}
                {formData.vatOption === VATOption.VAT_8 &&
                  "Do wypłaty zostanie doliczony VAT 8%"}
                {formData.vatOption === VATOption.VAT_23 &&
                  "Do wypłaty zostanie doliczony VAT 23%"}
              </p>
            </div>
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
