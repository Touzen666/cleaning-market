"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useChartData } from "@/hooks/useChartData";
import {
  BarChartPlaceholder,
  PieChartPlaceholder,
  PercentageCardsPlaceholder,
} from "@/app/_components/shared/ChartPlaceholders";
import Link from "next/link";
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { FaCar, FaCarSide, FaPencilAlt } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function ExitImpersonationBanner() {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("isImpersonating") === "true") {
      setIsImpersonating(true);
    }
  }, []);

  const handleExitImpersonation = () => {
    localStorage.removeItem("isImpersonating");
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    router.push("/admin/owners");
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center bg-yellow-400 p-3 text-center font-semibold text-black shadow-lg">
      <ExclamationTriangleIcon className="mr-3 h-6 w-6" />
      <span>Jesteś w trybie podglądu jako właściciel.</span>
      <button
        onClick={handleExitImpersonation}
        className="ml-4 rounded-md bg-black px-3 py-1 text-sm text-white hover:bg-gray-800"
      >
        Wróć do panelu administratora
      </button>
    </div>
  );
}

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

interface PieLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  // Filter states
  const [selectedApartmentId, setSelectedApartmentId] = useState<
    number | undefined
  >(undefined);
  const [selectedYear, setSelectedYear] = useState<number | undefined>(
    undefined,
  );
  const [selectedMonth, setSelectedMonth] = useState<number | undefined>(
    undefined,
  );
  const [selectedReportId, setSelectedReportId] = useState<string | undefined>(
    undefined,
  );
  const [viewType, setViewType] = useState<"yearly" | "monthly" | "single">(
    "yearly",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Helper function to handle filter changes with loading state
  const handleFilterChange = (changeFunction: () => void) => {
    setIsFilterLoading(true);
    changeFunction();
    // Reset loading after data should be loaded
    setTimeout(() => {
      setIsFilterLoading(false);
    }, 800);
  };

  // Chart visibility filters
  const [chartFilters, setChartFilters] = useState({
    Przychód: true,
    Sprzątanie: true,
    Pranie: true,
    Tekstylia: true,
    Czynsz: true,
    Media: true,
    "Złote Wynajmy Prowizja": true,
    "Prowizje OTA": true,
    "Wypłata Właściciela": true,
  });

  // Special chart view mode
  const [chartViewMode, setChartViewMode] = useState<
    "normal" | "costsVsPayout" | "fixedCosts"
  >("normal");

  useEffect(() => {
    const email = localStorage.getItem("ownerEmail");
    const token = localStorage.getItem("ownerSessionToken");

    if (!token) {
      router.push("/apartamentsOwner/login");
    } else {
      setOwnerEmail(email);
    }
  }, [router]);

  const {
    data: dashboardData,
    isLoading: isLoadingDashboard,
    error: dashboardError,
  } = api.ownerAuth.getDashboardData.useQuery(undefined, {
    enabled: !!ownerEmail,
  });

  // Wspólny hook do zarządzania danymi wykresów
  const {
    baseChartData,
    revenueSourceData,
    percentages,
    isLoading: isLoadingChartData,
    getMiniPieData,
  } = useChartData(
    ownerEmail ?? undefined,
    selectedApartmentId,
    selectedReportId,
    viewType,
    selectedYear,
    selectedMonth,
  );

  // Get available apartments for filtering
  const { data: availableApartments } =
    api.monthlyReports.getOwnerFilteredReports.useQuery(
      {
        ownerEmail: ownerEmail!,
        viewType: "single",
      },
      { enabled: !!ownerEmail },
    );

  // Get available years for filtering
  const { data: availableYears } =
    api.monthlyReports.getOwnerAvailableYears.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
      },
      { enabled: !!ownerEmail },
    );

  // Get available months for filtering
  const { data: availableMonths } =
    api.monthlyReports.getOwnerAvailableMonths.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
        year: selectedYear!,
      },
      { enabled: !!ownerEmail && !!selectedYear },
    );

  // Get available reports for filtering
  const { data: availableReports } =
    api.monthlyReports.getOwnerAvailableReports.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
        year: selectedYear,
        month: selectedMonth,
      },
      { enabled: !!ownerEmail },
    );

  const isLoading = isLoadingDashboard || isLoadingChartData;
  const error = dashboardError;

  // Dane wykresów z wspólnego hook'a - używamy funkcji filtrującej
  const chartData = useMemo(() => {
    if (!baseChartData.length) return [];
    return baseChartData;
  }, [baseChartData]);

  // Dane dla wykresu słupkowego z zastosowanymi filtrami
  const getFilteredBarChartData = useMemo(() => {
    return (filters: Record<string, boolean>) => {
      return baseChartData.map((item) => {
        const filteredItem: Partial<typeof item> = { name: item.name };

        if (filters.Przychód) filteredItem.Przychód = item.Przychód;
        if (filters.Sprzątanie) filteredItem.Sprzątanie = item.Sprzątanie;
        if (filters.Pranie) filteredItem.Pranie = item.Pranie;
        if (filters.Tekstylia) filteredItem.Tekstylia = item.Tekstylia;
        if (filters.Czynsz) filteredItem.Czynsz = item.Czynsz;
        if (filters.Media) filteredItem.Media = item.Media;
        if (filters["Złote Wynajmy Prowizja"])
          filteredItem["Złote Wynajmy Prowizja"] =
            item["Złote Wynajmy Prowizja"];
        if (filters["Prowizje OTA"])
          filteredItem["Prowizje OTA"] = item["Prowizje OTA"];
        if (filters["Wypłata Właściciela"])
          filteredItem["Wypłata Właściciela"] = item["Wypłata Właściciela"];
        if (filters["Koszty stałe"])
          filteredItem["Koszty stałe"] = item["Koszty stałe"];

        return filteredItem as typeof item;
      });
    };
  }, [baseChartData]);

  // Dane dla aktualnego wykresu słupkowego z filtrami
  const filteredChartData = getFilteredBarChartData(chartFilters);

  // Tooltip dla wykresów słupkowych (pokazuje wartości w PLN)
  const BarChartTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload?.length) {
      return (
        <div className="rounded border border-gray-300 bg-white p-3 text-sm shadow-lg">
          <p className="mb-1 font-bold">{label}</p>
          {payload.map((entry) => (
            <p key={entry.name} style={{ color: entry.color }} className="mb-1">
              {`${entry.name}: ${Number(entry.value).toFixed(2)} PLN`}
            </p>
          ))}
        </div>
      );
    }

    return null;
  };

  // Tooltip dla wykresów kołowych (pokazuje wartości w procentach)
  const PieChartTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload?.length) {
      const data = payload[0];
      return (
        <div className="rounded border border-gray-300 bg-white p-3 text-sm shadow-lg">
          <p key={data?.name} style={{ color: data?.color }} className="mb-1">
            {`${data?.name}: ${Number(data?.value).toFixed(1)}%`}
          </p>
        </div>
      );
    }

    return null;
  };

  // Tooltip dla wykresu źródeł przychodów (pokazuje PLN i procenty)
  const RevenueSourceTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload?.length) {
      const data = payload[0];

      return (
        <div className="rounded border border-gray-300 bg-white p-3 text-sm shadow-lg">
          <p className="mb-1 font-bold">{data?.name}</p>
          <p style={{ color: data?.color }} className="mb-1">
            {`Udział: ${Number(data?.value).toFixed(1)}%`}
          </p>
        </div>
      );
    }

    return null;
  };

  const renderCustomLabel = (props: PieLabelProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;

    if (
      !cx ||
      !cy ||
      midAngle === undefined ||
      !innerRadius ||
      !outerRadius ||
      percent === undefined
    ) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
        style={{
          textShadow: "2px 2px 4px rgba(0,0,0,0.9)",
          filter: "drop-shadow(1px 1px 2px rgba(0,0,0,0.8))",
          pointerEvents: "none",
        }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const handleFilterReset = () => {
    setSelectedApartmentId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setSelectedReportId(undefined);
    setViewType("yearly");
  };

  const toggleChartFilter = (category: keyof typeof chartFilters) => {
    setChartFilters((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const resetChartFilters = () => {
    setChartFilters({
      Przychód: true,
      Sprzątanie: true,
      Pranie: true,
      Tekstylia: true,
      Czynsz: true,
      Media: true,
      "Złote Wynajmy Prowizja": true,
      "Prowizje OTA": true,
      "Wypłata Właściciela": true,
    });
    setChartViewMode("normal");
  };

  const toggleCostsVsPayoutView = () => {
    if (chartViewMode === "normal") {
      setChartViewMode("costsVsPayout");
      setChartFilters({
        Przychód: true,
        Sprzątanie: false,
        Pranie: false,
        Tekstylia: false,
        Czynsz: false,
        Media: false,
        "Złote Wynajmy Prowizja": true,
        "Prowizje OTA": false,
        "Wypłata Właściciela": true,
      });
    } else {
      setChartViewMode("normal");
      setChartFilters({
        Przychód: true,
        Sprzątanie: true,
        Pranie: true,
        Tekstylia: true,
        Czynsz: true,
        Media: true,
        "Złote Wynajmy Prowizja": true,
        "Prowizje OTA": true,
        "Wypłata Właściciela": true,
      });
    }
  };

  const toggleFixedCostsView = () => {
    if (chartViewMode === "normal") {
      setChartViewMode("fixedCosts");
      setChartFilters({
        Przychód: false,
        Sprzątanie: true,
        Pranie: true,
        Tekstylia: true,
        Czynsz: true,
        Media: true,
        "Złote Wynajmy Prowizja": false,
        "Prowizje OTA": true,
        "Wypłata Właściciela": false,
      });
    } else {
      setChartViewMode("normal");
      setChartFilters({
        Przychód: true,
        Sprzątanie: true,
        Pranie: true,
        Tekstylia: true,
        Czynsz: true,
        Media: true,
        "Złote Wynajmy Prowizja": true,
        "Prowizje OTA": true,
        "Wypłata Właściciela": true,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Ładowanie...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Wystąpił błąd: {error.message}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Brak danych.
      </div>
    );
  }

  const { owner, stats } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-100">
      <ExitImpersonationBanner />
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Panel Właściciela
              </h1>
              <p className="text-gray-600">
                Witaj, {owner.firstName} {owner.lastName}!
              </p>
            </div>
            <Link
              href="/apartamentsOwner/profile"
              className="flex items-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
            >
              <UserCircleIcon className="h-6 w-6" />
              <span className="font-medium">Profil</span>
            </Link>
          </div>
        </div>
      </header>
      <main className="py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Twoje apartamenty
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {stats.totalApartments}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Aktywne rezerwacje
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {stats.activeReservations}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Zysk w tym roku
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {(typeof stats.currentYearProfit === "number"
                  ? stats.currentYearProfit
                  : 0
                ).toFixed(2)}{" "}
                PLN
              </dd>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              href="/apartamentsOwner/apartments"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow transition hover:bg-gray-50"
            >
              <div className="relative h-16 w-24">
                <BuildingOffice2Icon className="absolute bottom-0 left-1/2 h-12 w-12 -translate-x-1/2 text-brand-gold" />
                <FaCarSide className="group-hover:animate-drive-in-and-vanish absolute bottom-0 left-4 h-6 w-6 text-brand-gold opacity-0" />
                <FaCar className="absolute bottom-0 left-4 h-6 w-6 text-brand-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-1000" />
              </div>

              <p className="mt-2 font-semibold">Moje Apartamenty</p>
            </Link>
            <Link
              href="/apartamentsOwner/reservations"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow transition hover:bg-gray-50"
            >
              <div className="relative h-12 w-12">
                <DocumentTextIcon className="h-full w-full text-brand-gold" />
                <FaPencilAlt className="group-hover:animate-writing-pencil absolute left-[12px] top-[10px] h-5 w-5 text-brand-gold opacity-0" />
              </div>
              <p className="mt-2 font-semibold">Rezerwacje</p>
            </Link>
            <Link
              href="/apartamentsOwner/reports"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow"
              style={{ perspective: "1000px" }}
            >
              <div className="relative h-12 w-12 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                <CurrencyDollarIcon className="absolute inset-0 h-full w-full text-brand-gold [backface-visibility:hidden]" />
                <CurrencyDollarIcon className="absolute inset-0 h-full w-full text-brand-gold [backface-visibility:hidden] [transform:rotateY(180deg)]" />
              </div>
              <p className="mt-2 font-semibold">Raporty Finansowe</p>
              <p className="text-sm text-gray-500">
                ({dashboardData.stats.totalReports} raporty)
              </p>
            </Link>
            <Link
              href="/apartamentsOwner/profile"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow transition hover:bg-gray-50"
            >
              <div className="relative h-12 w-12">
                <UserCircleIcon className="h-full w-full text-brand-gold" />
              </div>
              <p className="mt-2 font-semibold">Mój Profil</p>
              <p className="text-sm text-gray-500">Edytuj dane i zdjęcie</p>
            </Link>
          </div>

          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Wyniki finansowe
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <FunnelIcon className="mr-2 h-4 w-4" />
                Filtry
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mb-6 rounded-lg bg-white p-4 shadow">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
                  {/* Apartment Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Apartament
                    </label>
                    <select
                      value={selectedApartmentId ?? ""}
                      onChange={(e) =>
                        handleFilterChange(() =>
                          setSelectedApartmentId(
                            e.target.value ? Number(e.target.value) : undefined,
                          ),
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Wszystkie apartamenty</option>
                      {availableApartments?.apartments?.map((apartment) => (
                        <option key={apartment.id} value={apartment.id}>
                          {apartment.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* View Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Typ widoku
                    </label>
                    <select
                      value={viewType}
                      onChange={(e) =>
                        handleFilterChange(() =>
                          setViewType(
                            e.target.value as "yearly" | "monthly" | "single",
                          ),
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="yearly">Roczny</option>
                      <option value="monthly">Miesięczny</option>
                      <option value="single">Pojedynczy raport</option>
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
                        handleFilterChange(() => {
                          setSelectedYear(
                            e.target.value ? Number(e.target.value) : undefined,
                          );
                          setSelectedMonth(undefined);
                          setSelectedReportId(undefined);
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Wszystkie lata</option>
                      {availableYears?.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Miesiąc
                    </label>
                    <select
                      value={selectedMonth ?? ""}
                      onChange={(e) =>
                        handleFilterChange(() => {
                          setSelectedMonth(
                            e.target.value ? Number(e.target.value) : undefined,
                          );
                          setSelectedReportId(undefined);
                        })
                      }
                      disabled={!selectedYear}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                    >
                      <option value="">Wszystkie miesiące</option>
                      {availableMonths?.map((month) => (
                        <option key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleDateString(
                            "pl-PL",
                            { month: "long" },
                          )}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Report Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Raport
                    </label>
                    <select
                      value={selectedReportId ?? ""}
                      onChange={(e) =>
                        handleFilterChange(() =>
                          setSelectedReportId(e.target.value || undefined),
                        )
                      }
                      disabled={viewType !== "single"}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                    >
                      <option value="">Wszystkie raporty</option>
                      {availableReports?.map((report) => (
                        <option key={report.id} value={report.id}>
                          {report.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Reset Button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => handleFilterChange(handleFilterReset)}
                      className="w-full rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    >
                      Resetuj filtry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isFilterLoading || isLoadingChartData ? (
              // Loading placeholders
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <div className="mb-4">
                    <div className="mb-2 h-6 w-1/3 animate-pulse rounded bg-gray-200"></div>
                    <div className="flex gap-2">
                      <div className="h-8 w-16 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-8 w-20 animate-pulse rounded bg-gray-200"></div>
                      <div className="h-8 w-24 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                  <BarChartPlaceholder height={400} />
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                    <div className="mb-4">
                      <div className="h-6 w-1/2 animate-pulse rounded bg-gray-200"></div>
                    </div>
                    <PercentageCardsPlaceholder />
                  </div>

                  <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                    <div className="mb-4">
                      <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200"></div>
                    </div>
                    <PieChartPlaceholder height={400} />
                  </div>
                </div>
              </div>
            ) : chartData.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold sm:text-base">
                      Wyniki finansowe
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={toggleCostsVsPayoutView}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          chartViewMode === "costsVsPayout"
                            ? "bg-orange-500 text-white hover:bg-orange-600"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
                      >
                        Stosunki
                      </button>
                      <button
                        onClick={toggleFixedCostsView}
                        className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                          chartViewMode === "fixedCosts"
                            ? "bg-red-500 text-white hover:bg-red-600"
                            : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                        }`}
                      >
                        Koszty stałe
                      </button>
                      <button
                        onClick={resetChartFilters}
                        className="rounded-md bg-gray-500 px-2 py-1 text-xs text-white hover:bg-gray-600"
                      >
                        Pokaż wszystkie
                      </button>
                    </div>
                  </div>

                  {/* Chart Filters */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(chartFilters).map(
                      ([category, isVisible]) => (
                        <button
                          key={category}
                          onClick={() =>
                            toggleChartFilter(
                              category as keyof typeof chartFilters,
                            )
                          }
                          className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            isVisible
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          <div
                            className={`h-2 w-2 rounded-full ${
                              isVisible ? "opacity-100" : "opacity-50"
                            }`}
                            style={{
                              backgroundColor:
                                category === "Przychód"
                                  ? "#82ca9d"
                                  : category === "Sprzątanie"
                                    ? "#8884d8"
                                    : category === "Pranie"
                                      ? "#ff6b6b"
                                      : category === "Tekstylia"
                                        ? "#9c27b0"
                                        : category === "Czynsz"
                                          ? "#ff9800"
                                          : category === "Media"
                                            ? "#2196f3"
                                            : category ===
                                                "Złote Wynajmy Prowizja"
                                              ? "#ffc658"
                                              : category === "Prowizje OTA"
                                                ? "#ff8042"
                                                : category ===
                                                    "Podatek dochodowy"
                                                  ? "#e74c3c"
                                                  : "#00C49F",
                            }}
                          />
                          {category}
                        </button>
                      ),
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={filteredChartData}
                      margin={{
                        top: 10,
                        right: 20,
                        left: 10,
                        bottom: 40,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        height={40}
                        interval={0}
                        tick={{ fontSize: 11 }}
                        className="text-xs sm:text-sm"
                      />
                      <YAxis
                        tickFormatter={(value) => Number(value).toFixed(2)}
                        tick={{ fontSize: 11 }}
                        className="text-xs sm:text-sm"
                      />
                      <Tooltip content={<BarChartTooltip />} />
                      {chartViewMode === "costsVsPayout" ? (
                        <>
                          <Bar
                            dataKey="Złote Wynajmy Prowizja"
                            fill="#ffc658"
                          />
                          <Bar dataKey="Wypłata" fill="#00C49F" />
                          <Bar dataKey="Koszty stałe" fill="#ff6b6b" />
                          <Bar dataKey="Przychód" fill="#82ca9d" />
                        </>
                      ) : chartViewMode === "fixedCosts" ? (
                        <>
                          <Bar dataKey="Sprzątanie" fill="#8884d8" />
                          <Bar dataKey="Pranie" fill="#ff6b6b" />
                          <Bar dataKey="Tekstylia" fill="#9c27b0" />
                          <Bar dataKey="Czynsz" fill="#ff9800" />
                          <Bar dataKey="Media" fill="#2196f3" />
                          <Bar dataKey="Prowizje OTA" fill="#ff8042" />
                        </>
                      ) : (
                        <>
                          {chartFilters.Przychód && (
                            <Bar dataKey="Przychód" fill="#82ca9d" />
                          )}
                          {chartFilters.Sprzątanie && (
                            <Bar dataKey="Sprzątanie" fill="#8884d8" />
                          )}
                          {chartFilters.Pranie && (
                            <Bar dataKey="Pranie" fill="#ff6b6b" />
                          )}
                          {chartFilters.Tekstylia && (
                            <Bar dataKey="Tekstylia" fill="#9c27b0" />
                          )}
                          {chartFilters.Czynsz && (
                            <Bar dataKey="Czynsz" fill="#ff9800" />
                          )}
                          {chartFilters.Media && (
                            <Bar dataKey="Media" fill="#2196f3" />
                          )}
                          {chartFilters["Złote Wynajmy Prowizja"] && (
                            <Bar
                              dataKey="Złote Wynajmy Prowizja"
                              fill="#ffc658"
                            />
                          )}
                          {chartFilters["Prowizje OTA"] && (
                            <Bar dataKey="Prowizje OTA" fill="#ff8042" />
                          )}
                          {chartFilters["Wypłata Właściciela"] && (
                            <Bar dataKey="Wypłata Właściciela" fill="#00C49F" />
                          )}
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    {chartViewMode === "costsVsPayout" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#ffc658" }}
                          />
                          <span>Złote Wynajmy Prowizja</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#00C49F" }}
                          />
                          <span>Wypłata Właściciela</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#ff6b6b" }}
                          />
                          <span>Koszty stałe</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#82ca9d" }}
                          />
                          <span>Przychód</span>
                        </div>
                      </>
                    ) : chartViewMode === "fixedCosts" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#8884d8" }}
                          />
                          <span>Sprzątanie</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#ff6b6b" }}
                          />
                          <span>Pranie</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#9c27b0" }}
                          />
                          <span>Tekstylia</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#ff9800" }}
                          />
                          <span>Czynsz</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#2196f3" }}
                          />
                          <span>Media</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded"
                            style={{ backgroundColor: "#ff8042" }}
                          />
                          <span>Prowizje OTA</span>
                        </div>
                      </>
                    ) : (
                      <>
                        {chartFilters.Przychód && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#82ca9d" }}
                            />
                            <span>Przychód</span>
                          </div>
                        )}
                        {chartFilters.Sprzątanie && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#8884d8" }}
                            />
                            <span>Sprzątanie</span>
                          </div>
                        )}
                        {chartFilters.Pranie && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#ff6b6b" }}
                            />
                            <span>Pranie</span>
                          </div>
                        )}
                        {chartFilters.Tekstylia && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#9c27b0" }}
                            />
                            <span>Tekstylia</span>
                          </div>
                        )}
                        {chartFilters.Czynsz && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#ff9800" }}
                            />
                            <span>Czynsz</span>
                          </div>
                        )}
                        {chartFilters.Media && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#2196f3" }}
                            />
                            <span>Media</span>
                          </div>
                        )}
                        {chartFilters["Złote Wynajmy Prowizja"] && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#ffc658" }}
                            />
                            <span>Złote Wynajmy Prowizja</span>
                          </div>
                        )}
                        {chartFilters["Prowizje OTA"] && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#ff8042" }}
                            />
                            <span>Prowizje OTA</span>
                          </div>
                        )}

                        {chartFilters["Wypłata Właściciela"] && (
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: "#00C49F" }}
                            />
                            <span>Wypłata</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Chart Explanation Card */}
                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <h4 className="mb-3 text-sm font-semibold text-gray-800">
                    Wyjaśnienie trybów wykresu
                  </h4>

                  {chartViewMode === "costsVsPayout" ? (
                    <div className="space-y-3">
                      <div className="rounded-md bg-orange-50 p-3">
                        <h5 className="mb-2 font-medium text-orange-800">
                          Tryb: Stosunki
                        </h5>
                        <p className="text-sm text-orange-700">
                          Pokazuje kluczowe stosunki finansowe w Twoim biznesie:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-orange-700">
                          <li>
                            •{" "}
                            <strong>
                              Złote Wynajmy Prowizja vs Wypłata Właściciela
                            </strong>{" "}
                            - ile prowizji płacisz w stosunku do wypłaty
                          </li>
                          <li>
                            • <strong>Koszty stałe vs Przychód</strong> - jaki
                            procent przychodu stanowią koszty operacyjne
                          </li>
                        </ul>
                        <div className="mt-3 rounded bg-white p-2 text-xs">
                          <p className="font-medium text-gray-800">
                            Aktualne wyliczenia:
                          </p>
                          {percentages ? (
                            <div className="space-y-1 text-gray-600">
                              <p>
                                • Prowizja Złote Wynajmy:{" "}
                                <strong>
                                  {percentages.adminCommission.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Koszty stałe:{" "}
                                <strong>
                                  {percentages.fixedCosts.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Wypłata Właściciela:{" "}
                                <strong>
                                  {percentages.payout.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Stosunek Wypłata Właściciela/Prowizja ZW:{" "}
                                <strong>
                                  {percentages.payout &&
                                  percentages.adminCommission
                                    ? (
                                        (percentages.payout /
                                          percentages.adminCommission) *
                                        100
                                      ).toFixed(1)
                                    : "0"}
                                  %
                                </strong>{" "}
                                (cel: 300% - 75%/25%)
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-600">
                              Brak danych do wyliczenia
                            </p>
                          )}
                          <p className="mt-2 text-gray-500">
                            Założenie: Złote Wynajmy 25% / Wypłata Właściciela
                            75%
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : chartViewMode === "fixedCosts" ? (
                    <div className="space-y-3">
                      <div className="rounded-md bg-red-50 p-3">
                        <h5 className="mb-2 font-medium text-red-800">
                          Tryb: Koszty stałe
                        </h5>
                        <p className="text-sm text-red-700">
                          Szczegółowy podział kosztów stałych w Twoim biznesie:
                        </p>
                        <ul className="mt-2 space-y-1 text-sm text-red-700">
                          <li>
                            • <strong>Sprzątanie</strong> - koszty sprzątania i
                            środków czystości
                          </li>
                          <li>
                            • <strong>Pranie</strong> - koszty prania pościeli i
                            ręczników
                          </li>
                          <li>
                            • <strong>Tekstylia</strong> - koszty pościeli,
                            ręczników, dekoracji
                          </li>
                          <li>
                            • <strong>Prowizje OTA</strong> - prowizje od
                            platform bookingowych
                          </li>
                        </ul>
                        <div className="mt-3 rounded bg-white p-2 text-xs">
                          <p className="font-medium text-gray-800">
                            Aktualne wyliczenia:
                          </p>
                          {percentages ? (
                            <div className="space-y-1 text-gray-600">
                              <p>
                                • Sprzątanie:{" "}
                                <strong>
                                  {percentages.cleaning.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Pranie:{" "}
                                <strong>
                                  {percentages.laundry.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Tekstylia:{" "}
                                <strong>
                                  {percentages.textiles.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                • Prowizje OTA:{" "}
                                <strong>
                                  {percentages.otaCommissions.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                              <p>
                                •{" "}
                                <strong>
                                  Łącznie koszty stałe:{" "}
                                  {percentages.fixedCosts.toFixed(1)}%
                                </strong>{" "}
                                przychodu
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-600">
                              Brak danych do wyliczenia
                            </p>
                          )}
                          <p className="mt-2 text-gray-500">
                            Szczegółowy podział kosztów operacyjnych w danej
                            Inwestycji
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-md bg-blue-50 p-3">
                        {/* Header w stylu raportów */}
                        <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
                          <div className="border-b border-gray-200 px-4 py-3">
                            <div className="flex items-center space-x-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                                <svg
                                  className="h-5 w-9 text-blue-600"
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
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Aktualne wyliczenia
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Pełen udział wszystkich składowych inwestycji
                                  w przychodzie
                                </p>
                                <p className="text-sm text-gray-600">
                                  Wszystkie kategorie wyświetlone osobno z
                                  własnymi procentami. Najedź na dowolną
                                  kategorię aby zobaczyć szczegółowy opis.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="p-4">
                            {percentages ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                  <div className="group relative rounded-lg bg-green-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-green-900">
                                      Wypłata Właściciela
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-green-700">
                                      {percentages.payout.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Końcowa wypłata dla właściciela
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-orange-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-orange-900">
                                      Czynsz
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-orange-700">
                                      {percentages.rent.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Koszty czynszu administracyjnego jako %
                                      przychodu. Jeśli płacisz samodzielnie -
                                      wypłata jest wyższa o te koszty, co
                                      zwiększa podatek dochodowy.
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-teal-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-teal-900">
                                      Media
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-teal-700">
                                      {percentages.utilities.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Koszty mediów (prąd, gaz, woda, internet)
                                      jako % przychodu. Jeśli płacisz
                                      samodzielnie - wypłata jest wyższa o te
                                      koszty, co zwiększa podatek dochodowy.
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-yellow-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-yellow-900">
                                      Prowizja Złote Wynajmy
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-yellow-700">
                                      {percentages.adminCommission.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Prowizja pobierana przez Złote Wynajmy za
                                      zarządzanie nieruchomością
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-red-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-red-900">
                                      Prowizje OTA
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-red-700">
                                      {percentages.otaCommissions.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Prowizje od platform bookingowych
                                      (Booking.com, Airbnb itp.)
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-blue-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-blue-900">
                                      Sprzątanie
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-blue-700">
                                      {percentages.cleaning.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Koszty sprzątania i środków czystości
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-indigo-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-indigo-900">
                                      Pranie
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-indigo-700">
                                      {percentages.laundry.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Koszty prania pościeli i ręczników
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                  <div className="group relative rounded-lg bg-purple-50 p-3 text-center">
                                    <span className="block text-sm font-medium text-purple-900">
                                      Tekstylia
                                    </span>
                                    <span className="mt-1 block text-2xl font-bold text-purple-700">
                                      {percentages.textiles.toFixed(1)}%
                                    </span>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                      Koszty pościeli, ręczników, dekoracji
                                      <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-lg bg-gray-50 p-3 text-center">
                                  <p className="text-lg font-bold text-gray-900">
                                    Suma kategorii:{" "}
                                    {percentages
                                      ? (() => {
                                          const sum =
                                            percentages.payout +
                                            percentages.adminCommission +
                                            percentages.otaCommissions +
                                            percentages.cleaning +
                                            percentages.laundry +
                                            percentages.textiles +
                                            percentages.rent +
                                            percentages.utilities +
                                            percentages.otherExpenses;
                                          return sum.toFixed(1);
                                        })()
                                      : "0"}
                                    %
                                  </p>
                                  {percentages &&
                                    (() => {
                                      const sum =
                                        percentages.payout +
                                        percentages.adminCommission +
                                        percentages.otaCommissions +
                                        percentages.cleaning +
                                        percentages.laundry +
                                        percentages.textiles +
                                        percentages.rent +
                                        percentages.utilities +
                                        percentages.otherExpenses;
                                      const remaining = 100 - sum;
                                      // Pokaż "Pozostałe" tylko jeśli jest znacząca wartość
                                      return remaining > 0.5 ? (
                                        <p className="mt-1 text-sm text-gray-600">
                                          Pozostałe {remaining.toFixed(1)}% to
                                          inne koszty
                                        </p>
                                      ) : null;
                                    })()}
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-lg bg-gray-50 p-6 text-center">
                                <p className="text-gray-500">
                                  Brak danych do wyliczenia
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Mini wykres kołowy dla trybu Normalny */}
                        {percentages && (
                          <div className="mt-4">
                            <h6 className="mb-2 text-sm font-medium text-gray-700">
                              Podział procentowy:
                            </h6>
                            <ResponsiveContainer width="100%" height={200}>
                              <PieChart>
                                <Pie
                                  data={getMiniPieData("normal")}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={60}
                                  dataKey="value"
                                >
                                  {getMiniPieData("normal").map((entry) => (
                                    <Cell
                                      key={`cell-${entry.name}`}
                                      fill={entry.fill}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip content={<PieChartTooltip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <h3 className="mb-3 text-sm font-semibold sm:text-base">
                    Źródła przychodów
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart
                      margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                    >
                      <Pie
                        data={revenueSourceData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="percentage"
                        label={renderCustomLabel}
                      >
                        {revenueSourceData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<RevenueSourceTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    {revenueSourceData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded"
                          style={{ backgroundColor: entry.fill }}
                        />
                        <span>{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-white p-6 text-center shadow">
                <p>Brak danych z raportu do wyświetlenia wykresów.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
