"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { PaymentType, VATOption } from "@/lib/types";
import { useSession } from "next-auth/react";
import ProfileAvatar from "@/components/ProfileAvatar";

type ApartmentOwner = RouterOutputs["apartmentOwners"]["getAll"][0] & {
  profileImageUrl?: string | null;
};

export default function AdminOwnersPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
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

  const loginAsOwnerMutation = api.ownerAuth.loginAsOwner.useMutation();
  const handleLoginAsOwner = async (ownerId: string) => {
    try {
      const result = await loginAsOwnerMutation.mutateAsync({ ownerId });
      if (result.success && result.token) {
        await update({
          ...session,
          user: {
            ...session?.user,
            id: ownerId,
            role: "OWNER",
            isSuperAdmin: true,
          },
          token: result.token,
        });
        router.push("/apartamentsOwner/dashboard");
      } else {
        // @ts-expect-error - result.error can be unknown
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        console.error("Failed to login as owner:", result.error);
      }
    } catch (error) {
      console.error("Error during login as owner:", error);
    }
  };

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
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 hover:bg-green-500"
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
                  className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600 hover:bg-purple-500"
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
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 hover:bg-indigo-500"
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

        {/* Owners List */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Lista Właścicieli
              </h2>
              {owners && owners.length > 0 ? (
                <ul className="space-y-4">
                  {owners.map((owner) => (
                    <OwnerCard
                      key={owner.id}
                      owner={owner}
                      onRefetch={refetchOwners}
                      onLoginAsOwner={handleLoginAsOwner}
                    />
                  ))}
                </ul>
              ) : (
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      vectorEffect="non-scaling-stroke"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                    />
                  </svg>
                  <h3 className="mt-2 text-sm font-semibold text-gray-900">
                    Brak właścicieli
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Dodaj nowego właściciela, aby zacząć zarządzać.
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
              )}
            </div>
          </div>
          {/* Information Panel */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-bold text-gray-900">
                Informacje
              </h2>
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
      </div>
    </div>
  );
}

