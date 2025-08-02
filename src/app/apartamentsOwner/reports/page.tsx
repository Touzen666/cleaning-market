"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { type ReportStatus } from "@prisma/client";
import Image from "next/image";

export default function OwnerReportsPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  // TRPC queries
  const {
    data: reports,
    isLoading: reportsLoading,
    error: reportsError,
  } = api.monthlyReports.getOwnerReports.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  // Debug query
  const {
    data: debugData,
    isLoading: debugLoading,
    error: debugError,
  } = api.monthlyReports.debugOwnerReports.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  // Dashboard data for comparison
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error: dashboardError,
  } = api.ownerAuth.getDashboardData.useQuery(undefined, {
    enabled: !!ownerEmail,
  });

  // Recalculation mutation
  const recalculateMutation =
    api.monthlyReports.recalculateSingleReport.useMutation({
      onSuccess: () => {
        // Refetch the debug data to see updated values
        window.location.reload();
      },
      onError: (error) => {
        console.error("Recalculation failed:", error);
        alert(`Błąd przeliczania: ${error.message}`);
      },
    });

  // Debug logging
  console.log("Reports data:", reports);
  console.log("Reports length:", reports?.length);
  if (reports && reports.length > 0) {
    console.log("First report:", reports[0]);
    console.log(
      "All finalOwnerPayout values:",
      reports.map((r) => r.finalOwnerPayout),
    );
    console.log(
      "Sum calculation:",
      reports.reduce((sum, report) => sum + (report.finalOwnerPayout ?? 0), 0),
    );
  }
  console.log("Debug data:", debugData);

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
    setLoadingReportId(reportId);
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
            className="rounded-lg bg-brand-gold px-4 py-2 text-white hover:bg-yellow-500"
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
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-brand-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-auto min-h-[4rem] flex-col items-start justify-center py-2 sm:h-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-2 flex-shrink-0 sm:mb-0">
              <h1 className="text-xl font-bold text-gray-900">
                Moje Raporty Finansowe
              </h1>
            </div>
            <div className="flex items-center">
              <button
                onClick={() => router.push("/apartamentsOwner/dashboard")}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-gray-50"
              >
                <svg
                  className="h-5 w-5 sm:mr-1.5"
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
                <span className="hidden sm:inline">Panel Główny</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Spis treści raportów */}
        {debugLoading ? (
          <div className="mb-8 overflow-hidden rounded-xl border border-yellow-300 bg-gradient-to-br from-yellow-100 via-amber-200 to-orange-300 p-6 shadow-lg">
            <div className="mb-4 flex items-center">
              <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-400">
                <svg
                  className="h-5 w-5 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-xl font-bold text-transparent">
                Spis treści raportów
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
              {/* First Column - Stats Placeholder */}
              <div className="space-y-3">
                <div className="rounded-lg border border-purple-100 bg-white/70 p-4 backdrop-blur-sm">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-purple-200"></div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-purple-200"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-28 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-8 animate-pulse rounded bg-green-200"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-8 animate-pulse rounded bg-blue-200"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-8 animate-pulse rounded bg-orange-200"></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-pink-100 bg-white/70 p-4 backdrop-blur-sm">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-pink-200"></div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-green-200"></div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-orange-100 bg-white/70 p-4 backdrop-blur-sm">
                  <div className="mb-3 h-4 w-32 animate-pulse rounded bg-orange-200"></div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-blue-200"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-12 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-pink-200"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-3 w-20 animate-pulse rounded bg-orange-200"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Second Column - All Reports Placeholder */}
              <div className="rounded-lg border border-blue-100 bg-white/70 p-4 backdrop-blur-sm">
                <div className="mb-3 h-4 w-32 animate-pulse rounded bg-blue-200"></div>
                <div className="space-y-2">
                  {[1, 2].map((index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-2"
                    >
                      <div className="h-4 w-12 animate-pulse rounded bg-gray-200"></div>
                      <div className="flex items-center space-x-2">
                        <div className="h-5 w-16 animate-pulse rounded-full bg-green-200"></div>
                        <div className="h-4 w-16 animate-pulse rounded bg-green-200"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          debugData && (
            <div className="mb-8 overflow-hidden rounded-xl border border-yellow-300 bg-gradient-to-br from-yellow-100 via-amber-200 to-orange-300 p-6 shadow-lg">
              <div className="mb-4 flex items-center">
                <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-400">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-xl font-bold text-transparent">
                  Spis treści raportów
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
                {/* First Column - Stats */}
                <div className="space-y-3">
                  <div className="rounded-lg border border-purple-100 bg-white/70 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <h4 className="mb-3 flex items-center font-semibold text-purple-700">
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Informacje o właścicielu
                    </h4>
                    <div className="space-y-2">
                      <p className="flex justify-between">
                        <span className="text-gray-600">ID Właściciela:</span>
                        <span className="rounded bg-purple-100 px-2 py-1 font-mono text-xs text-purple-800">
                          {debugData.ownerId}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">
                          Wszystkie Raporty:
                        </span>
                        <span className="animate-pulse font-bold text-green-600">
                          {debugData.allReportsCount}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">Zatwierdzone:</span>
                        <span className="font-bold text-blue-600">
                          {debugData.approvedReportsCount}
                        </span>
                      </p>
                      <p className="flex justify-between">
                        <span className="text-gray-600">
                          Dokładne Zapytanie:
                        </span>
                        <span className="font-bold text-orange-600">
                          {debugData.exactQueryReportsCount}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-pink-100 bg-white/70 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <h4 className="mb-3 flex items-center font-semibold text-pink-700">
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                      </svg>
                      Podsumowanie Finansowe
                    </h4>
                    <div className="space-y-2">
                      <p className="flex justify-between">
                        <span className="text-gray-600">Bieżący Rok:</span>
                        <span className="font-bold text-green-600">
                          {debugData.currentYearSum?.toFixed(2) ?? "null"} PLN
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Revenue Sources */}
                  <div className="rounded-lg border border-orange-100 bg-white/70 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                    <h4 className="mb-3 flex items-center font-semibold text-orange-700">
                      <svg
                        className="mr-2 h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                      </svg>
                      Źródła Przychodów
                    </h4>
                    <div className="space-y-2">
                      {(() => {
                        const totalRevenue =
                          reports?.reduce(
                            (sum, report) =>
                              sum + (report.finalOwnerPayout ?? 0),
                            0,
                          ) ?? 0;

                        if (totalRevenue > 0) {
                          const zloteWynajmyPercent = 0.12;
                          const airbnbPercent = 0.1;

                          const zloteWynajmyValue =
                            totalRevenue * zloteWynajmyPercent;
                          const airbnbValue = totalRevenue * airbnbPercent;
                          const bookingValue =
                            totalRevenue - zloteWynajmyValue - airbnbValue;

                          return (
                            <>
                              <p className="flex justify-between">
                                <span className="text-gray-600">Booking:</span>
                                <span className="font-bold text-blue-600">
                                  {bookingValue.toFixed(2)} PLN
                                </span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-gray-600">Airbnb:</span>
                                <span className="font-bold text-pink-600">
                                  {airbnbValue.toFixed(2)} PLN
                                </span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-gray-600">
                                  Złote Wynajmy:
                                </span>
                                <span className="font-bold text-orange-600">
                                  {zloteWynajmyValue.toFixed(2)} PLN
                                </span>
                              </p>
                            </>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-500">
                              Brak danych o przychodach
                            </p>
                          );
                        }
                      })()}
                    </div>
                  </div>
                </div>

                {/* Second Column - All Reports */}
                <div className="h-fit rounded-lg border border-blue-100 bg-white/70 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:shadow-md">
                  <h4 className="mb-3 flex items-center font-semibold text-blue-700">
                    <svg
                      className="mr-2 h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Wszystkie Raporty
                  </h4>
                  <ul className="max-h-48 space-y-2 overflow-y-auto scrollbar-thin scrollbar-track-amber-100 scrollbar-thumb-amber-600">
                    {debugData.allReports.map((report, index) => (
                      <li
                        key={index}
                        className="flex cursor-pointer items-center justify-between rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 p-2 transition-all duration-200 hover:from-blue-100 hover:to-purple-100"
                        onClick={() => {
                          // Znajdź pełny raport w danych reports na podstawie month/year
                          const fullReport = reports?.find(
                            (r) =>
                              r.month === report.month &&
                              r.year === report.year,
                          );
                          if (fullReport) {
                            setLoadingReportId(fullReport.id);
                            handleViewReport(fullReport.id);
                          }
                        }}
                      >
                        <span className="font-medium text-gray-700">
                          {report.month}/{report.year}
                        </span>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-semibold ${
                              report.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {report.status === "APPROVED"
                              ? "Zatwierdzony"
                              : report.status}
                          </span>
                          <span className="font-bold text-green-600">
                            {report.finalOwnerPayout?.toFixed(2) ?? "null"} PLN
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        )}

        {/* Reports List */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Zatwierdzone Raporty ({reports.length})
              </h3>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Suma wypłat właściciela:
                </p>
                <p className="text-lg font-semibold text-green-600">
                  {reports
                    .reduce(
                      (sum, report) => sum + (report.finalOwnerPayout ?? 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  PLN
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  W tym roku:{" "}
                  {reports
                    .filter(
                      (report) => report.year === new Date().getFullYear(),
                    )
                    .reduce(
                      (sum, report) => sum + (report.finalOwnerPayout ?? 0),
                      0,
                    )
                    .toFixed(2)}{" "}
                  PLN
                </p>
              </div>
            </div>
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
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Wypłata właściciela
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Akcje</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {reports.map((report) => (
                    <tr key={report.id} className="relative hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center space-x-4">
                          {/* Zdjęcie apartamentu */}
                          <div className="flex-shrink-0">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                              {report.apartment.images &&
                              report.apartment.images.length > 0 ? (
                                <Image
                                  src={report.apartment.images[0]?.url ?? ""}
                                  alt={
                                    report.apartment.images[0]?.alt ??
                                    "Zdjęcie apartamentu"
                                  }
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='10' fill='%236b7280'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <svg
                                    className="h-8 w-8 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                                    />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Informacje o apartamencie */}
                          <div>
                            <div className="font-medium">
                              {report.apartment.name}
                            </div>
                            <div className="text-gray-500">
                              {report.apartment.address}
                            </div>
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
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                        {report.finalOwnerPayout
                          ? `${report.finalOwnerPayout.toFixed(2)} PLN`
                          : "Brak danych"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                        {loadingReportId === report.id ? (
                          <div className="flex items-center space-x-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-gold border-t-transparent"></div>
                            <span className="text-sm text-gray-600">
                              Przechodzę...
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleViewReport(report.id)}
                            className="inline-flex items-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-yellow-500"
                          >
                            <svg
                              className="-ml-0.5 mr-1.5 h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                            Zobacz szczegóły
                          </button>
                        )}
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
