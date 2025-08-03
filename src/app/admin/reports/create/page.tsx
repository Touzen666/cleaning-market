"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

export default function CreateReportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(
    null,
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string>("");

  // TRPC queries
  const ownersQuery = api.apartmentOwners.getAll.useQuery();
  const selectedOwnerQuery = api.apartmentOwners.getById.useQuery(
    { ownerId: selectedOwnerId },
    { enabled: !!selectedOwnerId },
  );

  // TRPC mutations
  const createReportMutation = api.monthlyReports.create.useMutation({
    onSuccess: (data) => {
      router.push(`/admin/reports/${data.reportId}`);
    },
    onError: (error) => {
      setError(error.message);
      setIsCreating(false);
    },
  });

  const owners = ownersQuery.data ?? [];
  const selectedOwner = selectedOwnerQuery.data;
  const apartments =
    selectedOwner?.ownedApartments?.map((o) => o.apartment) ?? [];

  // Function to determine the correct navigation path based on user role
  const getBackToListPath = () => {
    // Check if user is logged in as owner (has role property set to "OWNER")
    if (
      session?.user &&
      "role" in session.user &&
      session.user.role === "OWNER"
    ) {
      return "/apartamentsOwner/reports";
    }
    // Default to admin reports list
    return "/admin/reports";
  };

  const handleOwnerSelect = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    setSelectedApartmentId(null);
    setError("");
  };

  const handleApartmentSelect = (apartmentId: number) => {
    setSelectedApartmentId(apartmentId);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartmentId) {
      setError("Wybierz apartament");
      return;
    }

    setIsCreating(true);
    setError("");

    try {
      await createReportMutation.mutateAsync({
        apartmentId: selectedApartmentId,
        year: selectedYear,
        month: selectedMonth,
      });
    } catch (error) {
      // Error is already handled in onError
      console.error("Create report error:", error);
    }
  };

  // Generate years for select (current year and few years back/forward)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  // Month names in Polish
  const monthNames = [
    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",
    "Lipiec",
    "Sierpień",
    "Wrzesień",
    "Październik",
    "Listopad",
    "Grudzień",
  ];

  if (ownersQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
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
                Utwórz Nowy Raport
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Wybierz właściciela, apartament i okres raportowania
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => router.push(getBackToListPath())}
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
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Błąd</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Step 1: Select Owner */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                1. Wybierz Właściciela
              </h2>
              {owners.length === 0 ? (
                <p className="text-gray-500">Brak dostępnych właścicieli</p>
              ) : (
                <div className="space-y-2">
                  {owners.map((owner) => (
                    <label
                      key={owner.id}
                      className={`flex cursor-pointer rounded-lg border p-4 transition-colors ${
                        selectedOwnerId === owner.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="owner"
                        value={owner.id}
                        checked={selectedOwnerId === owner.id}
                        onChange={(e) => handleOwnerSelect(e.target.value)}
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {owner.firstName} {owner.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {owner.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          {owner.ownedApartments.length} apartament(ów)
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Step 2: Select Apartment */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-lg font-medium text-gray-900">
                2. Wybierz Apartament
              </h2>
              {!selectedOwnerId ? (
                <p className="text-gray-500">Najpierw wybierz właściciela</p>
              ) : selectedOwnerQuery.isLoading ? (
                <p className="text-gray-500">Ładowanie apartamentów...</p>
              ) : apartments.length === 0 ? (
                <p className="text-gray-500">
                  Ten właściciel nie ma apartamentów
                </p>
              ) : (
                <div className="space-y-2">
                  {apartments.map((apartment) => (
                    <label
                      key={apartment.id}
                      className={`flex cursor-pointer rounded-lg border p-4 transition-colors ${
                        selectedApartmentId === apartment.id
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="apartment"
                        value={apartment.id}
                        checked={selectedApartmentId === apartment.id}
                        onChange={(e) =>
                          handleApartmentSelect(Number(e.target.value))
                        }
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="ml-3">
                        <div className="font-medium text-gray-900">
                          {apartment.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {apartment.address}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Select Period */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              3. Wybierz Okres Raportowania
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rok
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Miesiąc
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Summary */}
          {selectedOwnerId && selectedApartmentId && (
            <div className="rounded-lg bg-blue-50 p-6">
              <h3 className="mb-2 font-medium text-blue-900">Podsumowanie:</h3>
              <div className="text-sm text-blue-800">
                <p>
                  <strong>Właściciel:</strong> {selectedOwner?.firstName}{" "}
                  {selectedOwner?.lastName}
                </p>
                <p>
                  <strong>Apartament:</strong>{" "}
                  {
                    apartments.find((apt) => apt.id === selectedApartmentId)
                      ?.name
                  }
                </p>
                <p>
                  <strong>Okres:</strong> {monthNames[selectedMonth - 1]}{" "}
                  {selectedYear}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push(getBackToListPath())}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!selectedApartmentId || isCreating}
              className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700"
            >
              {isCreating ? (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4 animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Tworzenie...
                </>
              ) : (
                <>
                  <svg
                    className="-ml-1 mr-2 h-4 w-4"
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
                  Utwórz Raport
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
