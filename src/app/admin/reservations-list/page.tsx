"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import CsvImport from "@/components/CsvImport";
import { toast } from "react-hot-toast";

type ReservationAdmin =
  RouterOutputs["reservation"]["getAllAdmin"]["reservations"][0];

export default function AdminReservationsListPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const { data, isLoading, error } = api.reservation.getAllAdmin.useQuery(
    { status: selectedStatus ?? undefined },
    { keepPreviousData: true },
  );

  const reservations = data?.reservations ?? [];
  const statuses = data?.statuses ?? [];

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status === "all" ? null : status);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (date: Date) => {
    return new Date(date).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "przyjęta":
        return "bg-green-100 text-green-800";
      case "zakończona":
        return "bg-blue-100 text-blue-800";
      case "anulowana przez klienta":
        return "bg-red-100 text-red-800";
      case "anulowana":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const handleDeleteBatch = async (importBatchId: string) => {
    if (
      !window.confirm(
        "Czy na pewno chcesz usunąć wszystkie rekordy z tego importu CSV?",
      )
    )
      return;
    try {
      await deleteBatchMutation.mutateAsync({ importBatchId });
      toast.success("Import CSV został usunięty.");
      await csvBatchesQuery.refetch();
      await reservationsQuery.refetch();
    } catch (error) {
      toast.error("Błąd podczas usuwania importu CSV");
      console.error(error);
    }
  };

  const isDeleting = deleteBatchMutation.status === "pending";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="border-brand-gold mx-auto h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="mt-4 text-gray-600">Ładowanie rezerwacji...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Błąd: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Lista Wszystkich Rezerwacji
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Zarządzaj wszystkimi rezerwacjami w systemie
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowImport(!showImport)}
                  className="bg-brand-gold focus-visible:outline-brand-gold inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Import CSV
                </button>
                <button
                  onClick={() => router.push("/admin/reservations")}
                  className="bg-brand-gold focus-visible:outline-brand-gold inline-flex items-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
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
                  Dodaj Rezerwację
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Import CSV Section */}
        {showImport && (
          <div className="mb-8">
            <CsvImport />
          </div>
        )}

        {/* Sekcja: Batchy importów CSV */}
        <div className="mb-8">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">
              Importy CSV
            </h3>
            {csvBatchesQuery.isLoading ? (
              <div>Ładowanie...</div>
            ) : csvBatchesQuery.data && csvBatchesQuery.data.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Batch ID</th>
                    <th className="px-2 py-1 text-left">Liczba rekordów</th>
                    <th className="px-2 py-1 text-left">Data importu</th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {csvBatchesQuery.data.map((batch) => (
                    <tr key={batch.importBatchId}>
                      <td className="px-2 py-1 font-mono text-xs">
                        {batch.importBatchId}
                      </td>
                      <td className="px-2 py-1">{batch.count}</td>
                      <td className="px-2 py-1">
                        {batch.minDate
                          ? new Date(batch.minDate).toLocaleString("pl-PL")
                          : "-"}
                      </td>
                      <td className="px-2 py-1">
                        <button
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                          onClick={() => handleDeleteBatch(batch.importBatchId)}
                          disabled={isDeleting}
                        >
                          Usuń import
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-gray-500">Brak importów CSV.</div>
            )}
          </div>
        </div>

        {/* Filtry i statystyki */}
        <div className="mb-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-gray-700">
                  Filtruj po statusie:
                </label>
                <select
                  value={selectedStatus || "all"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="focus:border-brand-gold focus:ring-brand-gold rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="all">Wszystkie statusy</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium">{reservations.length}</span>{" "}
                rezerwacji
                {selectedStatus !== "all" && (
                  <span> ze statusem "{selectedStatus}"</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lista rezerwacji */}
        <div className="overflow-hidden bg-white shadow sm:rounded-md">
          {reservations.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Brak rezerwacji
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {selectedStatus === "all"
                  ? "Nie ma jeszcze żadnych rezerwacji w systemie."
                  : `Nie ma rezerwacji ze statusem "${selectedStatus}".`}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {reservations.map((reservation: ReservationAdmin) => (
                <li key={reservation.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                              <svg
                                className="text-brand-gold h-6 w-6"
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
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {reservation.guest}
                            </p>
                            <p className="text-sm text-gray-500">
                              {reservation.apartmentName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                              reservation.status,
                            )}`}
                          >
                            {reservation.status}
                          </span>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {reservation.paymantValue} {reservation.currency}
                            </p>
                            <p className="text-xs text-gray-500">
                              {reservation.source}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <span>
                            Przyjazd: {formatDateTime(reservation.start)}
                          </span>
                          <span>Wyjazd: {formatDateTime(reservation.end)}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span>
                            Utworzono: {formatDate(reservation.createDate)}
                          </span>
                          {reservation.idobookingId && (
                            <span className="rounded bg-gray-100 px-2 py-1 text-xs">
                              ID: {reservation.idobookingId}
                            </span>
                          )}
                        </div>
                      </div>
                      {reservation.adults || reservation.children ? (
                        <div className="mt-1 text-xs text-gray-400">
                          {reservation.adults} dorosłych
                          {reservation.children > 0 &&
                            `, ${reservation.children} dzieci`}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
