"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { type ReportStatus } from "@prisma/client";

export default function OwnerReportsPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

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
    router.push(`/apartamentsOwner/reports/${reportId}`);
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
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
      case "APPROVED":
        return "Zatwierdzony";
      case "SENT":
        return "Wysłany";
      default:
        return status;
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
                      Apartament
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Data
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        {String(report.month).padStart(2, "0")}/{report.year}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(report.status)}`}
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
    </div>
  );
}
