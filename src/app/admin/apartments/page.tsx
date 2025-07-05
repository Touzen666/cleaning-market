"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function ApartmentsManagementPage() {
  const router = useRouter();

  // Dodaj przycisk do synchronizacji i wyświetlanie real-time danych z idobooking
  const syncMutation = api.idobooking.syncDataFromIdobooking.useMutation();

  // Dodaj query do pobierania danych z idobooking
  const apartmentsQuery = api.idobooking.getApartmentsList.useQuery(undefined, {
    enabled: false, // Nie wykonuj automatycznie
  });

  const handleFetchIdobookingData = async () => {
    try {
      console.log("🔄 Pobieranie danych z idobooking...");

      // Pobierz apartamenty
      const apartments = await apartmentsQuery.refetch();
      console.log(" Apartamenty z idobooking:", apartments.data);

      // Pobierz rezerwacje (ostatnie 3 miesiące)
      const dateFrom = new Date();
      dateFrom.setMonth(dateFrom.getMonth() - 3);
      const dateTo = new Date();
      dateTo.setMonth(dateTo.getMonth() + 1);

      // Możesz dodać więcej endpointów do pobierania danych
      console.log("📅 Zakres dat dla rezerwacji:", {
        from: dateFrom.toISOString().split("T")[0],
        to: dateTo.toISOString().split("T")[0],
      });

      console.log(
        "✅ Dane z idobooking zostały pobrane i wyświetlone w konsoli",
      );
    } catch (error) {
      console.error("❌ Błąd podczas pobierania danych z idobooking:", error);
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
                Zarządzanie Apartamentami
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Dodawaj nowe apartamenty i edytuj istniejące ustawienia
              </p>
            </div>
            <div className="mt-4 flex gap-3 sm:mt-0">
              <button
                onClick={() => router.push("/admin")}
                className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
              >
                Powrót do panelu
              </button>

              {/* Przycisk do pobierania danych z idobooking */}
              <button
                onClick={handleFetchIdobookingData}
                disabled={apartmentsQuery.isFetching}
                className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 disabled:opacity-50"
              >
                {apartmentsQuery.isFetching ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Pobieranie...
                  </>
                ) : (
                  <>
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    Pobierz dane z idobooking
                  </>
                )}
              </button>

              {/* Przycisk do synchronizacji */}
              <button
                onClick={() => syncMutation.mutate()}
                disabled={syncMutation.isPending}
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                {syncMutation.isPending ? (
                  <>
                    <svg
                      className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Synchronizowanie...
                  </>
                ) : (
                  <>
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Sync z idobooking
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4">
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              Status operacji
            </h2>
            {apartmentsQuery.isFetching && (
              <div className="text-blue-600">
                🔄 Pobieranie danych z idobooking...
              </div>
            )}
            {apartmentsQuery.isSuccess && (
              <div className="text-green-600">
                ✅ Dane zostały pobrane i wyświetlone w konsoli
              </div>
            )}
            {apartmentsQuery.isError && (
              <div className="text-red-600">
                ❌ Błąd: {apartmentsQuery.error.message}
              </div>
            )}
            {syncMutation.isPending && (
              <div className="text-blue-600">
                🔄 Synchronizowanie danych z idobooking...
              </div>
            )}
            {syncMutation.isSuccess && (
              <div className="text-green-600">
                ✅ {syncMutation.data.message}
              </div>
            )}
            {syncMutation.isError && (
              <div className="text-red-600">
                ❌ Błąd synchronizacji: {syncMutation.error.message}
              </div>
            )}
          </div>

          <p className="text-gray-500">
            Panel zarządzania apartamentami będzie tutaj...
          </p>
        </div>
      </div>
    </div>
  );
}
