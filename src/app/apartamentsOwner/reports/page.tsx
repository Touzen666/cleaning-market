"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type OwnerReport = RouterOutputs["monthlyReports"]["getOwnerReports"][0];

export default function OwnerReportsPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // TRPC queries
  const {
    data: reports,
    isLoading: reportsLoading,
    error: reportsError,
  } = api.monthlyReports.getOwnerReports.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  useEffect(() => {
    const token = localStorage.getItem("ownerSessionToken");
    const email = localStorage.getItem("ownerEmail");

    if (!token || !email) {
      router.push("/apartamentsOwner/login");
      return;
    }

    setOwnerEmail(email);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    router.push("/apartamentsOwner/login");
  };

  const handleViewReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setShowReportModal(true);
  };

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setSelectedReportId(null);
  };

  const selectedReport = reports?.find(
    (report) => report.id === selectedReportId,
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "Zatwierdzony";
      case "SENT":
        return "Wysłany";
      default:
        return status;
    }
  };

  const getItemTypeText = (type: string) => {
    switch (type) {
      case "REVENUE":
        return "Przychód";
      case "EXPENSE":
        return "Wydatek";
      case "FEE":
        return "Opłata";
      case "TAX":
        return "Podatek";
      case "COMMISSION":
        return "Prowizja";
      default:
        return type;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case "REVENUE":
        return "bg-green-100 text-green-800";
      case "EXPENSE":
        return "bg-red-100 text-red-800";
      case "FEE":
        return "bg-orange-100 text-orange-800";
      case "TAX":
        return "bg-purple-100 text-purple-800";
      case "COMMISSION":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Handle error state
  if (reportsError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">{reportsError.message}</p>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Zaloguj się ponownie
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (reportsLoading || !reports) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Moje Raporty Finansowe
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/apartamentsOwner/dashboard")}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
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
                Panel Główny
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Raporty Finansowe
          </h2>
          <p className="text-gray-600">
            Przeglądaj zatwierdzone raporty miesięczne z rozliczeniem
            przychodów, kosztów i prowizji
          </p>
        </div>

        {/* Reports List */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Zatwierdzone Raporty ({reports.length})
            </h3>
          </div>

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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                Brak zatwierdzonych raportów
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Administrator jeszcze nie zatwierdził żadnych raportów
                miesięcznych.
              </p>
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
                      Przychody
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Koszty/Prowizje
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Zysk Netto
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
                        {report.month.toString().padStart(2, "0")}/{report.year}
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                        {report.totalRevenue.toFixed(2)} PLN
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                        {report.totalExpenses.toFixed(2)} PLN
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <span
                          className={`${
                            report.netIncome >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
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
                        <button
                          onClick={() => handleViewReport(report.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Zobacz szczegóły
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Report Details Modal */}
      {showReportModal && selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={handleCloseReportModal}
          getItemTypeText={getItemTypeText}
          getItemTypeColor={getItemTypeColor}
        />
      )}
    </div>
  );
}

// Report Details Modal Component
function ReportDetailsModal({
  report,
  onClose,
  getItemTypeText,
  getItemTypeColor,
}: {
  report: OwnerReport;
  onClose: () => void;
  getItemTypeText: (type: string) => string;
  getItemTypeColor: (type: string) => string;
}) {
  const revenueItems = report.items.filter((item) => item.type === "REVENUE");
  const expenseItems = report.items.filter((item) =>
    ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(item.type),
  );

  // Funkcja obliczająca liczbę nocy między datami
  const calculateNights = (checkIn: Date, checkOut: Date) => {
    const oneDay = 24 * 60 * 60 * 1000; // milisekundy w dniu
    const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.round(diffTime / oneDay);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="m-4 max-h-screen w-full max-w-6xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Raport {report.month.toString().padStart(2, "0")}/{report.year}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {report.apartment.name} - {report.apartment.address}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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

        {/* Content */}
        <div className="max-h-96 overflow-y-auto p-6">
          {/* Financial Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center">
                <div className="rounded-lg bg-green-500 p-2">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    Przychody
                  </p>
                  <p className="text-lg font-bold text-green-800">
                    {report.totalRevenue.toFixed(2)} PLN
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 p-4">
              <div className="flex items-center">
                <div className="rounded-lg bg-red-500 p-2">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-900">
                    Koszty/Prowizje
                  </p>
                  <p className="text-lg font-bold text-red-800">
                    {report.totalExpenses.toFixed(2)} PLN
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`rounded-lg p-4 ${report.netIncome >= 0 ? "bg-blue-50" : "bg-red-50"}`}
            >
              <div className="flex items-center">
                <div
                  className={`rounded-lg p-2 ${report.netIncome >= 0 ? "bg-blue-500" : "bg-red-500"}`}
                >
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p
                    className={`text-sm font-medium ${report.netIncome >= 0 ? "text-blue-900" : "text-red-900"}`}
                  >
                    Zysk Netto
                  </p>
                  <p
                    className={`text-lg font-bold ${report.netIncome >= 0 ? "text-blue-800" : "text-red-800"}`}
                  >
                    {report.netIncome.toFixed(2)} PLN
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Items */}
          <div className="mb-6">
            <h4 className="mb-3 text-lg font-medium text-gray-900">
              Rezerwacje i Przychody ({revenueItems.length})
            </h4>
            {revenueItems.length === 0 ? (
              <p className="text-gray-500">Brak rezerwacji w tym okresie</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Gość
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Źródło Rezerwacji
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Okres Pobytu
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Noce
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {revenueItems.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.reservation?.guest ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {item.reservation?.source ?? "Nieznane"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {item.reservation ? (
                            <>
                              {new Date(
                                item.reservation.start,
                              ).toLocaleDateString("pl-PL")}{" "}
                              -{" "}
                              {new Date(
                                item.reservation.end,
                              ).toLocaleDateString("pl-PL")}
                            </>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-center text-sm">
                          {item.reservation ? (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                              {calculateNights(
                                item.reservation.start,
                                item.reservation.end,
                              )}{" "}
                              {calculateNights(
                                item.reservation.start,
                                item.reservation.end,
                              ) === 1
                                ? "noc"
                                : "nocy"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-green-600">
                          +{item.amount.toFixed(2)} {item.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Expense Items */}
          <div>
            <h4 className="mb-3 text-lg font-medium text-gray-900">
              Koszty i Prowizje ({expenseItems.length})
            </h4>
            {expenseItems.length === 0 ? (
              <p className="text-gray-500">
                Brak dodatkowych kosztów w tym okresie
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Typ
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kanał/Kategoria
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Opis
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {expenseItems.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getItemTypeColor(
                              item.type,
                            )}`}
                          >
                            {getItemTypeText(item.type)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.description}
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-red-600">
                          -{item.amount.toFixed(2)} {item.currency}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
