"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  type ReportStatus,
  type PaymentType,
  type VATOption,
  type ReportItem,
  type Reservation,
} from "@prisma/client";
import { getVatAmount, getGrossAmount } from "@/lib/vat";
import {
  translateReportStatus,
  getReportStatusColor,
  translateReportItemType,
  getReportItemTypeColor,
} from "@/lib/status-translations";

type ReportItemWithReservation = ReportItem & {
  reservation?: Reservation | null;
};

type OwnerReport = {
  apartment: {
    id: number;
    name: string;
    address: string;
    paymentType: PaymentType;
    fixedPaymentAmount: number | null;
  };
  owner: {
    id: string;
    isActive: boolean;
    vatOption: VATOption;
  };
  items: ReportItemWithReservation[];
  rentAmount?: number;
  utilitiesAmount?: number;
  finalSettlementType?: string;
  month: number;
  year: number;
  status: ReportStatus;
  commissionNetBase: number;
  commissionVat: number;
  commissionGross: number;
  fixedNetBase?: number;
  fixedVat?: number;
  fixedGross?: number;
  fixedMinusUtilitiesNetBase?: number;
  fixedMinusUtilitiesVat?: number;
  fixedMinusUtilitiesGross?: number;
  netIncome?: number;
  adminCommissionAmount?: number;
  afterCommission?: number;
  afterRentAndUtilities?: number;
  commissionNetBaseAfterUtilities: number;
  commissionVatAfterUtilities: number;
  commissionGrossAfterUtilities: number;
  additionalDeductions?: {
    id: string;
    name: string;
    amount: number;
    vatOption: VATOption;
    order: number;
  }[];
  totalAdditionalDeductions?: number;
  finalOwnerPayout?: number;
  finalHostPayout?: number;
  finalIncomeTax?: number;
  taxBase?: number; // Podstawa opodatkowania
};

// Używamy nowych funkcji z lib/status-translations
const getStatusColor = getReportStatusColor;
const getStatusText = translateReportStatus;
const getItemTypeText = translateReportItemType;
const getItemTypeColor = getReportItemTypeColor;

function calculateNights(start: Date | string, end: Date | string) {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(
    1,
    Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)),
  );
}

const obfuscateGuest = (name: string | null | undefined): string => {
  if (!name) {
    return "-";
  }
  return name
    .split(" ")
    .filter((p) => p.length > 0)
    .map((p) => `${p.substring(0, 2)}...`)
    .join(" ");
};

function FinalBadge() {
  return (
    <span className="ml-2 inline-block rounded bg-green-200 px-2 py-0.5 align-middle text-xs font-semibold text-green-800">
      Wybrano jako ostateczne
    </span>
  );
}

