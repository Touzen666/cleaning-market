"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useChartData } from "@/hooks/useChartData";
import ChartExplanationCard from "@/components/ChartExplanationCard";
import ProfileAvatar from "@/components/ProfileAvatar";
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
  LineChart,
  Line,
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
  const [isIconAnimating, setIsIconAnimating] = useState(true);

  // Zatrzymaj animację ikony po 15 sekundach
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsIconAnimating(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

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

  // Get owner profile data for avatar
  const { data: ownerProfile } = api.ownerAuth.getOwnerProfile.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  // Wspólny hook do zarządzania danymi wykresów
  const {
    baseChartData,
    percentages,
    isLoading: isLoadingChartData,
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

  // Funkcja do przeliczania danych dla trybu costsVsPayout
  const getCostsVsPayoutData = useMemo(() => {
    return () => {
      if (!baseChartData.length) return [];

      return baseChartData.map((item) => {
        // Suma 4 kategorii dla trybu costsVsPayout
        const total =
          (item["Wypłata Właściciela"] ?? 0) +
          (item["Złote Wynajmy Prowizja"] ?? 0) +
          (item.Czynsz ?? 0) +
          (item.Media ?? 0);

        // Przeliczamy procenty tak, żeby suma wynosiła 100%
        const payoutPercentage =
          total > 0 ? ((item["Wypłata Właściciela"] ?? 0) / total) * 100 : 0;
        const adminCommissionPercentage =
          total > 0 ? ((item["Złote Wynajmy Prowizja"] ?? 0) / total) * 100 : 0;
        const rentPercentage =
          total > 0 ? ((item.Czynsz ?? 0) / total) * 100 : 0;
        const utilitiesPercentage =
          total > 0 ? ((item.Media ?? 0) / total) * 100 : 0;

        return {
          name: item.name,
          Przychód: 0,
          Sprzątanie: 0,
          Pranie: 0,
          Tekstylia: 0,
          Czynsz: rentPercentage,
          Media: utilitiesPercentage,
          "Złote Wynajmy Prowizja": adminCommissionPercentage,
          "Prowizje OTA": 0,
          "Wypłata Właściciela": payoutPercentage,
          "Koszty stałe": 0,
          "Inne wydatki": 0,
        };
      });
    };
  }, [baseChartData]);

  // Dane dla aktualnego wykresu słupkowego z filtrami
  const filteredChartData =
    chartViewMode === "costsVsPayout"
      ? getCostsVsPayoutData()
      : getFilteredBarChartData(chartFilters);

  // Tooltip dla wykresów słupkowych (pokazuje wartości w PLN)
  // Obiekt z kolorami dla kategorii wykresu
  const chartColors = {
    Przychód: "#82ca9d",
    Sprzątanie: "#8884d8",
    Pranie: "#ff6b6b",
    Tekstylia: "#9c27b0",
    Czynsz: "#ff9800",
    Media: "#2196f3",
    "Złote Wynajmy Prowizja": "#ffc658",
    "Prowizje OTA": "#ff8042",
    "Wypłata Właściciela": "#00C49F",
  };

  const BarChartTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload?.length) {
      return (
        <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p
              key={index}
              className="text-sm"
              style={{
                color:
                  chartColors[entry.name as keyof typeof chartColors] || "#666",
              }}
            >
              {entry.name}:{" "}
              {chartViewMode === "costsVsPayout"
                ? `${entry.value.toFixed(1)}%`
                : `${entry.value.toLocaleString()} PLN`}
            </p>
          ))}
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
                <ProfileAvatar
                  imageUrl={ownerProfile?.profileImageUrl}
                  size="md"
                  alt={`Zdjęcie profilowe ${ownerProfile?.firstName || "właściciela"}`}
                  className="h-full w-full"
                />
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
                        Złote Wynajmy & Właściciel
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
                        tickFormatter={(value) =>
                          chartViewMode === "costsVsPayout"
                            ? `${Number(value).toFixed(1)}%`
                            : Number(value).toFixed(2)
                        }
                        tick={{ fontSize: 11 }}
                        className="text-xs sm:text-sm"
                      />
                      <Tooltip content={<BarChartTooltip />} />
                      {chartViewMode === "costsVsPayout" ? (
                        <>
                          <Bar dataKey="Wypłata Właściciela" fill="#00C49F" />
                          <Bar
                            dataKey="Złote Wynajmy Prowizja"
                            fill="#ffc658"
                          />
                          <Bar dataKey="Czynsz" fill="#ff9800" />
                          <Bar dataKey="Media" fill="#2196f3" />
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
                            style={{ backgroundColor: "#00C49F" }}
                          />
                          <span>Wypłata Właściciela</span>
                        </div>
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
                            <span>Złote Wynajmy</span>
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

                  {/* Komunikat informacyjny dla wszystkich trybów */}
                  <div className="mt-4">
                    <div
                      className="rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm"
                      onMouseEnter={() => setIsIconAnimating(false)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div
                            className={`${isIconAnimating ? "animate-bounce" : ""}`}
                          >
                            <svg
                              className="h-6 w-6 text-orange-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-orange-800">
                            Prezentowany wykres jest sumą wszystkich 4
                            parametrów.{" "}
                            <span className="font-bold">Zysk netto</span>{" "}
                            prezentowany na tym przykładzie zakłada że media
                            oraz czynsz są opłacane przez Złote Wynajmy. Jeśli
                            Czynsz i Media będą opłacane przez właściciela będą
                            jego przychodem co będzie jednocześnie oznaczało
                            wyższą podstawę do opodatkowania. Jeśli jednak taki
                            przypadek się zdarzy wartości procentowe dla czynszu
                            i mediów w tym wykresie będą w postaci 0% lub jeśli
                            tendencja będzie mieszana wartości te będą stosownie
                            niższe.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart Explanation Card */}
                {chartViewMode === "costsVsPayout" && percentages && (
                  <ChartExplanationCard
                    title="Złote Wynajmy & Właściciel"
                    description="Pokazuje podział między właścicielem a Złote Wynajmy. Przewidziany podział to 75% (Właściciel + Czynsz + Media) + 25% (Prowizja Złote Wynajmy)."
                    data={[
                      {
                        name: "Wypłata Właściciela",
                        value: percentages.payout,
                        fill: "#00C49F",
                        description: "Końcowa wypłata dla właściciela",
                      },
                      {
                        name: "Prowizja Złote Wynajmy",
                        value: percentages.adminCommission,
                        fill: "#ffc658",
                        description: "Prowizja Złote Wynajmy",
                      },
                      {
                        name: "Czynsz",
                        value: percentages.rent,
                        fill: "#ff8042",
                        description: "Koszty czynszu administracyjnego",
                      },
                      {
                        name: "Media",
                        value: percentages.utilities,
                        fill: "#00CED1",
                        description: "Koszty mediów",
                      },
                    ]}
                    mode="costsVsPayout"
                    showPieChart={true}
                  />
                )}

                {chartViewMode === "fixedCosts" && percentages && (
                  <ChartExplanationCard
                    title="Koszty stałe"
                    description="Szczegółowy podział kosztów stałych w Twoim biznesie: Sprzątanie - koszty sprzątania i środków czystości. Pranie - koszty prania pościeli i ręczników. Tekstylia - koszty pościeli, ręczników, dekoracji. Prowizje OTA - prowizje od platform bookingowych."
                    data={[
                      {
                        name: "Sprzątanie",
                        value: percentages.cleaning,
                        fill: "#8884d8",
                        description: "Koszty sprzątania i środków czystości",
                      },
                      {
                        name: "Pranie",
                        value: percentages.laundry,
                        fill: "#ff6b6b",
                        description: "Koszty prania pościeli i ręczników",
                      },
                      {
                        name: "Tekstylia",
                        value: percentages.textiles,
                        fill: "#9c27b0",
                        description: "Koszty pościeli, ręczników, dekoracji",
                      },
                      {
                        name: "Prowizje OTA",
                        value: percentages.otaCommissions,
                        fill: "#ff8042",
                        description:
                          "Prowizje od platform bookingowych (Booking.com, Airbnb itp.)",
                      },
                    ]}
                    mode="fixedCosts"
                    showPieChart={true}
                  />
                )}

                {chartViewMode === "normal" && percentages && (
                  <ChartExplanationCard
                    title="Pokaż wszystkie"
                    description="Pełen udział wszystkich składowych inwestycji w przychodzie. Wszystkie kategorie wyświetlone osobno z własnymi procentami."
                    data={[
                      {
                        name: "Wypłata Właściciela",
                        value: percentages.payout,
                        fill: "#00C49F",
                        description: "Końcowa wypłata dla właściciela",
                      },
                      {
                        name: "Czynsz",
                        value: percentages.rent,
                        fill: "#ff8042",
                        description:
                          "Koszty czynszu administracyjnego jako % przychodu. Jeśli płacisz samodzielnie - wypłata jest wyższa o te koszty, co zwiększa podatek dochodowy.",
                      },
                      {
                        name: "Media",
                        value: percentages.utilities,
                        fill: "#00CED1",
                        description:
                          "Koszty mediów (prąd, gaz, woda, internet) jako % przychodu. Jeśli płacisz samodzielnie - wypłata jest wyższa o te koszty, co zwiększa podatek dochodowy.",
                      },
                      {
                        name: "Prowizja Złote Wynajmy",
                        value: percentages.adminCommission,
                        fill: "#ffc658",
                        description:
                          "Prowizja pobierana przez Złote Wynajmy za zarządzanie nieruchomością",
                      },
                      {
                        name: "Prowizje OTA",
                        value: percentages.otaCommissions,
                        fill: "#ff6b6b",
                        description:
                          "Prowizje od platform bookingowych (Booking.com, Airbnb itp.)",
                      },
                      {
                        name: "Sprzątanie",
                        value: percentages.cleaning,
                        fill: "#8884d8",
                        description: "Koszty sprzątania i środków czystości",
                      },
                      {
                        name: "Pranie",
                        value: percentages.laundry,
                        fill: "#9c27b0",
                        description: "Koszty prania pościeli i ręczników",
                      },
                      {
                        name: "Tekstylia",
                        value: percentages.textiles,
                        fill: "#e91e63",
                        description: "Koszty pościeli, ręczników, dekoracji",
                      },
                    ]}
                    mode="normal"
                    showPieChart={true}
                  />
                )}

                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <h3 className="mb-3 text-sm font-semibold sm:text-base">
                    Źródła przychodów
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart
                      margin={{ top: 20, right: 80, bottom: 20, left: 80 }}
                    >
                      <Pie
                        data={[
                          {
                            name: "Booking",
                            value: 69.1,
                            percentage: 69.1,
                            fill: "#003580",
                          },
                          {
                            name: "Airbnb",
                            value: 9.4,
                            percentage: 9.4,
                            fill: "#FF5A5F",
                          },
                          {
                            name: "Złote Wynajmy",
                            value: 11.5,
                            percentage: 11.5,
                            fill: "#FFD700",
                          },
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="percentage"
                        label={renderCustomLabel}
                      >
                        <Cell fill="#003580" />
                        <Cell fill="#FF5A5F" />
                        <Cell fill="#FFD700" />
                      </Pie>
                      <Tooltip content={<RevenueSourceTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#003580" }}
                      />
                      <span>Booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#FF5A5F" }}
                      />
                      <span>Airbnb</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#FFD700" }}
                      />
                      <span>Złote Wynajmy</span>
                    </div>
                  </div>
                </div>

                {/* Wykres liniowy - Trend procentowy kategorii */}
                {percentages && (
                  <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                    <h3 className="mb-3 text-sm font-semibold sm:text-base">
                      Trend procentowy kategorii
                    </h3>
                    <div className="relative">
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart
                          data={[
                            {
                              name: "Wypłata Właściciela",
                              value: percentages.payout,
                              color: "#00C49F",
                            },
                            {
                              name: "Czynsz",
                              value: percentages.rent,
                              color: "#ff9800",
                            },
                            {
                              name: "Media",
                              value: percentages.utilities,
                              color: "#2196f3",
                            },
                            {
                              name: "Prowizja Złote Wynajmy",
                              value: percentages.adminCommission,
                              color: "#ffc658",
                            },
                            {
                              name: "Prowizje OTA",
                              value: percentages.otaCommissions,
                              color: "#ff8042",
                            },
                            {
                              name: "Sprzątanie",
                              value: percentages.cleaning,
                              color: "#8884d8",
                            },
                            {
                              name: "Pranie",
                              value: percentages.laundry,
                              color: "#ff6b6b",
                            },
                            {
                              name: "Tekstylia",
                              value: percentages.textiles,
                              color: "#9c27b0",
                            },
                          ]}
                          margin={{
                            top: 20,
                            right: 30,
                            left: 20,
                            bottom: 20,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="name"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                            tick={{ fontSize: 10 }}
                          />
                          <YAxis
                            tickFormatter={(value) => `${value}%`}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip
                            formatter={(value: number | string) => [
                              `${value}%`,
                              "Udział",
                            ]}
                            labelFormatter={(label: string) => label}
                          />
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#8884d8"
                            strokeWidth={3}
                            dot={{
                              fill: "#8884d8",
                              strokeWidth: 2,
                              r: 4,
                            }}
                            activeDot={{
                              r: 6,
                              stroke: "#8884d8",
                              strokeWidth: 2,
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>

                      {/* Overlay z komunikatem */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black bg-opacity-50">
                        <div className="max-w-md rounded-lg bg-white p-6 text-center shadow-lg">
                          <div className="mb-3 text-blue-600">
                            <svg
                              className="mx-auto h-12 w-12"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                          </div>
                          <h4 className="mb-2 text-lg font-semibold text-gray-900">
                            Wkrótce nowe wykresy!
                          </h4>
                          <p className="text-sm text-gray-600">
                            Wkrótce udostępnimy Ci nowe wykresy, abyś mógł
                            jeszcze dokładniej śledzić rozwój swoich inwestycji.
                          </p>
                          <p className="text-sm text-gray-600">
                            Zbyt mało danych by móc skorzystać z zawansowanych
                            wykresów.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
