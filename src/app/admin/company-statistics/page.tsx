"use client";

import React, { useEffect, useMemo, useState } from "react";
import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { api } from "@/trpc/react";
import { formatPlnAmount } from "@/lib/company-statistics";

const DEFAULT_TARGET_PROFIT = 550;
const FILTERS_STORAGE_KEY = "admin-company-statistics-filters";

type StoredFilters = {
    search?: string;
    selectedApartmentId?: string | null;
    startYear?: number;
    startMonth?: number;
    endYear?: number;
    endMonth?: number;
    targetMonthlyProfit?: number;
};

function isValidMonth(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 12;
}

function isValidYear(value: unknown): value is number {
    return (
        typeof value === "number" &&
        Number.isInteger(value) &&
        value >= 2000 &&
        value <= 2100
    );
}

const MONTHS = [
    { value: 1, label: "Styczeń" },
    { value: 2, label: "Luty" },
    { value: 3, label: "Marzec" },
    { value: 4, label: "Kwiecień" },
    { value: 5, label: "Maj" },
    { value: 6, label: "Czerwiec" },
    { value: 7, label: "Lipiec" },
    { value: 8, label: "Sierpień" },
    { value: 9, label: "Wrzesień" },
    { value: 10, label: "Październik" },
    { value: 11, label: "Listopad" },
    { value: 12, label: "Grudzień" },
];

function buildYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    for (let year = currentYear + 1; year >= currentYear - 5; year -= 1) {
        years.push(year);
    }
    return years;
}

function formatMonthCount(count: number): string {
    if (count === 1) return "1 miesiąc";
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
        return `${count} miesiące`;
    }
    return `${count} miesięcy`;
}