export default function OwnerReportDetailsPage() {
  const router = useRouter();
  const params = useParams();
  let reportId = params?.reportId ?? "";
  if (Array.isArray(reportId)) reportId = reportId[0] ?? "";

  const {
    data: reportRaw,
    isLoading,
    error,
  } = api.monthlyReports.getOwnerReportById.useQuery({ reportId });

  const report = reportRaw as unknown as OwnerReport;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-brand-gold"></div>
      </div>
    );
  }
  if (error || !report?.owner) {
    let errorMessage = "Nie znaleziono raportu lub właściciela";
    if (error && typeof error === "object" && "message" in error) {
      const errorObj = error as { message?: string };
      errorMessage = errorObj.message ?? errorMessage;
    }
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">{errorMessage}</p>
          <button
            onClick={() => router.push("/apartamentsOwner/reports")}
            className="rounded-lg bg-brand-gold px-4 py-2 text-white hover:bg-yellow-500"
          >
            Powrót do raportów
          </button>
        </div>
      </div>
    );
  }

  // Wszystkie zmienne pomocnicze zależne od report.owner przeniesione tutaj
  const isVatExempt = report.owner.vatOption === "NO_VAT";

  // Sortowanie odliczeń po stronie klienta
  const sortedDeductions = report.additionalDeductions
    ? [...report.additionalDeductions].sort((a, b) => a.order - b.order)
    : [];

  // Podsumowania
  const revenueItems: ReportItemWithReservation[] = report.items.filter(
    (i: ReportItemWithReservation) => i.type === "REVENUE",
  );
  const expenseItems: ReportItemWithReservation[] = report.items.filter(
    (i: ReportItemWithReservation) =>
      ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(i.type),
  );
  const totalRevenue = revenueItems.reduce(
    (sum: number, i: ReportItemWithReservation) => sum + i.amount,
    0,
  );
  const totalExpenses = expenseItems.reduce(
    (sum: number, i: ReportItemWithReservation) => sum + i.amount,
    0,
  );
  const netIncome = totalRevenue - totalExpenses;

  // Rezerwacje/przychody
  const reservationItems: ReportItemWithReservation[] = revenueItems.filter(
    (i: ReportItemWithReservation) => i.reservation,
  );

  // Po pobraniu report (i po warunku ochronnym):
  const totalAdditionalDeductionsGross = (sortedDeductions ?? []).reduce(
    (sum, d) =>
      sum +
      (d.vatOption === "VAT_23"
        ? d.amount * 1.23
        : d.vatOption === "VAT_8"
          ? d.amount * 1.08
          : d.amount),
    0,
  );
  const totalAdditionalDeductionsNet = (sortedDeductions ?? []).reduce(
    (sum, d) => sum + d.amount,
    0,
  );

  const rentAndUtilities =
    (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
  const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
  const kwotaBazowaNetto =
    fixedBaseAmount - rentAndUtilities - totalAdditionalDeductionsGross;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Raport {String(Number(report.month)).padStart(2, "0")}/
                {report.year}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {report.apartment.name} - {report.apartment.address}
              </p>
              {/* Informacja o sposobie rozliczenia - placeholder bo nie ma danych */}
              <div className="mt-3 flex items-center space-x-4">
                <div className="inline-flex items-center rounded-md bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800">
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                  Raport właściciela
                </div>
                <div className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  Status: {getStatusText(report.status)}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/apartamentsOwner/reports")}
                  className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
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
                  Powrót do listy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Report Info - Karty podsumowań */}
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Przychody
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalRevenue.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-red-500 p-2">
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
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Wydatki
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {totalExpenses.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`rounded-lg p-2 ${netIncome >= 0 ? "bg-green-500" : "bg-red-500"}`}
                >
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Zysk netto
                  </dt>
                  <dd
                    className={`text-lg font-medium ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {netIncome.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(report.status)}`}
                >
                  {getStatusText(report.status)}
                </span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="truncate text-sm font-medium text-gray-500">
                    Status raportu
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {getStatusText(report.status)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Items (Reservations) */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 bg-green-50 px-6 py-4">
            <h3 className="text-lg font-medium text-green-900">
              Rezerwacje i Przychody ({reservationItems.length})
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {reservationItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Brak rezerwacji w tym okresie</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Gość
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Źródło
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data zameldowania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data wymeldowania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Noce
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kategoria
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reservationItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {obfuscateGuest(item.reservation?.guest)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.reservation?.source ? (
                            <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                              {item.reservation.source}
                            </span>
                          ) : (
                            <span className="text-gray-400">Nieznane</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.reservation
                            ? new Date(
                                item.reservation.start,
                              ).toLocaleDateString("pl-PL", { timeZone: "UTC" })
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.reservation
                            ? new Date(item.reservation.end).toLocaleDateString(
                                "pl-PL",
                                { timeZone: "UTC" },
                              )
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
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
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                          +{item.amount.toFixed(2)} {item.currency}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getItemTypeColor(
                              item.type,
                            )}`}
                          >
                            {item.category}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Expense Items */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 bg-green-50 px-6 py-4">
            <h3 className="text-lg font-medium text-green-900">
              Wydatki i Prowizje ({expenseItems.length})
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {expenseItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Brak dodatkowych pozycji</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kategoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Notatki
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {expenseItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {new Date(item.date).toLocaleDateString("pl-PL")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getItemTypeColor(
                              item.type,
                            )}`}
                          >
                            {getItemTypeText(item.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                          -{item.amount.toFixed(2)} {item.currency}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {item.notes ?? "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Additional Deductions Section - Read Only for Owner */}
        {sortedDeductions && sortedDeductions.length > 0 && (
          <div className="mb-8 overflow-hidden rounded-lg bg-purple-50 shadow">
            <div className="border-b border-purple-200 px-6 py-4">
              <h3 className="flex items-center text-lg font-medium text-purple-900">
                <svg
                  className="mr-2 h-5 w-5 text-purple-600"
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
                Dodatkowe Odliczenia
              </h3>
              <p className="mt-1 text-sm text-purple-700">
                Dodatkowe koszty odejmowane od ostatecznej wypłaty właściciela
              </p>
            </div>
            <div className="bg-white p-6">
              {/* Lista istniejących odliczeń - tylko do odczytu */}
              <div className="mb-6">
                <h4 className="text-md mb-3 font-medium text-gray-800">
                  Istniejące odliczenia:
                </h4>
                <div className="mb-3 space-y-2">
                  {sortedDeductions.map((deduction) => {
                    const vatAmount =
                      deduction.vatOption === "VAT_23"
                        ? deduction.amount * 0.23
                        : deduction.vatOption === "VAT_8"
                          ? deduction.amount * 0.08
                          : 0;
                    const grossAmount = deduction.amount + vatAmount;
                    const vatLabel =
                      deduction.vatOption === "VAT_23"
                        ? "23%"
                        : deduction.vatOption === "VAT_8"
                          ? "8%"
                          : "zwolniony";
                    return (
                      <div
                        key={deduction.id}
                        className="mb-2 rounded-md bg-purple-100 p-3"
                      >
                        <div className="mb-2 text-sm font-medium text-purple-900">
                          {deduction.name}
                        </div>
                        <div className="grid grid-cols-4 items-center gap-2 text-center text-sm">
                          <div>
                            <div className="font-semibold text-purple-700">
                              Kwota netto
                            </div>
                            <div className="font-medium text-purple-900">
                              -{deduction.amount.toFixed(2)} PLN
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-purple-700">
                              Stawka VAT
                            </div>
                            <div className="font-medium text-purple-900">
                              {vatLabel}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-purple-700">
                              Kwota VAT
                            </div>
                            <div className="font-medium text-purple-900">
                              {vatAmount === 0
                                ? "-"
                                : `-${vatAmount.toFixed(2)} PLN`}
                            </div>
                          </div>
                          <div>
                            <div className="font-semibold text-purple-700">
                              Kwota brutto
                            </div>
                            <div className="font-bold text-purple-900">
                              -{grossAmount.toFixed(2)} PLN
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Podsumowanie - identyczne jak w adminie */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-md bg-purple-100 p-3">
                  <p className="text-sm text-purple-700">
                    Suma odliczeń (netto):
                  </p>
                  <p className="text-lg font-bold text-purple-900">
                    -{totalAdditionalDeductionsNet.toFixed(2)} PLN
                  </p>
                </div>
                <div className="rounded-md bg-purple-100 p-3">
                  <p className="text-sm text-purple-700">
                    Suma odliczeń (brutto):
                  </p>
                  <p className="text-lg font-bold text-purple-900">
                    -{totalAdditionalDeductionsGross.toFixed(2)} PLN
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podsumowanie rozliczenia - sekcja na górze */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 bg-green-50 px-6 py-4">
            <h3 className="flex items-center text-lg font-medium text-green-900">
              <svg
                className="mr-2 h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 012-2v16a2 2 0 01-2 2z"
                />
              </svg>
              Rozliczenie Prowizji Złote Wynajmy
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Podstawowe informacje o zyskach i potrąceniach
            </p>
          </div>
          <div className="bg-white p-6">
            {/* Karta z zyskiem netto apartamentu */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-gray-800">
                Zysk netto apartamentu (przed wszystkimi potrąceniami)
              </h5>
              <p className="text-2xl font-bold text-gray-900">
                {netIncome.toFixed(2)} PLN
              </p>
            </div>

            {/* Karta z prowizją 25% dla administratora */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-blue-800">
                Prowizja 25% dla administratora
              </h5>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md bg-blue-100 p-3">
                  <p className="text-sm text-blue-700">Kwota prowizji:</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(netIncome * 0.25).toFixed(2)} PLN
                  </p>
                </div>
                <div className="rounded-md bg-blue-100 p-3">
                  <p className="text-sm text-blue-700">Pozostało:</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(netIncome * 0.75).toFixed(2)} PLN
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rozliczenie z Właścicielem - identyczny layout jak admin, bez inputów/radio/checkboxów */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 bg-green-50 px-6 py-4">
            <h3 className="flex items-center text-lg font-medium text-green-900">
              <svg
                className="mr-2 h-5 w-5 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 012-2v16a2 2 0 01-2 2z"
                />
              </svg>
              Rozliczenie z Właścicielem
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Ostateczna kalkulacja płatności dla właściciela
            </p>
          </div>
          <div className="bg-white p-6">
            <div className="space-y-6">
              <div className="rounded-lg bg-yellow-50 p-4">
                <h5 className="mb-2 text-lg font-medium text-yellow-800">
                  Czynsz i media za mieszkanie
                </h5>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-md bg-yellow-100 p-3">
                    <p className="text-sm text-yellow-700">Czynsz:</p>
                    <p className="text-lg font-bold text-yellow-900">
                      {report.rentAmount !== undefined
                        ? `-${report.rentAmount.toFixed(2)} PLN`
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-md bg-yellow-100 p-3">
                    <p className="text-sm text-yellow-700">Media:</p>
                    <p className="text-lg font-bold text-yellow-900">
                      {report.utilitiesAmount !== undefined
                        ? `-${report.utilitiesAmount.toFixed(2)} PLN`
                        : "-"}
                    </p>
                  </div>
                  <div className="rounded-md bg-yellow-100 p-3">
                    <p className="text-sm text-yellow-700">
                      Suma czynszu i mediów:
                    </p>
                    <p className="text-xl font-bold text-yellow-900">
                      {(
                        (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0)
                      ).toFixed(2)}{" "}
                      PLN
                    </p>
                  </div>
                </div>
              </div>
              {/* KWOTA STAŁA */}
              {report.finalSettlementType === "FIXED" &&
                report.fixedNetBase !== undefined && (
                  <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-4">
                    <div className="mb-2 flex items-center text-lg font-semibold text-green-800">
                      Rozliczenie właściciela: kwota stała
                      <FinalBadge />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">
                          Kwota bazowa{!isVatExempt && " (netto)"}:
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {fixedBaseAmount.toFixed(2)} PLN
                          <span className="block text-xs text-green-600">
                            (kwota stała bez odliczeń - media i czynsz są
                            obojętne dla tego typu rozliczenia)
                          </span>
                        </p>
                      </div>
                      {!isVatExempt && (
                        <div className="rounded-md bg-green-100 p-3">
                          <p className="text-sm text-green-700">VAT:</p>
                          <p className="text-lg font-bold text-green-900">
                            {getVatAmount(
                              fixedBaseAmount,
                              report.owner.vatOption,
                            ).toFixed(2)}{" "}
                            PLN
                          </p>
                        </div>
                      )}
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">DO WYPŁATY:</p>
                        <p className="text-2xl font-bold text-green-900">
                          {isVatExempt
                            ? `${fixedBaseAmount.toFixed(2)} PLN`
                            : `${getGrossAmount(fixedBaseAmount, report.owner.vatOption).toFixed(2)} PLN`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              {/* KWOTA STAŁA PO ODL. MEDIÓW */}
              {report.finalSettlementType === "FIXED_MINUS_UTILITIES" &&
                report.fixedMinusUtilitiesNetBase !== undefined && (
                  <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-4">
                    <div className="mb-2 flex items-center text-lg font-semibold text-green-800">
                      Rozliczenie właściciela: kwota stała po odliczeniu mediów
                      <FinalBadge />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">
                          Kwota bazowa{!isVatExempt && " (netto)"}:
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {kwotaBazowaNetto.toFixed(2)} PLN
                          <span className="block text-xs text-green-600">
                            (kwota stała: {fixedBaseAmount.toFixed(2)} PLN
                            {" - czynsz: "}
                            {(report.rentAmount ?? 0).toFixed(2)} PLN
                            {" - media: "}
                            {(report.utilitiesAmount ?? 0).toFixed(2)} PLN
                            {totalAdditionalDeductionsGross > 0 && (
                              <>
                                {" - dodatkowe odliczenia: "}
                                {totalAdditionalDeductionsGross.toFixed(2)} PLN
                                brutto
                              </>
                            )}
                            {" = "}
                            {kwotaBazowaNetto.toFixed(2)} PLN)
                          </span>
                        </p>
                      </div>
                      {!isVatExempt && (
                        <div className="rounded-md bg-green-100 p-3">
                          <p className="text-sm text-green-700">VAT:</p>
                          <p className="text-lg font-bold text-green-900">
                            {getVatAmount(
                              kwotaBazowaNetto,
                              report.owner.vatOption,
                            ).toFixed(2)}{" "}
                            PLN
                          </p>
                        </div>
                      )}
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">DO WYPŁATY:</p>
                        <p className="text-2xl font-bold text-green-900">
                          {isVatExempt
                            ? `${kwotaBazowaNetto.toFixed(2)} PLN`
                            : `${getGrossAmount(kwotaBazowaNetto, report.owner.vatOption).toFixed(2)} PLN`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              {/* PROWIZYJNE - zawsze widoczne */}
              <div className="flex flex-col gap-2 rounded-lg bg-blue-50 p-4">
                <div className="mb-2 flex items-center text-lg font-semibold text-blue-800">
                  Rozliczenie właściciela: prowizyjne
                  {report.finalSettlementType === "COMMISSION" ? (
                    <FinalBadge />
                  ) : (
                    <span className="ml-2 inline-block rounded bg-blue-200 px-2 py-0.5 align-middle text-xs font-semibold text-blue-800">
                      poglądowo
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                  <div className="rounded-md bg-blue-100 p-3">
                    <p className="text-sm text-blue-700">
                      Kwota po prowizji Złote Wynajmy
                      {!isVatExempt && " (netto)"}:
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {report.afterCommission !== undefined
                        ? report.afterCommission.toFixed(2)
                        : "-"}{" "}
                      PLN
                    </p>
                  </div>
                  <div className="rounded-md bg-blue-100 p-3">
                    <p className="text-sm text-blue-700">
                      Kwota bazowa{!isVatExempt && " (netto)"}:
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      {(report.afterRentAndUtilities !== undefined
                        ? report.afterRentAndUtilities -
                          totalAdditionalDeductionsGross
                        : 0
                      ).toFixed(2)}{" "}
                      PLN
                      <span className="block text-xs text-blue-600">
                        (po odliczeniu czynszu:{" "}
                        {(report.rentAmount ?? 0).toFixed(2)} PLN + mediów:{" "}
                        {(report.utilitiesAmount ?? 0).toFixed(2)} PLN +
                        dodatkowych odliczeń:{" "}
                        {totalAdditionalDeductionsGross.toFixed(2)} PLN brutto ={" "}
                        {(
                          (report.rentAmount ?? 0) +
                          (report.utilitiesAmount ?? 0) +
                          totalAdditionalDeductionsGross
                        ).toFixed(2)}{" "}
                        PLN)
                      </span>
                    </p>
                  </div>
                  {!isVatExempt && (
                    <div className="rounded-md bg-blue-100 p-3">
                      <p className="text-sm text-blue-700">VAT:</p>
                      <p className="text-lg font-bold text-blue-900">
                        {getVatAmount(
                          report.afterRentAndUtilities !== undefined
                            ? report.afterRentAndUtilities -
                                totalAdditionalDeductionsGross
                            : 0,
                          report.owner.vatOption,
                        ).toFixed(2)}{" "}
                        PLN
                      </p>
                    </div>
                  )}
                  <div className="rounded-md bg-blue-100 p-3">
                    <p className="text-sm text-blue-700">DO WYPŁATY:</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {isVatExempt
                        ? (report.afterRentAndUtilities !== undefined
                            ? (
                                report.afterRentAndUtilities -
                                totalAdditionalDeductionsGross
                              ).toFixed(2)
                            : "0.00") + " PLN"
                        : getGrossAmount(
                            report.afterRentAndUtilities !== undefined
                              ? report.afterRentAndUtilities -
                                  totalAdditionalDeductionsGross
                              : 0,
                            report.owner.vatOption,
                          ).toFixed(2) + " PLN"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sekcja rozliczenia */}
              <div className="mt-8 space-y-6"></div>

              {/* Nowe pola na końcu raportu */}
              <div className="mt-8 space-y-4">
                <div className="mt-8">
                  <h4 className="mb-4 text-xl font-semibold text-gray-800">
                    Podsumowanie
                  </h4>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div
                      className={`rounded-md p-4 ${
                        report.finalSettlementType === "COMMISSION"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          report.finalSettlementType === "COMMISSION"
                            ? "text-blue-700"
                            : "text-green-700"
                        }`}
                      >
                        Podstawa opodatkowania kwota bazowa{" "}
                        {report.owner.vatOption === "NO_VAT"
                          ? "(brutto)"
                          : "(netto)"}
                        :
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          report.finalSettlementType === "COMMISSION"
                            ? "text-blue-900"
                            : "text-green-900"
                        }`}
                      >
                        {report.taxBase?.toFixed(2) ?? "0.00"} PLN
                      </p>
                    </div>
                    <div
                      className={`rounded-md p-4 ${
                        report.finalSettlementType === "COMMISSION"
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          report.finalSettlementType === "COMMISSION"
                            ? "text-blue-700"
                            : "text-green-700"
                        }`}
                      >
                        Ostateczna wypłata Właściciela:
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          report.finalSettlementType === "COMMISSION"
                            ? "text-blue-900"
                            : "text-green-900"
                        }`}
                      >
                        {report.finalOwnerPayout
                          ? `${report.finalOwnerPayout.toFixed(2)} PLN`
                          : "0.00 PLN"}
                      </p>
                    </div>
                    <div className="rounded-md bg-purple-100 p-4">
                      <p className="text-sm text-purple-700">
                        Ostateczna prowizja Złote Wynajmy:
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {report.finalHostPayout
                          ? `${report.finalHostPayout.toFixed(2)} PLN`
                          : "0.00 PLN"}
                      </p>
                      <p className="mt-1 text-xs text-purple-600">
                        {report.finalSettlementType === "COMMISSION"
                          ? "Rozliczenie prowizyjne"
                          : report.finalSettlementType === "FIXED"
                            ? "Rozliczenie kwota stała"
                            : report.finalSettlementType ===
                                "FIXED_MINUS_UTILITIES"
                              ? "Rozliczenie kwota stała po odliczeniu mediów"
                              : "Typ rozliczenia nie określony"}
                      </p>
                      {report.finalSettlementType === "FIXED" &&
                        report.adminCommissionAmount &&
                        report.afterCommission && (
                          <p className="mt-1 text-xs text-purple-500">
                            Różnica:{" "}
                            {(
                              (report.finalHostPayout ?? 0) -
                              netIncome * 0.25
                            ).toFixed(2)}{" "}
                            PLN (rzeczywista prowizja{" "}
                            {(report.finalHostPayout ?? 0).toFixed(2)} PLN -
                            standardowa prowizja {(netIncome * 0.25).toFixed(2)}{" "}
                            PLN)
                          </p>
                        )}
                      {report.finalSettlementType === "FIXED_MINUS_UTILITIES" &&
                        report.adminCommissionAmount &&
                        report.afterRentAndUtilities && (
                          <p className="mt-1 text-xs text-purple-500">
                            Różnica:{" "}
                            {(
                              (report.finalHostPayout ?? 0) -
                              netIncome * 0.25
                            ).toFixed(2)}{" "}
                            PLN (rzeczywista prowizja{" "}
                            {(report.finalHostPayout ?? 0).toFixed(2)} PLN -
                            standardowa prowizja {(netIncome * 0.25).toFixed(2)}{" "}
                            PLN)
                          </p>
                        )}
                    </div>
                    <div className="rounded-md bg-yellow-100 p-4">
                      <p className="text-sm text-yellow-700">
                        Zryczałtowany podatek dochodowy 8.5% od wypłaty
                        właściciela:
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {(
                          report as OwnerReport & { finalIncomeTax?: number }
                        ).finalIncomeTax?.toFixed(2) ?? "0.00"}{" "}
                        PLN
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
