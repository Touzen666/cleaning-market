"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { FaCar, FaCarSide, FaPencilAlt } from "react-icons/fa";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  type LegendProps,
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

  // Get filtered reports data
  const {
    data: filteredReportsData,
    isLoading: isLoadingFilteredReports,
    error: filteredReportsError,
  } = api.monthlyReports.getOwnerFilteredReports.useQuery(
    {
      ownerEmail: ownerEmail!,
      apartmentId: selectedApartmentId,
      year: selectedYear,
      month: selectedMonth,
      reportId: selectedReportId,
      viewType,
    },
    { enabled: !!ownerEmail },
  );

  // Get available apartments for filtering
  const { data: availableApartments, isLoading: isLoadingApartments } =
    api.monthlyReports.getOwnerFilteredReports.useQuery(
      {
        ownerEmail: ownerEmail!,
        viewType: "single",
      },
      { enabled: !!ownerEmail },
    );

  // Get available years for filtering
  const { data: availableYears, isLoading: isLoadingYears } =
    api.monthlyReports.getOwnerAvailableYears.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
      },
      { enabled: !!ownerEmail },
    );

  // Get available months for filtering
  const { data: availableMonths, isLoading: isLoadingMonths } =
    api.monthlyReports.getOwnerAvailableMonths.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
        year: selectedYear!,
      },
      { enabled: !!ownerEmail && !!selectedYear },
    );

  // Get available reports for filtering
  const { data: availableReports, isLoading: isLoadingReports } =
    api.monthlyReports.getOwnerAvailableReports.useQuery(
      {
        ownerEmail: ownerEmail!,
        apartmentId: selectedApartmentId,
        year: selectedYear,
        month: selectedMonth,
      },
      { enabled: !!ownerEmail },
    );

  const {
    data: reportData,
    isLoading: isLoadingReport,
    error: reportError,
  } = api.monthlyReports.getFirstOwnerReport.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  const pieData = useMemo(() => {
    if (!reportData) return [];

    const totalRevenue = reportData.calculated.totalRevenue;
    if (totalRevenue === 0) return [];

    const zloteWynajmyPercent = 0.12;
    const airbnbPercent = 0.1;

    const zloteWynajmyValue = totalRevenue * zloteWynajmyPercent;
    const airbnbValue = totalRevenue * airbnbPercent;
    const bookingValue = totalRevenue - zloteWynajmyValue - airbnbValue;

    return [
      { name: "Złote Wynajmy", value: zloteWynajmyValue },
      { name: "Airbnb", value: airbnbValue },
      { name: "Booking", value: bookingValue },
    ];
  }, [reportData]);

  const isLoading =
    isLoadingDashboard || isLoadingReport || isLoadingFilteredReports;
  const error = dashboardError ?? reportError ?? filteredReportsError;

  // Use filtered data for charts if available, otherwise fall back to original data
  const chartData =
    filteredReportsData?.chartData ??
    (reportData
      ? [
          {
            name: "Raport",
            Przychód: reportData.calculated.totalRevenue,
            Koszty: reportData.calculated.totalExpenses,
            Zysk: reportData.calculated.netIncome,
            Prowizja: reportData.calculated.adminCommission,
            Wypłata: reportData.calculated.ownerPayout,
          },
        ]
      : []);

  const COLORS = {
    "Złote Wynajmy": "#FFBB28", // Orange
    Airbnb: "#FF5A5F", // Pink
    Booking: "#0088FE", // Blue
  };
  const pieChartData = pieData.map((entry) => ({
    ...entry,
    fill: COLORS[entry.name as keyof typeof COLORS],
  }));

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
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

  const handleFilterReset = () => {
    setSelectedApartmentId(undefined);
    setSelectedYear(undefined);
    setSelectedMonth(undefined);
    setSelectedReportId(undefined);
    setViewType("yearly");
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Panel Właściciela
          </h1>
          <p className="text-gray-600">
            Witaj, {owner.firstName} {owner.lastName}!
          </p>
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

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                        setSelectedApartmentId(
                          e.target.value ? Number(e.target.value) : undefined,
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
                        setViewType(
                          e.target.value as "yearly" | "monthly" | "single",
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
                      onChange={(e) => {
                        setSelectedYear(
                          e.target.value ? Number(e.target.value) : undefined,
                        );
                        setSelectedMonth(undefined);
                        setSelectedReportId(undefined);
                      }}
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
                      onChange={(e) => {
                        setSelectedMonth(
                          e.target.value ? Number(e.target.value) : undefined,
                        );
                        setSelectedReportId(undefined);
                      }}
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
                        setSelectedReportId(e.target.value || undefined)
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
                      onClick={handleFilterReset}
                      className="w-full rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
                    >
                      Resetuj filtry
                    </button>
                  </div>
                </div>
              </div>
            )}

            {chartData.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <h3 className="mb-3 text-sm font-semibold sm:text-base">
                    Wyniki finansowe
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={chartData}
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
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Przychód" fill="#82ca9d" />
                      <Bar dataKey="Koszty" fill="#8884d8" />
                      <Bar dataKey="Zysk" fill="#ffc658" />
                      <Bar dataKey="Prowizja" fill="#ff8042" />
                      <Bar dataKey="Wypłata" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#82ca9d" }}
                      />
                      <span>Przychód</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#8884d8" }}
                      />
                      <span>Koszty</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#ffc658" }}
                      />
                      <span>Zysk</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#ff8042" }}
                      />
                      <span>Prowizja</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded"
                        style={{ backgroundColor: "#00C49F" }}
                      />
                      <span>Wypłata</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3 shadow sm:p-4 lg:p-6">
                  <h3 className="mb-3 text-sm font-semibold sm:text-base">
                    Źródła przychodów
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {pieChartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
                    {pieChartData.map((entry) => (
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
