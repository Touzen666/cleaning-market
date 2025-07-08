"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api, type RouterOutputs } from "@/trpc/react";
import CsvImport from "@/components/CsvImport";
import { toast } from "react-hot-toast";

type ReservationAdmin =
  RouterOutputs["reservation"]["getAll"]["reservations"][0];

export default function AdminReservationsListPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const {
    data: reservationsData,
    isLoading: reservationsLoading,
    error: reservationsError,
    refetch: refetchReservations,
  } = api.reservation.getAll.useQuery(
    { status: selectedStatus ?? undefined },
    { placeholderData: (previousData) => previousData },
  );

  const { data: statusesData, isLoading: statusesLoading } =
    api.reservation.getStatuses.useQuery();

  const csvBatchesQuery = api.csvImport.getImportBatches.useQuery();
  const deleteBatchMutation = api.csvImport.deleteImportBatch.useMutation();

  const reservations = reservationsData?.reservations ?? [];
  const statuses = statusesData ?? [];
  const isLoading = reservationsLoading ?? statusesLoading;
  const error = reservationsError;

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
      await refetchReservations();
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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-brand-gold"></div>
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
                  className="inline-flex items-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
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
                  className="inline-flex items-center rounded-md bg-brand-gold px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-yellow-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-gold"
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
                  value={selectedStatus ?? "all"}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-gold focus:outline-none focus:ring-brand-gold"
                >
                  <option value="all">Wszystkie statusy</option>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-500">
                    Liczba rezerwacji
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {reservations.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela rezerwacji */}
        <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Gość / Apartament
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Przyjazd
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Wyjazd
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Dorośli
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Dzieci
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Płatność
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    Wartość
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Akcje</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.guest}
                      </div>
                      <div className="text-sm text-gray-500">
                        {reservation.apartmentName}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(
                          reservation.status,
                        )}`}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatDate(reservation.start)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {formatDate(reservation.end)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {reservation.adults ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {reservation.children ?? 0}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          reservation.payment.toLowerCase().includes("opłacona")
                            ? "bg-green-100 text-green-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {reservation.payment}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {reservation.paymantValue.toFixed(2)}{" "}
                      {reservation.currency}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        onClick={() =>
                          router.push(`/admin/reservations/${reservation.id}`)
                        }
                        className="text-brand-gold hover:text-yellow-500"
                      >
                        Szczegóły
                        <span className="sr-only">, {reservation.guest}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
