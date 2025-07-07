"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import ApartmentList from "@/components/ApartmentList";

export default function ApartmentsManagementPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({
    search: "",
    owner: "",
    address: "",
  });

  // Dodaj przycisk do synchronizacji i wyświetlanie real-time danych z idobooking
  const syncMutation = api.idobooking.syncDataFromIdobooking.useMutation();

  // Dodaj query do pobierania danych z idobooking
  const apartmentsQuery = api.idobooking.getApartmentsList.useQuery(undefined, {
    enabled: false, // Nie wykonuj automatycznie
  });

  // Query do pobierania listy apartamentów
  const apartmentsListQuery = api.apartments.getAll.useQuery();

  // Query do pobierania właścicieli (dla filtra)
  const ownersQuery = api.apartmentOwners.getAll.useQuery();

  // Stan do śledzenia, który apartament jest usuwany
  const [deletingApartmentId, setDeletingApartmentId] = useState<string | null>(
    null,
  );

  // Mutacja do usuwania apartamentów
  const deleteApartmentMutation = api.apartments.delete.useMutation({
    onSuccess: () => {
      // Odśwież listę apartamentów po usunięciu
      void apartmentsListQuery.refetch();
      setDeletingApartmentId(null);
    },
    onError: () => {
      setDeletingApartmentId(null);
    },
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

  // Filtrowanie apartamentów
  const filteredApartments = useMemo(() => {
    if (!apartmentsListQuery.data?.apartments) return [];

    let filtered = apartmentsListQuery.data.apartments;

    // Filtr po nazwie (search)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (apartment) =>
          apartment.name.toLowerCase().includes(searchLower) ||
          apartment.slug.toLowerCase().includes(searchLower),
      );
    }

    // Filtr po adresie
    if (filters.address) {
      const addressLower = filters.address.toLowerCase();
      filtered = filtered.filter((apartment) =>
        apartment.address.toLowerCase().includes(addressLower),
      );
    }

    // Filtr po właścicielu (jeśli mamy dane o właścicielach)
    if (filters.owner && ownersQuery.data) {
      const selectedOwner = ownersQuery.data.find(
        (owner) => owner.id === filters.owner,
      );
      if (selectedOwner) {
        const ownerApartmentIds = selectedOwner.ownedApartments.map(
          (ownership) => ownership.apartment.id.toString(),
        );
        filtered = filtered.filter((apartment) =>
          ownerApartmentIds.includes(apartment.id),
        );
      }
    }

    return filtered;
  }, [apartmentsListQuery.data, ownersQuery.data, filters]);

  const handleEdit = (apartmentId: string) => {
    router.push(`/admin/apartments/${apartmentId}`);
  };

  const handleDelete = (apartmentId: string) => {
    const apartment = apartmentsListQuery.data?.apartments.find(
      (apt) => apt.id === apartmentId,
    );
    if (
      apartment &&
      confirm(`Czy na pewno chcesz usunąć apartament "${apartment.name}"?`)
    ) {
      setDeletingApartmentId(apartmentId);
      deleteApartmentMutation.mutate({ id: apartmentId });
    }
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      owner: "",
      address: "",
    });
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

              <button
                onClick={() => router.push("/admin/apartments/new")}
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
                Dodaj apartament
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

        {/* Status operacji */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
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
            <div className="text-green-600">✅ {syncMutation.data.message}</div>
          )}
          {syncMutation.isError && (
            <div className="text-red-600">
              ❌ Błąd synchronizacji: {syncMutation.error.message}
            </div>
          )}
          {deleteApartmentMutation.isPending && (
            <div className="text-blue-600">🔄 Usuwanie apartamentu...</div>
          )}
          {deleteApartmentMutation.isSuccess && (
            <div className="text-green-600">
              ✅ {deleteApartmentMutation.data.message}
            </div>
          )}
          {deleteApartmentMutation.isError && (
            <div className="text-red-600">
              ❌ Błąd usuwania: {deleteApartmentMutation.error.message}
            </div>
          )}
        </div>

        {/* Filtry */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Filtry wyszukiwania
            </h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Wyczyść filtry
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Filtr po nazwie/slugu */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nazwa lub slug
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Wyszukaj po nazwie..."
                className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>

            {/* Filtr po właścicielu */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Właściciel
              </label>
              <select
                value={filters.owner}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, owner: e.target.value }))
                }
                className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Wszyscy właściciele</option>
                {ownersQuery.data?.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName} ({owner.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr po adresie */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Adres
              </label>
              <input
                type="text"
                value={filters.address}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder="Wyszukaj po adresie..."
                className="w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Statystyki filtrów */}
          <div className="mt-4 text-sm text-gray-600">
            Znaleziono {filteredApartments.length} z{" "}
            {apartmentsListQuery.data?.apartments.length ?? 0} apartamentów
          </div>
        </div>

        {/* Lista apartamentów */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Lista apartamentów
            </h2>
            {(apartmentsListQuery.isLoading ||
              apartmentsListQuery.isRefetching) && (
              <div className="text-sm text-gray-500">Ładowanie...</div>
            )}
          </div>

          {(apartmentsListQuery.isLoading ||
            apartmentsListQuery.isRefetching) && (
            <div className="py-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <p className="mt-2 text-gray-600">
                {apartmentsListQuery.isLoading
                  ? "Ładowanie apartamentów..."
                  : "Odświeżanie listy..."}
              </p>
            </div>
          )}

          {apartmentsListQuery.isError && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-red-800">
                Błąd ładowania apartamentów: {apartmentsListQuery.error.message}
              </p>
            </div>
          )}

          {apartmentsListQuery.isSuccess && (
            <ApartmentList
              apartments={filteredApartments}
              mode="admin"
              onEdit={handleEdit}
              onDelete={handleDelete}
              showActions={true}
              deletingApartmentId={deletingApartmentId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