function OwnerCard({
  owner,
  onRefetch,
  onLoginAsOwner,
}: {
  owner: ApartmentOwner;
  onRefetch: () => void;
  onLoginAsOwner: (ownerId: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const router = useRouter();

  const sendWelcomeEmailMutation = api.email.sendWelcomeEmail.useMutation({
    onSuccess: () => alert("Email powitalny został wysłany!"),
    onError: (err: { message: string }) => alert(`Błąd: ${err.message}`),
  });

  const deleteOwnerMutation = api.apartmentOwners.delete.useMutation({
    onSuccess: onRefetch,
    onError: (err: { message: string }) =>
      alert(`Błąd usuwania: ${err.message}`),
  });

  const removeApartmentMutation =
    api.apartmentOwners.removeApartmentFromOwner.useMutation({
      onSuccess: onRefetch,
      onError: (err: { message: string }) =>
        alert(`Błąd usuwania apartamentu: ${err.message}`),
    });

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div
        className="flex cursor-pointer items-center justify-between"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center">
          <ProfileAvatar
            imageUrl={owner.profileImageUrl ?? undefined}
            size="md"
            alt={`Zdjęcie profilowe ${owner.firstName} ${owner.lastName}`}
            className={owner.isActive ? "" : "opacity-50"}
          />
          <div className="ml-4">
            <div className="text-lg font-medium text-gray-900">
              {owner.firstName} {owner.lastName}
            </div>
            <div className="text-sm text-gray-500">{owner.email}</div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {owner.isFirstLogin && (
            <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              Pierwsze logowanie
            </span>
          )}
        </div>
      </div>

      {showDetails && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/admin/owners/${owner.id}/edit`);
                }}
                className="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 hover:bg-blue-200"
              >
                Szczegóły
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("Czy na pewno chcesz usunąć tego właściciela?")) {
                    deleteOwnerMutation.mutate({ ownerId: owner.id });
                  }
                }}
                className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-800 hover:bg-red-200"
              >
                Usuń właściciela
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendWelcomeEmailMutation.mutate({ ownerId: owner.id });
                }}
                className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-800 hover:bg-gray-200"
                disabled={sendWelcomeEmailMutation.isPending}
              >
                {sendWelcomeEmailMutation.isPending ? "Wysyłanie..." : "Email"}
              </button>

              {/* Login as Owner button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLoginAsOwner(owner.id);
                }}
                className="inline-flex items-center rounded-md bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800 hover:bg-purple-200"
                title="Zaloguj się jako właściciel"
              >
                Zaloguj jako
              </button>

              {/* Delete buttons */}
            </div>
            <div>
              {owner.temporaryPassword && (
                <div className="flex items-center">
                  <span className="text-xs text-gray-600">
                    Hasło tymczasowe:
                  </span>
                  <input
                    type="text"
                    readOnly
                    value={owner.temporaryPassword}
                    className="ml-2 rounded-md border-gray-300 bg-gray-100 p-1 text-xs"
                  />
                  <button
                    onClick={() => copyToClipboard(owner.temporaryPassword!)}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {copied ? "Skopiowano!" : "Kopiuj"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-md font-medium text-gray-800">
              Przypisane apartamenty
            </h4>
            {owner.ownedApartments.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {owner.ownedApartments.map(({ apartment }) => (
                  <li
                    key={apartment.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-2"
                  >
                    <span className="text-sm">{apartment.name}</span>
                    <button
                      onClick={() =>
                        removeApartmentMutation.mutate({
                          ownerId: owner.id,
                          apartmentId: parseInt(apartment.id),
                        })
                      }
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Usuń
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-gray-500">
                Brak przypisanych apartamentów.
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function AddOwnerModal({
  onClose,
  onSuccess,
  apartments,
}: {
  onClose: () => void;
  onSuccess: () => void;
  apartments: Array<{ id: string; name: string; slug: string }>;
}) {
  const [form, setForm] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    paymentType: PaymentType;
    fixedPaymentAmount: number;
    vatOption: VATOption;
    apartmentIds: number[];
  }>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    paymentType: PaymentType.COMMISSION,
    fixedPaymentAmount: 0,
    vatOption: VATOption.NO_VAT,
    apartmentIds: [],
  });

  const createOwnerMutation = api.apartmentOwners.create.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (err: { message: string }) =>
      alert(`Błąd tworzenia: ${err.message}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOwnerMutation.mutate(form);
  };

  const handleApartmentToggle = (apartmentId: string) => {
    const apartmentIdNum = parseInt(apartmentId);
    setForm((prev) => ({
      ...prev,
      apartmentIds: prev.apartmentIds.includes(apartmentIdNum)
        ? prev.apartmentIds.filter((id) => id !== apartmentIdNum)
        : [...prev.apartmentIds, apartmentIdNum],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">Dodaj nowego właściciela</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Imię"
              value={form.firstName}
              onChange={(e) =>
                setForm((f) => ({ ...f, firstName: e.target.value }))
              }
              required
              className="rounded-md border-gray-300 p-2"
            />
            <input
              type="text"
              placeholder="Nazwisko"
              value={form.lastName}
              onChange={(e) =>
                setForm((f) => ({ ...f, lastName: e.target.value }))
              }
              required
              className="rounded-md border-gray-300 p-2"
            />
          </div>
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            required
            className="w-full rounded-md border-gray-300 p-2"
          />
          <input
            type="tel"
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-md border-gray-300 p-2"
          />

          <select
            value={form.paymentType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                paymentType: e.target.value as PaymentType,
              }))
            }
            className="w-full rounded-md border-gray-300 p-2"
          >
            <option value={PaymentType.COMMISSION}>
              Prowizja od przychodów
            </option>
            <option value={PaymentType.FIXED_AMOUNT}>Kwota stała</option>
          </select>

          {form.paymentType === PaymentType.FIXED_AMOUNT && (
            <input
              type="number"
              placeholder="Kwota stała (PLN)"
              value={form.fixedPaymentAmount}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fixedPaymentAmount: Number(e.target.value),
                }))
              }
              min={0}
              step={0.01}
              className="w-full rounded-md border-gray-300 p-2"
            />
          )}

          <select
            value={form.vatOption}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                vatOption: e.target.value as VATOption,
              }))
            }
            className="w-full rounded-md border-gray-300 p-2"
          >
            <option value={VATOption.NO_VAT}>Bez VAT</option>
            <option value={VATOption.VAT_8}>VAT 8%</option>
            <option value={VATOption.VAT_23}>VAT 23%</option>
          </select>

          <div>
            <h3 className="mb-2 font-medium">Przypisz apartamenty</h3>
            <div className="max-h-40 overflow-y-auto rounded-md border p-2">
              {apartments.map((apt) => (
                <div key={apt.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`apt-${apt.id}`}
                    checked={form.apartmentIds.includes(parseInt(apt.id))}
                    onChange={() => handleApartmentToggle(apt.id)}
                  />
                  <label htmlFor={`apt-${apt.id}`} className="ml-2">
                    {apt.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-200 px-4 py-2 text-gray-800"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={createOwnerMutation.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              {createOwnerMutation.isPending ? "Dodawanie..." : "Dodaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
