"use client";

import React, { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { formatPlnAmount } from "@/lib/company-statistics";

const DEFAULT_TARGET_PROFIT = 550;

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
}: {
    title: string;
    entries: Array<{ label: string; commission: number }>;
    total?: number;
    totalLabel?: string;
    emptyMessage?: string;
    showMonthCount?: boolean;
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
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Prowizja Złote Wynajmy
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {entries.map((entry) => (
                                <tr key={entry.label}>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {entry.label}
                                    </td>
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
                                    <td className="px-4 py-3 text-sm text-gray-900">
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

export default function CompanyStatisticsPage() {
    const currentYear = new Date().getFullYear();
    const yearOptions = useMemo(() => buildYearOptions(), []);

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
            enabled: selectedApartmentId !== null,
        },
    );

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
                    Bilans dochodu i strat na podstawie prowizji Złote Wynajmy z
                    podsumowania raportów miesięcznych.
                </p>
            </div>

            <div className="grid items-stretch gap-6 lg:grid-cols-[320px_1fr]">
                <div className="flex h-full min-h-0 flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Apartamenty
                    </h2>
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Szukaj apartamentu..."
                        className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />

                    <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
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
                </div>

                <div className="space-y-6">
                    {!selectedApartmentId && (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
                            <p className="text-gray-600">
                                Wybierz apartament z listy, aby zobaczyć bilans prowizji.
                            </p>
                        </div>
                    )}

                    {selectedApartmentId && (
                        <>
                            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-semibold text-gray-900">
                                            {selectedApartment?.name}
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
                                        <span className="mb-1 block text-gray-600">
                                            Od — rok
                                        </span>
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
                                        <span className="mb-1 block text-gray-600">
                                            Do — rok
                                        </span>
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
                                    <CommissionTable
                                        title="Miesięczna prowizja"
                                        entries={balanceQuery.data.monthlyEntries}
                                        emptyMessage="Brak raportów w wybranym okresie."
                                    />

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
                                                </div>

                                                <div className="rounded-md border border-amber-200 bg-white p-4">
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
                                                </div>
                                            </div>
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
