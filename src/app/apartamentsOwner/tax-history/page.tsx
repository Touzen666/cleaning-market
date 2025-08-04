"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

type AggregationType = "report" | "monthly" | "yearly";

// Types for tax history data
type ReportData = {
  id: string;
  apartmentName: string;
  month: number;
  year: number;
  totalRevenue: number;
  finalOwnerPayout: number;
  finalIncomeTax: number;
  taxRate: number;
  status: string;
  sentAt: Date | null;
};

type MonthlyData = {
  month: number;
  year: number;
  reportsCount: number;
  totalRevenue: number;
  totalPayout: number;
  totalTax: number;
  apartments: string[];
  averageTaxRate: number;
};

type YearlyData = {
  year: number;
  reportsCount: number;
  monthsCount: number;
  totalRevenue: number;
  totalPayout: number;
  totalTax: number;
  apartments: string[];
  averageTaxRate: number;
};

export default function TaxHistory() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [aggregation, setAggregation] = useState<AggregationType>("report");
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedApartment, setSelectedApartment] = useState<
    number | undefined
  >();
  const [showBetaModal, setShowBetaModal] = useState(false);

  useEffect(() => {
    // Check if user has seen the beta modal before
    const hasSeenBetaModal = localStorage.getItem("hasSeenTaxHistoryBetaModal");
    if (!hasSeenBetaModal) {
      setShowBetaModal(true);
    }

    const email = localStorage.getItem("ownerEmail");
    const token = localStorage.getItem("ownerSessionToken");

    if (!token) {
      router.push("/apartamentsOwner/login");
    } else {
      setOwnerEmail(email);
    }
  }, [router]);

  const closeBetaModal = () => {
    localStorage.setItem("hasSeenTaxHistoryBetaModal", "true");
    setShowBetaModal(false);
  };

  // Get available years for filtering
  const { data: availableYears } =
    api.monthlyReports.getOwnerAvailableYears.useQuery(
      { ownerEmail: ownerEmail! },
      { enabled: !!ownerEmail },
    );

  // Get available apartments for filtering
  const { data: availableReports } =
    api.monthlyReports.getOwnerAvailableReports.useQuery(
      { ownerEmail: ownerEmail! },
      { enabled: !!ownerEmail },
    );

  // Extract unique apartments from reports
  const availableApartments = useMemo(() => {
    if (!availableReports) return [];

    const apartmentMap = new Map<string, { id: number; name: string }>();

    availableReports.forEach((report) => {
      const apartmentName = report.name.split(" - ")[0];
      if (apartmentName && !apartmentMap.has(apartmentName)) {
        // We'll use report.id as apartment id (this might need adjustment based on your data structure)
        apartmentMap.set(apartmentName, {
          id: Math.floor(Math.random() * 1000), // Temporary ID - should be proper apartment ID
          name: apartmentName,
        });
      }
    });

    return Array.from(apartmentMap.values());
  }, [availableReports]);

  // Get tax history data
  const {
    data: taxHistoryData,
    isLoading: isLoadingTaxHistory,
    error: taxHistoryError,
  } = api.monthlyReports.getOwnerIncomeTaxHistory.useQuery(
    {
      ownerEmail: ownerEmail!,
      aggregation,
      year: selectedYear,
      apartmentId: selectedApartment,
    },
    { enabled: !!ownerEmail },
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  const formatMonth = (month: number) => {
    return new Date(2024, month - 1).toLocaleDateString("pl-PL", {
      month: "long",
    });
  };

  const exportToCSV = () => {
    if (!taxHistoryData?.data) return;

    let csvContent = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (aggregation === "report" && taxHistoryData.aggregation === "report") {
      headers = [
        "Apartament",
        "Miesiąc",
        "Rok",
        "Przychód (PLN)",
        "Wypłata (PLN)",
        "Podatek (PLN)",
        "Stawka (%)",
        "Status",
      ];
      rows = taxHistoryData.data.map((item: ReportData) => [
        item.apartmentName,
        formatMonth(item.month),
        item.year.toString(),
        item.totalRevenue.toFixed(2),
        item.finalOwnerPayout.toFixed(2),
        item.finalIncomeTax.toFixed(2),
        item.taxRate.toString(),
        item.status,
      ]);
    } else if (
      aggregation === "monthly" &&
      taxHistoryData.aggregation === "monthly"
    ) {
      headers = [
        "Miesiąc",
        "Rok",
        "Liczba raportów",
        "Apartamenty",
        "Przychód (PLN)",
        "Wypłata (PLN)",
        "Podatek (PLN)",
        "Średnia stawka (%)",
      ];
      rows = taxHistoryData.data.map((item: MonthlyData) => [
        formatMonth(item.month),
        item.year.toString(),
        item.reportsCount.toString(),
        item.apartments.join(", "),
        item.totalRevenue.toFixed(2),
        item.totalPayout.toFixed(2),
        item.totalTax.toFixed(2),
        item.averageTaxRate.toFixed(1),
      ]);
    } else if (
      aggregation === "yearly" &&
      taxHistoryData.aggregation === "yearly"
    ) {
      headers = [
        "Rok",
        "Liczba raportów",
        "Liczba miesięcy",
        "Apartamenty",
        "Przychód (PLN)",
        "Wypłata (PLN)",
        "Podatek (PLN)",
        "Średnia stawka (%)",
      ];
      rows = taxHistoryData.data.map((item: YearlyData) => [
        item.year.toString(),
        item.reportsCount.toString(),
        item.monthsCount.toString(),
        item.apartments.join(", "),
        item.totalRevenue.toFixed(2),
        item.totalPayout.toFixed(2),
        item.totalTax.toFixed(2),
        item.averageTaxRate.toFixed(1),
      ]);
    }

    csvContent += headers.join(",") + "\n";
    csvContent += rows
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historia_podatku_${aggregation}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (isLoadingTaxHistory) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Ładowanie historii podatku...</div>
      </div>
    );
  }

  if (taxHistoryError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-red-600">Błąd: {taxHistoryError.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Beta Modal */}
      {showBetaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="relative mx-4 max-w-md rounded-lg bg-white p-6 shadow-xl">
            {/* Close button */}
            <button
              onClick={closeBetaModal}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {/* Icon with animation */}
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <ExclamationTriangleIcon className="h-12 w-12 text-amber-500" />
                <div className="absolute -right-1 -top-1">
                  <WrenchScrewdriverIcon className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="text-center">
              <h3 className="mb-2 text-lg font-semibold text-gray-900">
                Wersja Beta
              </h3>
              <p className="mb-4 text-sm text-gray-600">
                Ta funkcja jest w wersji Beta i może zawierać błędy lub niepełne
                dane. Trwają prace nad udoskonaleniem tej sekcji aplikacji.
              </p>

              {/* Animated progress indicator */}
              <div className="mb-4">
                <div className="mb-2 text-xs text-gray-500">
                  Trwają prace implementacyjne...
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 animate-pulse rounded-full bg-blue-600"
                    style={{ width: "75%" }}
                  ></div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  onClick={closeBetaModal}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Rozumiem, kontynuuj
                </button>
                <button
                  onClick={() => router.push("/apartamentsOwner/profile")}
                  className="rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-400"
                >
                  Powrót do profilu
                </button>
              </div>
            </div>

            {/* Floating elements animation */}
            <div className="absolute left-2 top-8 h-2 w-2 animate-bounce rounded-full bg-blue-300 opacity-60"></div>
            <div className="absolute right-8 top-12 h-1 w-1 animate-ping rounded-full bg-amber-300 opacity-40"></div>
            <div className="absolute bottom-8 left-6 h-1.5 w-1.5 animate-pulse rounded-full bg-green-300 opacity-50"></div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <Link
                href="/apartamentsOwner/profile"
                className="flex items-center text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="mr-2 h-5 w-5" />
                Powrót do profilu
              </Link>
              <div className="h-6 border-l border-gray-300" />
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                  Historia Podatku Dochodowego
                </h1>
                <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  BETA
                </span>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ArrowDownTrayIcon className="mr-2 h-4 w-4" />
              Eksportuj CSV
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-center">
            <FunnelIcon className="mr-2 h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-medium text-gray-900">
              Filtry i widok
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Aggregation Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Poziom agregacji
              </label>
              <select
                value={aggregation}
                onChange={(e) =>
                  setAggregation(e.target.value as AggregationType)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="report">Per raport</option>
                <option value="monthly">Per miesiąc</option>
                <option value="yearly">Per rok</option>
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rok
              </label>
              <select
                value={selectedYear ?? ""}
                onChange={(e) =>
                  setSelectedYear(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Wszystkie lata</option>
                {availableYears?.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Apartment Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apartament
              </label>
              <select
                value={selectedApartment ?? ""}
                onChange={(e) =>
                  setSelectedApartment(
                    e.target.value ? Number(e.target.value) : undefined,
                  )
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Wszystkie apartamenty</option>
                {availableApartments.map((apartment) => (
                  <option key={apartment.id} value={apartment.id}>
                    {apartment.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedYear(undefined);
                  setSelectedApartment(undefined);
                }}
                className="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Wyczyść filtry
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {taxHistoryData?.totals && (
          <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Łączny przychód
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxHistoryData.totals.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Łączna wypłata
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxHistoryData.totals.totalPayout)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Łączny podatek
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(taxHistoryData.totals.totalTax)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {taxHistoryData.totals.totalRevenue > 0
                      ? `${((taxHistoryData.totals.totalTax / taxHistoryData.totals.totalRevenue) * 100).toFixed(1)}% przychodu`
                      : "0% przychodu"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              {aggregation === "report" && "Szczegóły per raport"}
              {aggregation === "monthly" && "Agregacja miesięczna"}
              {aggregation === "yearly" && "Agregacja roczna"}
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Kompletna historia podatku dochodowego z Twoich raportów
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {aggregation === "report" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Apartament
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Przychód
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Wypłata
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Podatek
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Stawka
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Status
                      </th>
                    </>
                  )}

                  {aggregation === "monthly" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Miesiąc
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Raporty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Apartamenty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Przychód
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Wypłata
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Podatek
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Śr. stawka
                      </th>
                    </>
                  )}

                  {aggregation === "yearly" && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Rok
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Raporty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Miesiące
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Apartamenty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Przychód
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Wypłata
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Podatek
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Śr. stawka
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {taxHistoryData?.data?.map((item, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    {aggregation === "report" &&
                      taxHistoryData.aggregation === "report" && (
                        <>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {(item as ReportData).apartmentName}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                            {formatMonth((item as ReportData).month)}{" "}
                            {(item as ReportData).year}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency((item as ReportData).totalRevenue)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency(
                              (item as ReportData).finalOwnerPayout,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-red-600">
                            {formatCurrency(
                              (item as ReportData).finalIncomeTax,
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {(item as ReportData).taxRate}%
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                (item as ReportData).status === "SENT"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {(item as ReportData).status === "SENT"
                                ? "Wysłany"
                                : "Zatwierdzony"}
                            </span>
                          </td>
                        </>
                      )}

                    {aggregation === "monthly" &&
                      taxHistoryData.aggregation === "monthly" && (
                        <>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {formatMonth((item as MonthlyData).month)}{" "}
                            {(item as MonthlyData).year}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {(item as MonthlyData).reportsCount}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate">
                              {(item as MonthlyData).apartments.join(", ")}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency((item as MonthlyData).totalRevenue)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency((item as MonthlyData).totalPayout)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-red-600">
                            {formatCurrency((item as MonthlyData).totalTax)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {(item as MonthlyData).averageTaxRate.toFixed(1)}%
                          </td>
                        </>
                      )}

                    {aggregation === "yearly" &&
                      taxHistoryData.aggregation === "yearly" && (
                        <>
                          <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                            {(item as YearlyData).year}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {(item as YearlyData).reportsCount}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {(item as YearlyData).monthsCount}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            <div className="max-w-xs truncate">
                              {(item as YearlyData).apartments.join(", ")}
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency((item as YearlyData).totalRevenue)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
                            {formatCurrency((item as YearlyData).totalPayout)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-red-600">
                            {formatCurrency((item as YearlyData).totalTax)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-500">
                            {(item as YearlyData).averageTaxRate.toFixed(1)}%
                          </td>
                        </>
                      )}
                  </tr>
                ))}
              </tbody>
            </table>

            {taxHistoryData?.data?.length === 0 && (
              <div className="py-12 text-center">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Brak danych
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Nie znaleziono raportów dla wybranych kryteriów.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