function CommissionTable({
    title,
    entries,
    total,
    totalLabel,
    emptyMessage,
    showMonthCount = false,
    showBreakdown = false,
}: {
    title: string;
    entries: Array<{
        label: string;
        commission: number;
        hostPayout?: number;
        additionalDeductionsProfit?: number;
    }>;
    total?: number;
    totalLabel?: string;
    emptyMessage?: string;
    showMonthCount?: boolean;
    showBreakdown?: boolean;
}) {
    return (
        <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900">
                    {title}
                    {showMonthCount && (
                        <span className="ml-2 font-normal text-gray-500">
                            ({formatMonthCount(entries.length)})
                        </span>
                    )}
                </h3>
            </div>
            {entries.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">{emptyMessage}</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Miesiąc
                                </th>
                                {showBreakdown && (
                                    <>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                                            Prowizja ZW
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                                            5% odliczeń
                                        </th>
                                    </>
                                )}
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                                    {showBreakdown ? "Razem" : "Prowizja ZW + 5% odliczeń"}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {entries.map((entry) => (
                                <tr key={entry.label}>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {entry.label}
                                    </td>
                                    {showBreakdown && (
                                        <>
                                            <td
                                                className={`px-4 py-3 text-right text-sm ${
                                                    (entry.hostPayout ?? 0) >= 0
                                                        ? "text-green-700"
                                                        : "text-red-700"
                                                }`}
                                            >
                                                {formatPlnAmount(entry.hostPayout ?? 0)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-blue-700">
                                                {formatPlnAmount(
                                                    entry.additionalDeductionsProfit ?? 0,
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td
                                        className={`px-4 py-3 text-right text-sm font-medium ${
                                            entry.commission >= 0
                                                ? "text-green-700"
                                                : "text-red-700"
                                        }`}
                                    >
                                        {formatPlnAmount(entry.commission)}
                                    </td>
                                </tr>
                            ))}
                            {total !== undefined && totalLabel && (
                                <tr className="bg-gray-50 font-semibold">
                                    <td
                                        className="px-4 py-3 text-sm text-gray-900"
                                        colSpan={showBreakdown ? 3 : 1}
                                    >
                                        {totalLabel}
                                    </td>
                                    <td
                                        className={`px-4 py-3 text-right text-sm ${
                                            total >= 0 ? "text-green-700" : "text-red-700"
                                        }`}
                                    >
                                        {formatPlnAmount(total)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function BalanceBreakdownCards({
    hostPayoutTotal,
    additionalDeductionsTotal,
    additionalDeductionsProfitTotal,
}: {
    hostPayoutTotal: number;
    additionalDeductionsTotal: number;
    additionalDeductionsProfitTotal: number;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                    Prowizja ZW
                </div>
                <div
                    className={`mt-1 text-xl font-bold ${
                        hostPayoutTotal >= 0 ? "text-green-700" : "text-red-700"
                    }`}
                >
                    {formatPlnAmount(hostPayoutTotal)}
                </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500">
                    Dodatkowe odliczenia
                </div>
                <div className="mt-1 text-xl font-bold text-gray-900">
                    {formatPlnAmount(additionalDeductionsTotal)}
                </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-blue-700">
                    Zysk z odliczeń (5%)
                    <span
                        className="inline-flex text-blue-500"
                        title="5% kwoty dodatkowych odliczeń (brutto) uznajemy jako zysk Złote Wynajmy"
                    >
                        <InformationCircleIcon className="h-3.5 w-3.5" />
                    </span>
                </div>
                <div className="mt-1 text-xl font-bold text-blue-800">
                    {formatPlnAmount(additionalDeductionsProfitTotal)}
                </div>
            </div>
        </div>
    );
}

export default function CompanyStatisticsPage() {
    const currentYear = new Date().getFullYear();
    const yearOptions = useMemo(() => buildYearOptions(), []);

    const [filtersLoaded, setFiltersLoaded] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(
        null,
    );
    const [startYear, setStartYear] = useState(currentYear);
    const [startMonth, setStartMonth] = useState(1);
    const [endYear, setEndYear] = useState(currentYear);
    const [endMonth, setEndMonth] = useState(12);
    const [targetMonthlyProfit, setTargetMonthlyProfit] = useState(
        DEFAULT_TARGET_PROFIT,
    );
    const [detailsRequested, setDetailsRequested] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        try {
            const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
            if (!raw) {
                setFiltersLoaded(true);
                return;
            }

            const parsed = JSON.parse(raw) as StoredFilters;

            if (typeof parsed.search === "string") {
                setSearch(parsed.search);
            }
            if (
                parsed.selectedApartmentId === null ||
                typeof parsed.selectedApartmentId === "string"
            ) {
                setSelectedApartmentId(parsed.selectedApartmentId);
            }
            if (isValidYear(parsed.startYear)) setStartYear(parsed.startYear);
            if (isValidMonth(parsed.startMonth)) setStartMonth(parsed.startMonth);
            if (isValidYear(parsed.endYear)) setEndYear(parsed.endYear);
            if (isValidMonth(parsed.endMonth)) setEndMonth(parsed.endMonth);
            if (
                typeof parsed.targetMonthlyProfit === "number" &&
                Number.isFinite(parsed.targetMonthlyProfit) &&
                parsed.targetMonthlyProfit >= 0
            ) {
                setTargetMonthlyProfit(parsed.targetMonthlyProfit);
            }
        } catch {
            window.localStorage.removeItem(FILTERS_STORAGE_KEY);
        } finally {
            setFiltersLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!filtersLoaded || typeof window === "undefined") return;

        const payload: StoredFilters = {
            search,
            selectedApartmentId,
            startYear,
            startMonth,
            endYear,
            endMonth,
            targetMonthlyProfit,
        };
        window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
    }, [
        filtersLoaded,
        search,
        selectedApartmentId,
        startYear,
        startMonth,
        endYear,
        endMonth,
        targetMonthlyProfit,
    ]);

    const apartmentsQuery = api.apartments.getAll.useQuery({
        includeArchived: true,
    });

    const balanceQuery = api.companyStatistics.getApartmentCommissionBalance.useQuery(
        {
            apartmentId: Number(selectedApartmentId),
            startYear,
            startMonth,
            endYear,
            endMonth,
            targetMonthlyProfit,
        },
        {
            enabled: filtersLoaded && selectedApartmentId !== null,
        },
    );

    const companyBalanceQuery = api.companyStatistics.getCompanyCommissionBalance.useQuery(
        {
            startYear,
            startMonth,
            endYear,
            endMonth,
        },
        {
            enabled: filtersLoaded && selectedApartmentId === null,
        },
    );

    const settlementDetailsQuery =
        api.companyStatistics.getApartmentSettlementDetails.useQuery(
            {
                apartmentId: Number(selectedApartmentId),
                startYear,
                startMonth,
                endYear,
                endMonth,
            },
            {
                enabled:
                    filtersLoaded &&
                    detailsRequested &&
                    selectedApartmentId !== null,
            },
        );

    // Po zmianie apartamentu / okresu ukryj szczegóły — trzeba je zaciągnąć ponownie
    useEffect(() => {
        setDetailsRequested(false);
    }, [selectedApartmentId, startYear, startMonth, endYear, endMonth]);

    const filteredApartments = useMemo(() => {
        const apartments = apartmentsQuery.data?.apartments ?? [];
        const query = search.trim().toLowerCase();
        if (!query) return apartments;

        return apartments.filter(
            (apartment) =>
                apartment.name.toLowerCase().includes(query) ||
                apartment.slug.toLowerCase().includes(query) ||
                apartment.address.toLowerCase().includes(query),
        );
    }, [apartmentsQuery.data?.apartments, search]);

    const applyYearPreset = (year: number) => {
        setStartYear(year);
        setStartMonth(1);
        setEndYear(year);
        setEndMonth(12);
    };

    const selectedApartment = apartmentsQuery.data?.apartments.find(
        (apartment) => apartment.id === selectedApartmentId,
    );

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Statystyki firmy</h1>
                <p className="mt-1 text-sm text-gray-600">
                    Bilans dochodu i strat na podstawie prowizji Złote Wynajmy oraz
                    5% dodatkowych odliczeń (jako zysk ZW).
                </p>
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[320px_1fr]">
                <aside className="flex max-h-none flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
                    <h2 className="shrink-0 text-lg font-semibold text-gray-900">
                        Apartamenty
                    </h2>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Szukaj apartamentu..."
                        className="mt-3 w-full shrink-0 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain">
                        <button
                            type="button"
                            onClick={() => setSelectedApartmentId(null)}
                            className={`w-full rounded-md border px-3 py-3 text-left transition ${
                                selectedApartmentId === null
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                        >
                            <div className="font-medium text-gray-900">Cała firma</div>
                            <div className="mt-1 text-xs text-gray-500">
                                Bilans wszystkich apartamentów
                            </div>
                        </button>

                        {apartmentsQuery.isLoading && (
                            <p className="text-sm text-gray-500">Ładowanie...</p>
                        )}
                        {!apartmentsQuery.isLoading && filteredApartments.length === 0 && (
                            <p className="text-sm text-gray-500">
                                Brak apartamentów spełniających kryteria.
                            </p>
                        )}
                        {filteredApartments.map((apartment) => {
                            const isSelected = selectedApartmentId === apartment.id;
                            return (
                                <button
                                    key={apartment.id}
                                    type="button"
                                    onClick={() => setSelectedApartmentId(apartment.id)}
                                    className={`w-full rounded-md border px-3 py-3 text-left transition ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    }`}
                                >
                                    <div className="font-medium text-gray-900">
                                        {apartment.name}
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        {apartment.address}
                                    </div>
                                    {apartment.archived && (
                                        <span className="mt-2 inline-block rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-700">
                                            Zarchiwizowany
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className="space-y-6">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900">
                                    {selectedApartmentId === null
                                        ? "Bilans całej firmy"
                                        : selectedApartment?.name}
                                </h2>
                                <p className="text-sm text-gray-500">
                                    Okres: pełne miesiące kalendarzowe
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {yearOptions.slice(0, 3).map((year) => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => applyYearPreset(year)}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                                    >
                                        Rok {year}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="block text-sm">
                                <span className="mb-1 block text-gray-600">
                                    Od — miesiąc
                                </span>
                                <select
                                    value={startMonth}
                                    onChange={(event) =>
                                        setStartMonth(Number(event.target.value))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    {MONTHS.map((month) => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block text-gray-600">Od — rok</span>
                                <select
                                    value={startYear}
                                    onChange={(event) =>
                                        setStartYear(Number(event.target.value))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    {yearOptions.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block text-gray-600">
                                    Do — miesiąc
                                </span>
                                <select
                                    value={endMonth}
                                    onChange={(event) =>
                                        setEndMonth(Number(event.target.value))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    {MONTHS.map((month) => (
                                        <option key={month.value} value={month.value}>
                                            {month.label}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block text-sm">
                                <span className="mb-1 block text-gray-600">Do — rok</span>
                                <select
                                    value={endYear}
                                    onChange={(event) =>
                                        setEndYear(Number(event.target.value))
                                    }
                                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                                >
                                    {yearOptions.map((year) => (
                                        <option key={year} value={year}>
                                            {year}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {selectedApartmentId === null && (
                        <>
                            {companyBalanceQuery.isLoading && (
                                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                                    Obliczanie bilansu firmy...
                                </div>
                            )}
                            {companyBalanceQuery.error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                                    {companyBalanceQuery.error.message}
                                </div>
                            )}
                            {companyBalanceQuery.data && (
                                <div className="space-y-6">
                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                                Apartamenty z raportami
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-gray-900">
                                                {
                                                    companyBalanceQuery.data.summary
                                                        .apartmentsWithReports
                                                }
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                                Raporty w okresie
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-gray-900">
                                                {companyBalanceQuery.data.summary.totalReports}
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                                Na plusie
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-green-700">
                                                {
                                                    companyBalanceQuery.data.summary
                                                        .apartmentsWithProfit
                                                }
                                            </div>
                                        </div>
                                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                                            <div className="text-xs uppercase tracking-wide text-gray-500">
                                                Na minusie
                                            </div>
                                            <div className="mt-1 text-2xl font-bold text-red-700">
                                                {
                                                    companyBalanceQuery.data.summary
                                                        .apartmentsWithLoss
                                                }
                                            </div>
                                        </div>
                                    </div>

                                    <BalanceBreakdownCards
                                        hostPayoutTotal={
                                            companyBalanceQuery.data.hostPayoutTotal
                                        }
                                        additionalDeductionsTotal={
                                            companyBalanceQuery.data.additionalDeductionsTotal
                                        }
                                        additionalDeductionsProfitTotal={
                                            companyBalanceQuery.data
                                                .additionalDeductionsProfitTotal
                                        }
                                    />

                                    <CommissionTable
                                        title="Miesięczny bilans — firma"
                                        entries={companyBalanceQuery.data.monthlyEntries}
                                        emptyMessage="Brak raportów w wybranym okresie."
                                        showBreakdown
                                    />

                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <CommissionTable
                                            title="Dodatnie"
                                            entries={companyBalanceQuery.data.positiveEntries}
                                            total={companyBalanceQuery.data.positiveTotal}
                                            totalLabel="Suma dodatnich"
                                            emptyMessage="Brak dodatnich miesięcy."
                                            showMonthCount
                                        />
                                        <CommissionTable
                                            title="Ujemne"
                                            entries={companyBalanceQuery.data.negativeEntries}
                                            total={companyBalanceQuery.data.negativeTotal}
                                            totalLabel="Suma ujemnych"
                                            emptyMessage="Brak ujemnych miesięcy."
                                            showMonthCount
                                        />
                                    </div>

                                    <div className="rounded-lg border-2 border-gray-900 bg-gray-50 p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Bilans całej firmy
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {companyBalanceQuery.data.period.startLabel} —{" "}
                                                    {companyBalanceQuery.data.period.endLabel}
                                                </p>
                                            </div>
                                            <div
                                                className={`text-2xl font-bold ${
                                                    companyBalanceQuery.data.balance >= 0
                                                        ? "text-green-700"
                                                        : "text-red-700"
                                                }`}
                                            >
                                                {companyBalanceQuery.data.balance >= 0
                                                    ? "+"
                                                    : ""}
                                                {formatPlnAmount(
                                                    companyBalanceQuery.data.balance,
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-gray-200 bg-white">
                                        <div className="border-b border-gray-200 px-4 py-3">
                                            <h3 className="text-base font-semibold text-gray-900">
                                                Bilans per apartament
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Posortowane od największej straty
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                                                            Apartament
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-500">
                                                            Miesiące
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-500">
                                                            Dodatnie
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-500">
                                                            Ujemne
                                                        </th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-500">
                                                            Bilans
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {companyBalanceQuery.data.apartmentBalances.map(
                                                        (apt) => (
                                                            <tr
                                                                key={apt.apartmentId}
                                                                className="cursor-pointer hover:bg-gray-50"
                                                                onClick={() =>
                                                                    setSelectedApartmentId(
                                                                        String(apt.apartmentId),
                                                                    )
                                                                }
                                                            >
                                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                                    {apt.name}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-gray-600">
                                                                    {apt.monthCount}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-green-700">
                                                                    {formatPlnAmount(
                                                                        apt.positiveTotal,
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-red-700">
                                                                    {formatPlnAmount(
                                                                        apt.negativeTotal,
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={`px-4 py-3 text-right font-semibold ${
                                                                        apt.balance >= 0
                                                                            ? "text-green-700"
                                                                            : "text-red-700"
                                                                    }`}
                                                                >
                                                                    {apt.balance >= 0 ? "+" : ""}
                                                                    {formatPlnAmount(apt.balance)}
                                                                </td>
                                                            </tr>
                                                        ),
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {selectedApartmentId && (
                        <>
                            {balanceQuery.isLoading && (
                                <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                                    Obliczanie bilansu...
                                </div>
                            )}

                            {balanceQuery.error && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                                    {balanceQuery.error.message}
                                </div>
                            )}

                            {balanceQuery.data && (
                                <div className="space-y-6">
                                    <BalanceBreakdownCards
                                        hostPayoutTotal={balanceQuery.data.hostPayoutTotal}
                                        additionalDeductionsTotal={
                                            balanceQuery.data.additionalDeductionsTotal
                                        }
                                        additionalDeductionsProfitTotal={
                                            balanceQuery.data.additionalDeductionsProfitTotal
                                        }
                                    />

                                    <CommissionTable
                                        title="Miesięczny bilans"
                                        entries={balanceQuery.data.monthlyEntries}
                                        emptyMessage="Brak raportów w wybranym okresie."
                                        showBreakdown
                                    />

                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <h3 className="text-base font-semibold text-gray-900">
                                                    Czynsz, media i dodatkowe odliczenia
                                                </h3>
                                                <p className="mt-1 text-sm text-gray-600">
                                                    Sprawdź tryb rozliczenia (czynsz i media) oraz
                                                    dodatkowe odliczenia — 5% ich kwoty wchodzi do
                                                    bilansu jako zysk ZW.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (detailsRequested) {
                                                        void settlementDetailsQuery.refetch();
                                                    } else {
                                                        setDetailsRequested(true);
                                                    }
                                                }}
                                                disabled={
                                                    detailsRequested &&
                                                    settlementDetailsQuery.isFetching
                                                }
                                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {settlementDetailsQuery.isFetching
                                                    ? "Pobieranie..."
                                                    : detailsRequested
                                                      ? "Odśwież szczegóły"
                                                      : "Zaciągnij szczegóły"}
                                            </button>
                                        </div>

                                        {detailsRequested && settlementDetailsQuery.error && (
                                            <p className="mt-3 text-sm text-red-600">
                                                {settlementDetailsQuery.error.message}
                                            </p>
                                        )}

                                        {detailsRequested && settlementDetailsQuery.data && (
                                            <div className="mt-4 space-y-4">
                                                <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-900">
                                                    {settlementDetailsQuery.data.note}
                                                </p>

                                                <div className="flex flex-wrap gap-3 text-sm">
                                                    <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">
                                                        Z odjęciem mediów:{" "}
                                                        {
                                                            settlementDetailsQuery.data.summary
                                                                .withDeduction
                                                        }
                                                    </span>
                                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-800">
                                                        Bez odjęcia mediów:{" "}
                                                        {
                                                            settlementDetailsQuery.data.summary
                                                                .withoutDeduction
                                                        }
                                                    </span>
                                                    {settlementDetailsQuery.data.summary.mixed >
                                                        0 && (
                                                        <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">
                                                            Mieszane:{" "}
                                                            {
                                                                settlementDetailsQuery.data
                                                                    .summary.mixed
                                                            }
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                        <thead className="bg-gray-50">
                                                            <tr>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                                                    Miesiąc
                                                                </th>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                                                    Typ rozliczenia
                                                                </th>
                                                                <th className="px-3 py-2 text-left font-medium text-gray-500">
                                                                    Czynsz i media
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    Czynsz
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    Media
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    Odliczenia
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    5% odliczeń
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    Prowizja ZW
                                                                </th>
                                                                <th className="px-3 py-2 text-right font-medium text-gray-500">
                                                                    Razem
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {settlementDetailsQuery.data.months.map(
                                                                (month) => {
                                                                    const primary =
                                                                        month.reports[0];
                                                                    const deductionLabel =
                                                                        month.mixedSettlement
                                                                            ? "Mieszane w miesiącu"
                                                                            : month.rentAndUtilitiesDeducted
                                                                              ? "Tak — odjęte od kwoty stałej"
                                                                              : primary?.settlementType ===
                                                                                  "FIXED"
                                                                                ? "Nie — kwota stała bez mediów"
                                                                                : primary?.settlementType ===
                                                                                    "COMMISSION"
                                                                                  ? "Prowizja % (inna logika)"
                                                                                  : primary?.settlementType ===
                                                                                      "COMMISSION_MINUS_UTILITIES"
                                                                                    ? "Tak — odjęte przed prowizją"
                                                                                    : "Brak danych";

                                                                    return (
                                                                        <tr key={month.label}>
                                                                            <td className="px-3 py-2 font-medium text-gray-900">
                                                                                {month.label}
                                                                                {month.reports
                                                                                    .length >
                                                                                    1 && (
                                                                                    <span className="ml-1 text-xs text-gray-500">
                                                                                        (
                                                                                        {
                                                                                            month
                                                                                                .reports
                                                                                                .length
                                                                                        }{" "}
                                                                                        raporty)
                                                                                    </span>
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-gray-700">
                                                                                {month.reports
                                                                                    .map(
                                                                                        (r) =>
                                                                                            r.settlementLabel,
                                                                                    )
                                                                                    .join(" · ")}
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <span
                                                                                    className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                                                                                        month.rentAndUtilitiesDeducted ===
                                                                                        true
                                                                                            ? "bg-green-100 text-green-800"
                                                                                            : month.rentAndUtilitiesDeducted ===
                                                                                                false
                                                                                              ? "bg-orange-100 text-orange-800"
                                                                                              : "bg-gray-100 text-gray-700"
                                                                                    }`}
                                                                                >
                                                                                    {
                                                                                        deductionLabel
                                                                                    }
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {formatPlnAmount(
                                                                                    month.reports.reduce(
                                                                                        (
                                                                                            sum,
                                                                                            r,
                                                                                        ) =>
                                                                                            sum +
                                                                                            r.rentAmount,
                                                                                        0,
                                                                                    ),
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {formatPlnAmount(
                                                                                    month.reports.reduce(
                                                                                        (
                                                                                            sum,
                                                                                            r,
                                                                                        ) =>
                                                                                            sum +
                                                                                            r.utilitiesAmount,
                                                                                        0,
                                                                                    ),
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-gray-700">
                                                                                {formatPlnAmount(
                                                                                    month.additionalDeductionsTotal,
                                                                                )}
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-blue-700">
                                                                                {formatPlnAmount(
                                                                                    month.additionalDeductionsProfit,
                                                                                )}
                                                                            </td>
                                                                            <td
                                                                                className={`px-3 py-2 text-right font-medium ${
                                                                                    month.hostPayout >=
                                                                                    0
                                                                                        ? "text-green-700"
                                                                                        : "text-red-700"
                                                                                }`}
                                                                            >
                                                                                {formatPlnAmount(
                                                                                    month.hostPayout,
                                                                                )}
                                                                            </td>
                                                                            <td
                                                                                className={`px-3 py-2 text-right font-medium ${
                                                                                    month.commission >=
                                                                                    0
                                                                                        ? "text-green-700"
                                                                                        : "text-red-700"
                                                                                }`}
                                                                            >
                                                                                {formatPlnAmount(
                                                                                    month.commission,
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                },
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-6 lg:grid-cols-2">
                                        <CommissionTable
                                            title="Dodatnie"
                                            entries={balanceQuery.data.positiveEntries}
                                            total={balanceQuery.data.positiveTotal}
                                            totalLabel="Suma dodatnich"
                                            emptyMessage="Brak dodatnich miesięcy."
                                            showMonthCount
                                        />
                                        <CommissionTable
                                            title="Ujemne"
                                            entries={balanceQuery.data.negativeEntries}
                                            total={balanceQuery.data.negativeTotal}
                                            totalLabel="Suma ujemnych"
                                            emptyMessage="Brak ujemnych miesięcy."
                                            showMonthCount
                                        />
                                    </div>

                                    <div className="rounded-lg border-2 border-gray-900 bg-gray-50 p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    Bilans całego okresu
                                                </h3>
                                                <p className="text-sm text-gray-600">
                                                    {balanceQuery.data.period.startLabel} —{" "}
                                                    {balanceQuery.data.period.endLabel}
                                                </p>
                                            </div>
                                            <div
                                                className={`text-2xl font-bold ${
                                                    balanceQuery.data.balance >= 0
                                                        ? "text-green-700"
                                                        : "text-red-700"
                                                }`}
                                            >
                                                {balanceQuery.data.balance >= 0 ? "+" : ""}
                                                {formatPlnAmount(balanceQuery.data.balance)}
                                            </div>
                                        </div>
                                    </div>

                                    {balanceQuery.data.fixedAdjustment && (
                                        <div className="rounded-lg border border-amber-300 bg-amber-50 p-6">
                                            <div className="flex flex-wrap items-start justify-between gap-4">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                        Korekta kwoty stałej
                                                    </h3>
                                                    <p className="mt-1 text-sm text-gray-600">
                                                        Na podstawie bilansu w okresie (
                                                        {balanceQuery.data.fixedAdjustment.monthCount}{" "}
                                                        {balanceQuery.data.fixedAdjustment.monthCount ===
                                                        1
                                                            ? "miesiąc"
                                                            : "miesięcy"}
                                                        ). Obniżka kwoty stałej o 1 PLN w każdym
                                                        miesiącu poprawia bilans ZW o 1 PLN × liczba
                                                        miesięcy.
                                                    </p>
                                                </div>
                                                <div className="text-right text-sm text-gray-700">
                                                    <div className="text-xs uppercase tracking-wide text-gray-500">
                                                        Obecna kwota stała
                                                    </div>
                                                    <div className="text-lg font-semibold">
                                                        {formatPlnAmount(
                                                            balanceQuery.data.fixedAdjustment
                                                                .currentFixedAmount,
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <label className="mt-4 inline-flex items-center gap-2 text-sm text-gray-700">
                                                <span>Cel zysku ZW / miesiąc:</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    step={50}
                                                    value={targetMonthlyProfit}
                                                    onChange={(event) =>
                                                        setTargetMonthlyProfit(
                                                            Number(event.target.value) || 0,
                                                        )
                                                    }
                                                    className="w-28 rounded-md border border-amber-400 bg-white px-2 py-1.5"
                                                />
                                                <span>PLN</span>
                                            </label>

                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                                <div className="rounded-md border border-amber-200 bg-white p-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        Wyjście na 0
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Obniżyć kwotę stałą o
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-amber-800">
                                                        {formatPlnAmount(
                                                            balanceQuery.data.fixedAdjustment
                                                                .reductionToBreakEven,
                                                        )}
                                                        <span className="text-sm font-normal text-gray-500">
                                                            {" "}
                                                            / miesiąc
                                                        </span>
                                                    </p>
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        Nowa kwota stała:{" "}
                                                        <span className="font-semibold">
                                                            {formatPlnAmount(
                                                                balanceQuery.data.fixedAdjustment
                                                                    .suggestedFixedToBreakEven,
                                                            )}
                                                        </span>
                                                    </p>
                                                    {balanceQuery.data.fixedAdjustment
                                                        .averageRentAndUtilities > 0 && (
                                                        <p className="mt-2 text-sm text-gray-600">
                                                            Netto właściciela po mediach:{" "}
                                                            <span className="font-semibold text-gray-900">
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .viabilityAtBreakEven
                                                                        .ownerNetAfterUtilities,
                                                                )}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                {" "}
                                                                (
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .suggestedFixedToBreakEven,
                                                                )}{" "}
                                                                −{" "}
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .averageRentAndUtilities,
                                                                )}
                                                                )
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>

                                                <div
                                                    className={`rounded-md border bg-white p-4 ${
                                                        balanceQuery.data.fixedAdjustment
                                                            .viabilityAtTarget
                                                            .belowOwnerNetThreshold
                                                            ? "border-red-400"
                                                            : "border-amber-200"
                                                    }`}
                                                >
                                                    <div className="text-sm font-medium text-gray-900">
                                                        Zysk co najmniej{" "}
                                                        {formatPlnAmount(
                                                            balanceQuery.data.fixedAdjustment
                                                                .targetMonthlyProfit,
                                                        )}{" "}
                                                        / miesiąc
                                                    </div>
                                                    <p className="mt-2 text-sm text-gray-600">
                                                        Obniżyć kwotę stałą o
                                                    </p>
                                                    <p className="mt-1 text-xl font-bold text-amber-800">
                                                        {formatPlnAmount(
                                                            balanceQuery.data.fixedAdjustment
                                                                .reductionToTarget,
                                                        )}
                                                        <span className="text-sm font-normal text-gray-500">
                                                            {" "}
                                                            / miesiąc
                                                        </span>
                                                    </p>
                                                    <p className="mt-2 text-sm text-gray-700">
                                                        Nowa kwota stała:{" "}
                                                        <span className="font-semibold">
                                                            {formatPlnAmount(
                                                                balanceQuery.data.fixedAdjustment
                                                                    .suggestedFixedToTarget,
                                                            )}
                                                        </span>
                                                    </p>
                                                    {balanceQuery.data.fixedAdjustment
                                                        .averageRentAndUtilities > 0 && (
                                                        <p className="mt-2 text-sm text-gray-600">
                                                            Netto właściciela po mediach:{" "}
                                                            <span
                                                                className={`font-semibold ${
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .viabilityAtTarget
                                                                        .belowOwnerNetThreshold
                                                                        ? "text-red-700"
                                                                        : "text-gray-900"
                                                                }`}
                                                            >
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .viabilityAtTarget
                                                                        .ownerNetAfterUtilities,
                                                                )}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                {" "}
                                                                (
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .suggestedFixedToTarget,
                                                                )}{" "}
                                                                −{" "}
                                                                {formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .averageRentAndUtilities,
                                                                )}
                                                                )
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {(balanceQuery.data.fixedAdjustment.viabilityAtTarget
                                                .belowOwnerNetThreshold ||
                                                balanceQuery.data.fixedAdjustment
                                                    .viabilityAtBreakEven
                                                    .belowOwnerNetThreshold) && (
                                                <div className="mt-4 rounded-md border-2 border-red-500 bg-red-50 p-4">
                                                    <p className="text-base font-bold uppercase tracking-wide text-red-800">
                                                        Ostrzeżenie: mieszkanie nie nadaje się na
                                                        kwotę stałą (krótkoterminowo)
                                                    </p>
                                                    <p className="mt-2 text-sm text-red-900">
                                                        {balanceQuery.data.fixedAdjustment
                                                            .viabilityAtTarget
                                                            .belowOwnerNetThreshold
                                                            ? balanceQuery.data.fixedAdjustment
                                                                  .viabilityAtTarget.warning
                                                            : balanceQuery.data.fixedAdjustment
                                                                  .viabilityAtBreakEven.warning}
                                                    </p>
                                                    <p className="mt-3 text-sm font-medium text-red-800">
                                                        Rekomendacja: wynajem długoterminowy zamiast
                                                        krótkoterminowego na kwocie stałej. Próg
                                                        opłacalności najmu krótkoterminowego (netto
                                                        właściciela):{" "}
                                                        {formatPlnAmount(
                                                            balanceQuery.data.fixedAdjustment
                                                                .ownerNetThreshold,
                                                        )}{" "}
                                                        / miesiąc.
                                                    </p>
                                                    <div className="mt-3 rounded-md border border-red-300 bg-white px-3 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                                                                Propozycja najmu długoterminowego
                                                            </p>
                                                            <span
                                                                className="inline-flex text-red-500"
                                                                title={`60% ustalonej kwoty stałej (${formatPlnAmount(
                                                                    balanceQuery.data
                                                                        .fixedAdjustment
                                                                        .currentFixedAmount,
                                                                )})`}
                                                            >
                                                                <InformationCircleIcon className="h-4 w-4" />
                                                            </span>
                                                        </div>
                                                        <p className="mt-1 text-xl font-bold text-red-900">
                                                            {formatPlnAmount(
                                                                balanceQuery.data.fixedAdjustment
                                                                    .suggestedLongTermRent,
                                                            )}
                                                            <span className="text-sm font-normal text-gray-600">
                                                                {" "}
                                                                / miesiąc
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
