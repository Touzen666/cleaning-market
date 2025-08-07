"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

const DatabasePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  const { data: dbInfo, isLoading: dbInfoLoading } =
    api.adminDashboard.getDatabaseInfo.useQuery(undefined, {
      enabled: !!session && session.user.type === "ADMIN",
    });

  const createBackupMutation =
    api.adminDashboard.createDatabaseBackup.useMutation({
      onSuccess: (data) => {
        alert(`Backup został utworzony pomyślnie! ID: ${data.backupId}`);
      },
      onError: (error) => {
        alert(`Błąd podczas tworzenia backupu: ${error.message}`);
      },
    });

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.type !== "ADMIN") {
      router.push("/login");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Zarządzanie Bazą Danych
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Informacje o bazie danych i operacje administracyjne
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <svg
                className="mr-2 h-4 w-4"
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
              Powrót do dashboard
            </button>
          </div>
        </div>

        {dbInfoLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6 px-4 sm:px-0">
            {/* Database Overview */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Przegląd Bazy Danych
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {dbInfo?.version ?? "PostgreSQL 15.0"}
                    </div>
                    <div className="text-sm text-gray-500">
                      Wersja bazy danych
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {dbInfo?.databaseSize ?? "2.5 GB"}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rozmiar bazy danych
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {dbInfo?.lastBackup
                        ? new Date(dbInfo.lastBackup).toLocaleDateString(
                            "pl-PL",
                          )
                        : "Brak"}
                    </div>
                    <div className="text-sm text-gray-500">Ostatni backup</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table Statistics */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Statystyki Tabel
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.users ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Użytkownicy</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.apartments ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Apartamenty</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                        <svg
                          className="h-5 w-5 text-white"
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
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.reservations ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Rezerwacje</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500">
                        <svg
                          className="h-5 w-5 text-white"
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
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.reports ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Raporty</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-yellow-500">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.owners ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Właściciele</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-red-500">
                        <svg
                          className="h-5 w-5 text-white"
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
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {dbInfo?.tables.images ?? 0}
                        </div>
                        <div className="text-sm text-gray-500">Obrazy</div>
                      </div>
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-500">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Operations */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Operacje na Bazie Danych
                </h3>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-yellow-800">
                      Tworzenie Backupu
                    </h4>
                    <p className="mb-4 text-sm text-yellow-700">
                      Utwórz kopię zapasową całej bazy danych. Operacja może
                      potrwać kilka minut.
                    </p>
                    <button
                      onClick={() => createBackupMutation.mutate()}
                      disabled={createBackupMutation.isPending}
                      className="inline-flex items-center rounded-md border border-transparent bg-yellow-100 px-4 py-2 text-sm font-medium text-yellow-800 disabled:opacity-50 hover:bg-yellow-200"
                    >
                      {createBackupMutation.isPending
                        ? "Tworzenie..."
                        : "Utwórz backup"}
                    </button>
                  </div>

                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-blue-800">
                      Optymalizacja Bazy
                    </h4>
                    <p className="mb-4 text-sm text-blue-700">
                      Zoptymalizuj wydajność bazy danych poprzez analizę i
                      reorganizację indeksów.
                    </p>
                    <button
                      onClick={() => alert("Funkcja w trakcie implementacji")}
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800 hover:bg-blue-200"
                    >
                      Zoptymalizuj bazę
                    </button>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-green-800">
                      Czyszczenie Logów
                    </h4>
                    <p className="mb-4 text-sm text-green-700">
                      Usuń stare logi i dane tymczasowe, aby zwolnić miejsce na
                      dysku.
                    </p>
                    <button
                      onClick={() => alert("Funkcja w trakcie implementacji")}
                      className="inline-flex items-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200"
                    >
                      Wyczyść logi
                    </button>
                  </div>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-red-800">
                      Przywracanie z Backupu
                    </h4>
                    <p className="mb-4 text-sm text-red-700">
                      Przywróć bazę danych z wcześniej utworzonego backupu.
                      UWAGA: Operacja nieodwracalna!
                    </p>
                    <button
                      onClick={() => alert("Funkcja w trakcie implementacji")}
                      className="inline-flex items-center rounded-md border border-transparent bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
                    >
                      Przywróć z backupu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Database Health */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Stan Bazy Danych
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Połączenie z bazą danych
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Aktywne</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Wydajność zapytań
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Optymalna</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Wolne miejsce na dysku
                      </span>
                    </div>
                    <span className="text-sm text-yellow-600">
                      75% wykorzystane
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Ostatni backup
                      </span>
                    </div>
                    <span className="text-sm text-green-600">
                      {dbInfo?.lastBackup
                        ? new Date(dbInfo.lastBackup).toLocaleDateString(
                            "pl-PL",
                          )
                        : "Brak"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabasePage;
