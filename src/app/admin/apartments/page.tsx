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
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    onSuccess: (data) => {
      setStatus({ type: "success", message: data.message });
      void apartmentsListQuery.refetch();
      setDeletingApartmentId(null);
    },
    onError: (error) => {
      setStatus({ type: "error", message: `Błąd usuwania: ${error.message}` });
      setDeletingApartmentId(null);
    },
  });

  const mapReservationsMutation =
    api.apartments.mapFromReservations.useMutation({
      onSuccess: (data) => {
        setStatus({ type: "success", message: data.message });
        void apartmentsListQuery.refetch();
      },
      onError: (error) => {
        setStatus({
          type: "error",
          message: `Błąd mapowania: ${error.message}`,
        });
      },
    });

  const backfillRoomsMutation = api.apartments.backfillRoomsFromReservations.useMutation({
    onSuccess: (data) => {
      setStatus({
        type: "success",
        message: `Utworzono pokoi: ${data.createdRooms}, zaktualizowano rezerwacji: ${data.updatedReservations}`,
      });
      void apartmentsListQuery.refetch();
    },
    onError: (error) => {
      setStatus({
        type: "error",
        message: `Błąd backfillu: ${error.message}`,
      });
    },
  });

  const handleMapReservations = () => {
    setStatus(null);
    mapReservationsMutation.mutate();
  };

  // Filtrowanie apartamentów
  const filteredApartments = useMemo(() => {
    if (!apartmentsListQuery.data?.apartments) return [];

    let filtered = apartmentsListQuery.data.apartments;

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (apartment) =>
          apartment.name.toLowerCase().includes(searchLower) ||
          apartment.slug.toLowerCase().includes(searchLower),
      );
    }

    if (filters.address) {
      const addressLower = filters.address.toLowerCase();
      filtered = filtered.filter((apartment) =>
        apartment.address.toLowerCase().includes(addressLower),
      );
    }

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
            <div className="mt-4 flex flex-wrap gap-3 sm:mt-0">
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
              <button
                onClick={handleMapReservations}
                disabled={
                  mapReservationsMutation.isPending ||
                  apartmentsListQuery.isFetching
                }
                className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
              >
                <svg
                  className={`-ml-0.5 mr-1.5 h-4 w-4 ${mapReservationsMutation.isPending ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {mapReservationsMutation.isPending
                  ? "Mapowanie..."
                  : "Mapuj rezerwacje na apartamenty"}
              </button>
              <button
                onClick={() => backfillRoomsMutation.mutate()}
                disabled={backfillRoomsMutation.isPending}
                className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 disabled:opacity-50"
              >
                {backfillRoomsMutation.isPending ? "Budowanie pokoi..." : "Zbuduj pokoje z rezerwacji"}
              </button>
            </div>
          </div>
        </div>

        {/* Status operacji i ładowania */}
        {(status ??
          (apartmentsListQuery.isError ||
            apartmentsListQuery.isLoading ||
            deleteApartmentMutation.isPending)) && (
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-medium text-gray-900">
              Status operacji
            </h2>
            {status && (
              <div
                className={`rounded-md p-3 text-sm font-medium ${status.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
              >
                {status.message}
              </div>
            )}
            {apartmentsListQuery.isError && (
              <div className="mt-2 text-red-600">
                Błąd ładowania apartamentów: {apartmentsListQuery.error.message}
              </div>
            )}
            {apartmentsListQuery.isLoading && (
              <div className="mt-2 text-blue-600">
                🔄 Ładowanie listy apartamentów...
              </div>
            )}
            {deleteApartmentMutation.isPending && (
              <div className="mt-2 text-blue-600">
                🔄 Usuwanie apartamentu...
              </div>
            )}
          </div>
        )}

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
          <div className="mt-4 text-sm text-gray-600">
            Znaleziono {filteredApartments.length} z{" "}
            {apartmentsListQuery.data?.apartments.length ?? 0} apartamentów
          </div>
        </div>

        {/* Lista apartamentów */}
        <div className="rounded-lg bg-white p-6 shadow">
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
