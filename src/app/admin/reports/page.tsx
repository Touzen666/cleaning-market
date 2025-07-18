"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  type ReportStatus,
  ReportStatus as ReportStatusEnum,
} from "@prisma/client";
import {
  ArrowPathIcon,
  InformationCircleIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { toast, Toaster } from "react-hot-toast";

export default function AdminReportsPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | "">("");
  const [selectedOwner, setSelectedOwner] = useState<string>("");

  // TRPC queries
  const reportsQuery = api.monthlyReports.getAll.useQuery({
    status: selectedStatus || undefined,
    ownerId: selectedOwner || undefined,
  });

  const ownersQuery = api.apartmentOwners.getAll.useQuery();

  // TRPC mutations
  const recalculateAllMutation =
    api.monthlyReports.recalculateAllApprovedReports.useMutation({
      onSuccess: (data) => {
        alert(
          `Operacja zakończona!\n\nPrzeliczono pomyślnie: ${data.successCount}\nBłędy: ${data.errorCount}\nŁącznie: ${data.total}`,
        );
        void reportsQuery.refetch();
      },
      onError: (error) => {
        alert(`Wystąpił błąd: ${error.message}`);
      },
    });

  const updateStatusMutation = api.monthlyReports.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Zmieniono status raportu!");
      void reportsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const sendReportMutation = api.monthlyReports.sendReport.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void reportsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const reports = reportsQuery.data ?? [];
  const owners = ownersQuery.data ?? [];

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: ReportStatus) => {
    switch (status) {
      case "DRAFT":
        return "Szkic";
      case "REVIEW":
        return "Do przeglądu";
      case "APPROVED":
        return "Zatwierdzony";
      case "SENT":
        return "Wysłany";
      default:
        return status;
    }
  };

  const handleStatusChange = async (
    reportId: string,
    newStatus: ReportStatus,
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        reportId,
        status: newStatus,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  if (reportsQuery.isLoading || ownersQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900">Raportownia</h1>
              <p className="mt-2 text-sm text-gray-600">
                Zarządzaj raportami miesięcznymi i rozliczeniami
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/admin/owners")}
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
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Właściciele
                </button>
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
                  onClick={() => router.push("/admin/reports/create")}
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Nowy Raport
                </button>
                <button
                  onClick={() => recalculateAllMutation.mutate()}
                  disabled={recalculateAllMutation.isPending}
                  className="inline-flex items-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 hover:bg-orange-500"
                >
                  <ArrowPathIcon
                    className={`-ml-0.5 mr-1.5 h-5 w-5 ${recalculateAllMutation.isPending ? "animate-spin" : ""}`}
                  />
                  {recalculateAllMutation.isPending
                    ? "Przeliczanie..."
                    : "Przelicz Stare Raporty"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as ReportStatus | "")
                }
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Wszystkie statusy</option>
                <option value="DRAFT">Szkic</option>
                <option value="REVIEW">Do przeglądu</option>
                <option value="APPROVED">Zatwierdzony</option>
                <option value="SENT">Wysłany</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Właściciel
              </label>
              <select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="">Wszyscy właściciele</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedStatus("");
                  setSelectedOwner("");
                }}
                className="w-full rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Wyczyść filtry
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="rounded-lg bg-gray-500 p-2">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Szkice
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {
                        reports.filter(
                          (r) => r.status === ReportStatusEnum.DRAFT,
                        ).length
                      }
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
                  <div className="rounded-lg bg-yellow-500 p-2">
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
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Do przeglądu
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {
                        reports.filter(
                          (r) => r.status === ReportStatusEnum.REVIEW,
                        ).length
                      }
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
                  <div className="rounded-lg bg-green-500 p-2">
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
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Zatwierdzone
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {
                        reports.filter(
                          (r) => r.status === ReportStatusEnum.APPROVED,
                        ).length
                      }
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
                  <div className="rounded-lg bg-blue-500 p-2">
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="truncate text-sm font-medium text-gray-500">
                      Wysłane
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {
                        reports.filter(
                          (r) => r.status === ReportStatusEnum.SENT,
                        ).length
                      }
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Table */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Raporty miesięczne
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {reports.length === 0 ? (
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
                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Brak raportów
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Zacznij od utworzenia nowego raportu miesięcznego.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push("/admin/reports/create")}
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
                    Nowy Raport
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Okres
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Apartament
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Właściciel
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Przychody
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Wydatki
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Zysk netto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Akcje</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {report.month.toString().padStart(2, "0")}/
                          {report.year}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {report.apartment.name}
                            </div>
                            <div className="text-gray-500">
                              {report.apartment.address}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {report.owner.firstName} {report.owner.lastName}
                            </div>
                            <div className="text-gray-500">
                              {report.owner.email}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {report.totalRevenue.toFixed(2)} PLN
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {report.totalExpenses.toFixed(2)} PLN
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          <span
                            className={
                              report.netIncome >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {report.netIncome.toFixed(2)} PLN
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                              report.status,
                            )}`}
                          >
                            {getStatusText(report.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() =>
                                router.push(`/admin/reports/${report.id}`)
                              }
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Szczegóły
                            </button>
                            {report.status === "DRAFT" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(report.id, "REVIEW")
                                }
                                disabled={updateStatusMutation.isPending}
                                className="text-indigo-600 disabled:opacity-50 hover:text-indigo-900"
                              >
                                {updateStatusMutation.isPending
                                  ? "Przekazywanie..."
                                  : "Przekaż do weryfikacji"}
                              </button>
                            )}
                            {report.status === "REVIEW" && (
                              <button
                                onClick={() =>
                                  handleStatusChange(report.id, "APPROVED")
                                }
                                disabled={updateStatusMutation.isPending}
                                className="text-green-600 disabled:opacity-50 hover:text-green-900"
                              >
                                {updateStatusMutation.isPending
                                  ? "Zatwierdzanie..."
                                  : "Zatwierdź"}
                              </button>
                            )}
                            {report.status === "APPROVED" && (
                              <button
                                onClick={() =>
                                  sendReportMutation.mutate({
                                    reportId: report.id,
                                  })
                                }
                                disabled={sendReportMutation.isPending}
                                className="flex items-center text-blue-600 disabled:opacity-50 hover:text-blue-900"
                              >
                                <PaperAirplaneIcon className="mr-1 h-4 w-4" />
                                {sendReportMutation.isPending
                                  ? "Wysyłanie..."
                                  : "Wyślij"}
                              </button>
                            )}
                            {!report.finalSettlementType &&
                              report.status !== "SENT" && (
                                <div
                                  className="group relative"
                                  title="Przejdź do szczegółów raportu, aby wybrać ostateczny sposób rozliczenia. Jest to wymagane, aby zatwierdzić lub wysłać raport."
                                >
                                  <InformationCircleIcon className="h-5 w-5 text-gray-400" />
                                </div>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
