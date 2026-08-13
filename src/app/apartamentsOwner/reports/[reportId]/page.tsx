"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/trpc/react";
import {
  ReportStatus,
  TerminationCostSide,
  TerminationOwnerPaymentKind,
  type PaymentType,
  type VATOption,
  type ReportItem,
  type Reservation,
} from "@prisma/client";
import { getVatAmount, getGrossAmount } from "@/lib/vat";
import { daysInCalendarMonth, getFixedPayoutProrateFactor } from "@/lib/report-fixed-prorate";
import { getCommissionPayoutNet } from "@/lib/commission-settlement";
import {
  translateReportStatus,
  getReportStatusColor,
  translateReportItemType,
  getReportItemTypeColor,
} from "@/lib/status-translations";
import {
  summarizeTerminationCosts,
  terminationOwnerPaymentKindLabel,
  terminationOwnerPaymentKindTaxNote,
} from "@/lib/report-termination-costs";
import {
  hasAnyAgreementTerminationNoticeData,
  terminationNoticePartyLabel,
} from "@/lib/agreement-termination-notice";

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
  terminationCosts?: {
    id: string;
    side: TerminationCostSide;
    label: string;
    amount: number;
    countsTowardOwnerTaxBase: boolean;
    ownerPaymentKind: TerminationOwnerPaymentKind | null;
    order: number;
  }[];
  finalOwnerPayout?: number;
  finalHostPayout?: number;
  finalIncomeTax?: number;
  taxBase?: number; // Podstawa opodatkowania
  fixedPayoutProrateEnabled?: boolean | null;
  fixedPayoutActiveDays?: number | null;
  agreementTerminationNoticeDate?: Date | string | null;
  agreementTerminationNoticeParty?: TerminationCostSide | null;
  agreementTerminationNoticeDocumentUrl?: string | null;
  agreementTerminationNoticeDeliveryNote?: string | null;
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

  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("ownerSessionToken");
    const email = localStorage.getItem("ownerEmail");
    if (!token || !email) {
      router.push("/apartamentsOwner/login");
      return;
    }
    setOwnerEmail(email);
  }, [router]);

  const reportQuery = api.monthlyReports.getOwnerReportById.useQuery(
    { reportId, ownerEmail: ownerEmail ?? "" },
    { enabled: Boolean(reportId && ownerEmail) },
  );
  const reportRaw: unknown = reportQuery.data;
  const isLoading: boolean =
    !ownerEmail || reportQuery.isLoading || reportQuery.isFetching;
  const error = reportQuery.error;

  const report = reportRaw as OwnerReport & {
    customSummaryEnabled?: boolean;
    customSummaryNote?: string | null;
    customTaxBase?: number | null;
    customOwnerPayout?: number | null;
    customHostPayout?: number | null;
    customIncomeTax?: number | null;
  };
  const isOwnApartment = report?.apartment?.paymentType === "OWN_APARTMENT";
  /** Kolory „prowizyjne” w podsumowaniu tylko gdy to nie apartament własny */
  const useCommissionSummaryStyle =
    (report?.finalSettlementType === "COMMISSION" ||
      report?.finalSettlementType === "COMMISSION_MINUS_UTILITIES") &&
    !isOwnApartment;

  if (!ownerEmail) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-brand-gold"></div>
      </div>
    );
  }

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
  const localTotalRevenue =
    totalRevenue +
    Number(
      (report as unknown as { parkingRentalIncome?: number })
        ?.parkingRentalIncome ?? 0,
    );
  const totalExpenses = expenseItems.reduce(
    (sum: number, i: ReportItemWithReservation) => sum + i.amount,
    0,
  );

  // Parking values (read-only for owner). Prefer explicit profit when present; otherwise compute.
  const parkingAdminRent = Number(
    (report as unknown as { parkingAdminRent?: number | null })
      ?.parkingAdminRent ?? 0,
  );
  const parkingRentalIncome = Number(
    (report as unknown as { parkingRentalIncome?: number | null })
      ?.parkingRentalIncome ?? 0,
  );
  const parkingProfit =
    (report as unknown as { parkingProfit?: number | null })?.parkingProfit !=
    null
      ? Number(
          (report as unknown as { parkingProfit?: number | null })
            .parkingProfit ?? 0,
        )
      : Math.max(0, parkingRentalIncome - parkingAdminRent);

  const netIncome = totalRevenue - totalExpenses + parkingProfit;

  // Ręczne przychody (np. faktury przychodowe) – bez rezerwacji
  const manualRevenueItems: ReportItemWithReservation[] = revenueItems.filter(
    (i) => !i.reservation,
  );
  // Rezerwacje/przychody (tylko skutecznie zrealizowane)
  const reservationItems: ReportItemWithReservation[] = revenueItems.filter(
    (i: ReportItemWithReservation) => {
      const r = i.reservation;
      if (!r) return false;
      const guests = (r.adults ?? 0) + (r.children ?? 0);
      const unknownGuests = r.adults == null && r.children == null;
      return (
        r.status !== "Anulowana" &&
        r.status !== "Odrzucona przez obsługę" &&
        (guests > 0 || unknownGuests)
      );
    },
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
  const dimDaysReport = daysInCalendarMonth(report.year, report.month);
  const fixedProrateFactor = getFixedPayoutProrateFactor(
    report.year,
    report.month,
    report.fixedPayoutProrateEnabled,
    report.fixedPayoutActiveDays,
  );
  const scaledContractFixed = fixedBaseAmount * fixedProrateFactor;
  const kwotaBazowaNetto =
    scaledContractFixed - rentAndUtilities - totalAdditionalDeductionsGross;

  // Wartości wyświetlane w podsumowaniu – respektują niestandardowe wartości
  const summaryTaxBase: number =
    report.customSummaryEnabled && report.customTaxBase != null
      ? Number(report.customTaxBase)
      : (report.taxBase ?? 0);
  const summaryOwnerPayout: number =
    report.customSummaryEnabled && report.customOwnerPayout != null
      ? Number(report.customOwnerPayout)
      : (report.finalOwnerPayout ?? 0);
  const summaryHostPayout: number =
    report.customSummaryEnabled && report.customHostPayout != null
      ? Number(report.customHostPayout)
      : (report.finalHostPayout ?? 0);
  const summaryIncomeTax: number =
    report.customSummaryEnabled && report.customIncomeTax != null
      ? Number(report.customIncomeTax)
      : ((report as OwnerReport & { finalIncomeTax?: number }).finalIncomeTax ??
        0);

  const terminationCosts = report.terminationCosts ?? [];
  const ownerSeesTerminationCosts =
    (report.status === ReportStatus.AGREEMENT_TERMINATION ||
      report.status === ReportStatus.SENT) &&
    terminationCosts.length > 0;
  const terminationSummary = ownerSeesTerminationCosts
    ? summarizeTerminationCosts(terminationCosts)
    : null;
  const ownerPayoutBeforeTerminationAdjust =
    terminationSummary != null
      ? summaryOwnerPayout - terminationSummary.payoutAdj
      : null;

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
                {report.apartment.name}
                {(() => {
                  const roomsCount =
                    (report as unknown as {
                      apartment?: { _count?: { rooms?: number } };
                    })?.apartment?._count?.rooms ?? 0;
                  const roomCode =
                    (report as unknown as { room?: { code?: string } })?.room
                      ?.code ?? undefined;
                  return roomsCount > 1 && roomCode ? (
                    <>
                      {" "}
                      • Pokój {roomCode}
                    </>
                  ) : null;
                })()}
                {" - "}
                {report.apartment.address}
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
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getStatusColor(
                    report.status,
                  )}`}
                >
                  {getStatusText(report.status)}
                </span>
              </div>
              {report.status === ReportStatus.AGREEMENT_TERMINATION && (
                <p className="mt-3 max-w-3xl rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Ten miesiąc został oznaczony jako <strong>rozwiązanie umowy</strong> — raport
                  wskazuje termin zakończenia współpracy przy tym obiekcie.
                </p>
              )}
              {(report.status === ReportStatus.AGREEMENT_TERMINATION ||
                report.status === ReportStatus.SENT ||
                report.status === ReportStatus.AGREEMENT_SETTLED) &&
                (hasAnyAgreementTerminationNoticeData(report) ||
                  report.status === ReportStatus.AGREEMENT_TERMINATION) && (
                  <div className="mt-3 max-w-3xl rounded-md border border-amber-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm">
                    <h2 className="text-sm font-semibold text-amber-950">
                      Wypowiedzenie umowy — informacje
                    </h2>
                    <dl className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-gray-500">Data wypowiedzenia</dt>
                        <dd className="font-medium">
                          {report.agreementTerminationNoticeDate
                            ? new Date(
                                report.agreementTerminationNoticeDate as string,
                              ).toLocaleDateString("pl-PL", { timeZone: "UTC" })
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">
                          Wypowiedzenie złożone przez
                        </dt>
                        <dd className="font-medium">
                          {report.agreementTerminationNoticeParty
                            ? terminationNoticePartyLabel(
                                report.agreementTerminationNoticeParty,
                              )
                            : "—"}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500">Załącznik</dt>
                        <dd>
                          {report.agreementTerminationNoticeDocumentUrl ? (
                            <a
                              href={report.agreementTerminationNoticeDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-indigo-600 hover:underline"
                            >
                              Otwórz dokument wypowiedzenia
                            </a>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-xs text-gray-500">
                          Sposób doręczenia wypowiedzenia
                        </dt>
                        <dd className="whitespace-pre-wrap font-medium text-gray-900">
                          {report.agreementTerminationNoticeDeliveryNote != null &&
                          report.agreementTerminationNoticeDeliveryNote.trim() !== ""
                            ? report.agreementTerminationNoticeDeliveryNote.trim()
                            : "—"}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}
              {report.status === ReportStatus.AGREEMENT_SETTLED && (
                <p className="mt-3 max-w-3xl rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                  <strong>Umowa zamknięta</strong> — należności z tego okresu uznaje się za
                  rozliczone.
                </p>
              )}
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

        {ownerSeesTerminationCosts && (
          <div className="mb-6 overflow-hidden rounded-lg border border-amber-200 bg-amber-50/40 shadow">
            <div className="border-b border-amber-200 bg-amber-100/80 px-6 py-3">
              <h2 className="text-base font-semibold text-amber-950">
                Dodatkowe rozliczenie przy rozwiązaniu umowy
              </h2>
              <p className="mt-1 text-xs text-amber-900">
                W obu kolumnach każda kwota ma oznaczenie <strong>zwrot</strong> lub{" "}
                <strong>przychód</strong> na rzecz Złote Wynajmy oraz informację o wpływie na
                podstawę opodatkowania. Kwoty w każdej kolumnie są wypisane jedna pod drugą. Suma
                korekt jest uwzględniona w podsumowaniu rozliczenia.
              </p>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2">
              <div className="rounded-md border border-emerald-200 bg-white p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-emerald-800">
                  Koszty po stronie Złote Wynajmy
                </p>
                <p className="mb-2 text-xs text-emerald-900">
                  Zwrot lub przychód na rzecz ZW — tak samo oznaczone jak w panelu administratora.
                </p>
                <ul className="space-y-3 text-sm text-gray-900">
                  {terminationCosts
                    .filter((c) => c.side === TerminationCostSide.HOST_COMPANY)
                    .map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-1 rounded border border-emerald-100 bg-emerald-50/50 p-2"
                      >
                        <span className="font-medium">{c.label}</span>
                        <span className="text-base font-semibold text-emerald-900">
                          +{Number(c.amount).toFixed(2)} PLN
                        </span>
                        <span className="inline-flex w-fit rounded-full bg-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-900">
                          {terminationOwnerPaymentKindLabel(
                            c.ownerPaymentKind ?? TerminationOwnerPaymentKind.REVENUE,
                          )}
                        </span>
                        <p className="text-xs text-gray-600">
                          {terminationOwnerPaymentKindTaxNote(
                            c.ownerPaymentKind ?? TerminationOwnerPaymentKind.REVENUE,
                          )}
                        </p>
                        <span className="text-xs text-gray-600">
                          W podstawie opodatkowania:{" "}
                          {c.countsTowardOwnerTaxBase ? "tak" : "nie"}
                        </span>
                      </li>
                    ))}
                  {terminationCosts.filter(
                    (c) => c.side === TerminationCostSide.HOST_COMPANY,
                  ).length === 0 && (
                    <li className="text-xs text-gray-500">Brak pozycji</li>
                  )}
                </ul>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3">
                <p className="mb-1 text-xs font-semibold uppercase text-slate-800">
                  Należności na rzecz Złote Wynajmy
                </p>
                <p className="mb-2 text-xs text-slate-600">
                  Kwoty, które właściciel uznaje / reguluje na rzecz ZW — oznaczenie zwrot / przychód
                  ułatwia rozróżnienie przy podatku 8,5%.
                </p>
                <ul className="space-y-3 text-sm text-gray-900">
                  {terminationCosts
                    .filter((c) => c.side === TerminationCostSide.OWNER_SIDE)
                    .map((c) => (
                      <li
                        key={c.id}
                        className="flex flex-col gap-1 rounded border border-slate-100 bg-slate-50 p-2"
                      >
                        <span className="font-medium">{c.label}</span>
                        <span className="text-base font-semibold text-slate-900">
                          −{Number(c.amount).toFixed(2)} PLN
                        </span>
                        <span className="inline-flex w-fit rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-800">
                          {terminationOwnerPaymentKindLabel(
                            c.ownerPaymentKind ?? TerminationOwnerPaymentKind.REVENUE,
                          )}
                        </span>
                        <p className="text-xs text-gray-600">
                          {terminationOwnerPaymentKindTaxNote(
                            c.ownerPaymentKind ?? TerminationOwnerPaymentKind.REVENUE,
                          )}
                        </p>
                        <span className="text-xs text-gray-600">
                          W podstawie opodatkowania:{" "}
                          {c.countsTowardOwnerTaxBase ? "tak" : "nie"}
                        </span>
                      </li>
                    ))}
                  {terminationCosts.filter(
                    (c) => c.side === TerminationCostSide.OWNER_SIDE,
                  ).length === 0 && (
                    <li className="text-xs text-gray-500">Brak pozycji</li>
                  )}
                </ul>
              </div>
            </div>
            {ownerPayoutBeforeTerminationAdjust != null && (
              <div className="border-t border-amber-200 px-4 pb-4 pt-2 text-sm text-gray-800">
                <p>
                  <span className="text-gray-600">Kwota z raportu (przed korektami):</span>{" "}
                  <span className="font-semibold">
                    {ownerPayoutBeforeTerminationAdjust.toFixed(2)} PLN
                  </span>
                </p>
                <p className="mt-1">
                  <span className="text-gray-600">Ostateczna wypłata (z korektami):</span>{" "}
                  <span className="font-semibold">
                    {summaryOwnerPayout.toFixed(2)} PLN
                  </span>
                </p>
                <p className="mt-1">
                  <span className="text-gray-600">Podstawa opodatkowania (8,5%):</span>{" "}
                  <span className="font-semibold">
                    {summaryTaxBase.toFixed(2)} PLN
                  </span>
                  {terminationSummary &&
                    Math.abs(summaryTaxBase - summaryOwnerPayout) > 0.009 && (
                      <span className="ml-1 text-xs text-gray-600">
                        (różni się od wypłaty — część pozycji nie wchodzi w podatek)
                      </span>
                    )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Report Info - Karty podsumowań */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
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
                    {localTotalRevenue.toFixed(2)} PLN
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
              {report.customSummaryEnabled && (
                <span className="ml-2 inline-block rounded bg-blue-200 px-2 py-0.5 align-middle text-xs font-semibold text-blue-800">
                  poglądowo
                </span>
              )}
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {reservationItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="whitespace-normal break-words px-6 py-4 text-sm text-gray-900">
                          {obfuscateGuest(item.reservation?.guest)}
                        </td>
                        <td className="whitespace-normal break-words px-6 py-4 text-sm text-gray-900">
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
                              ).toLocaleDateString("pl-PL", {
                                timeZone: "UTC",
                              })
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.reservation
                            ? new Date(item.reservation.end).toLocaleDateString(
                                "pl-PL",
                                {
                                  timeZone: "UTC",
                                },
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Parking - sekcja informacyjna dla właściciela (zawsze widoczna) */}
      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
        <div className="border-b border-yellow-200 bg-yellow-50 px-6 py-4">
          <h3 className="text-lg font-medium text-yellow-800">Parking</h3>
          <p className="mt-1 text-sm text-yellow-700">
            Informacje o wynajętym miejscu parkingowym
          </p>
        </div>
        <div className="bg-white p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md bg-yellow-100 p-3">
              <p className="text-sm text-yellow-700">Czynsz (parking):</p>
              <p className="text-lg font-bold text-yellow-900">
                {parkingAdminRent > 0 ? `-${parkingAdminRent.toFixed(2)} PLN` : "-"}
              </p>
            </div>
            <div className="rounded-md bg-yellow-100 p-3">
              <p className="text-sm text-yellow-700">Przychód (parking):</p>
              <p className="text-lg font-bold text-yellow-900">
                {parkingRentalIncome > 0 ? `+${parkingRentalIncome.toFixed(2)} PLN` : "-"}
              </p>
            </div>
            <div className="rounded-md bg-yellow-100 p-3">
              <p className="text-sm text-yellow-700">Zysk (parking):</p>
              <p className="text-lg font-bold text-yellow-900">
                {parkingProfit.toFixed(2)} PLN
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Manual Revenue (e.g., income invoices) */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 bg-green-50 px-6 py-4">
            <h3 className="text-lg font-medium text-green-900">
              Dodatkowe przychody (faktury) ({manualRevenueItems.length})
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Te pozycje dodane zostały przez administratora i są widoczne tylko
              do odczytu.
            </p>
          </div>
          <div className="border-t border-gray-200">
            {manualRevenueItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Brak dodatkowych przychodów</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Opis
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota (PLN)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {manualRevenueItems.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {item.description ?? "Faktura przychodowa"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                          {Number(item.amount).toFixed(2)}
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
              {report.customSummaryEnabled && (
                <span className="ml-2 inline-block rounded bg-blue-200 px-2 py-0.5 align-middle text-xs font-semibold text-blue-800">
                  poglądowo
                </span>
              )}
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
                        <td className="whitespace-normal break-words px-6 py-4 text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                          -{item.amount.toFixed(2)} {item.currency}
                        </td>
                        <td className="whitespace-normal break-words px-6 py-4 text-sm text-gray-500">
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

        {/* Additional Deductions Section - Read Only for Owner (always visible; marked poglądowo if custom) */}
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
                Dodatkowe Odliczenia (inwestycje)
              </h3>
              {report.customSummaryEnabled && (
                <span className="ml-2 inline-block rounded bg-blue-200 px-2 py-0.5 align-middle text-xs font-semibold text-blue-800">
                  poglądowo
                </span>
              )}
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
                        <div className="grid grid-cols-2 items-center gap-2 text-center text-sm sm:grid-cols-4">
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

        {/* Podsumowanie rozliczenia - sekcja na górze (hidden when custom summary enabled) */}
        {!report.customSummaryEnabled && (
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
                {isOwnApartment
                  ? "Przychody i zysk apartamentu"
                  : "Rozliczenie Prowizji Złote Wynajmy"}
              </h3>
              <p className="mt-1 text-sm text-green-700">
                {isOwnApartment
                  ? "Zysk netto przed odliczeniami — w apartamencie własnym trafia w całości do rozliczenia z właścicielem (bez prowizji zarządcy)."
                  : "Podstawowe informacje o zyskach i potrąceniach"}
              </p>
            </div>
            <div className="bg-white p-6">
              {!report.customSummaryEnabled && (
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                  <h5 className="mb-2 text-lg font-medium text-gray-800">
                    Zysk netto apartamentu (przed wszystkimi potrąceniami)
                  </h5>
                  <p className="text-2xl font-bold text-gray-900">
                    {netIncome.toFixed(2)} PLN
                  </p>
                </div>
              )}

              {/* Karta z prowizją administratora pomijana dla apartamentów własnych */}
              {!report.customSummaryEnabled && !isOwnApartment && (
                <div className="mb-6 rounded-lg bg-blue-50 p-4">
                  <h5 className="mb-2 text-lg font-medium text-blue-800">
                    {(() => {
                      const net = Number(report?.netIncome ?? 0);
                      let commission = 0;
                      let remaining = 0;

                      if (
                        report?.finalSettlementType === "FIXED" ||
                        report?.finalSettlementType === "FIXED_MINUS_UTILITIES"
                      ) {
                        const fixedAmount = Number(
                          report?.apartment?.fixedPaymentAmount ?? 0,
                        );
                        commission = net - fixedAmount; // może być ujemna – dopłata admina

                        const deductions = report?.additionalDeductions ?? [];
                        const totalDeductionsGross = deductions.reduce(
                          (
                            sum: number,
                            d: { amount: number; vatOption: string },
                          ) =>
                            sum +
                            (d.vatOption === "VAT_8" || d.vatOption === "VAT_23"
                              ? getGrossAmount(d.amount, d.vatOption)
                              : d.amount),
                          0,
                        );
                        const adminTopUp = Math.max(fixedAmount - net, 0);
                        remaining = net + adminTopUp - totalDeductionsGross;
                      } else if (
                        report?.finalSettlementType ===
                        "COMMISSION_MINUS_UTILITIES"
                      ) {
                        const rentAndUtilities =
                          (report?.rentAmount ?? 0) +
                          (report?.utilitiesAmount ?? 0);
                        const base = net - rentAndUtilities;
                        commission = base * 0.25;
                        remaining = base * 0.75;
                      } else {
                        commission = net * 0.25;
                        remaining = net * 0.75;
                      }

                      const percent =
                        net > 0
                          ? (commission / (commission + remaining)) * 100
                          : 0;
                      return `Prowizja ${percent.toFixed(2)}% dla administratora`;
                    })()}
                  </h5>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-md bg-blue-100 p-3">
                      <p className="text-sm text-blue-700">Kwota prowizji:</p>
                      <div className="text-xl font-bold text-blue-900">
                        {(() => {
                          if (
                            report?.finalSettlementType === "FIXED" ||
                            report?.finalSettlementType ===
                              "FIXED_MINUS_UTILITIES"
                          ) {
                            const net = Number(report?.netIncome ?? 0);
                            const fixedAmount = Number(
                              report?.apartment?.fixedPaymentAmount ?? 0,
                            );
                            const realCommission = net - fixedAmount;
                            return (
                              <>
                                <span
                                  className={
                                    realCommission < 0 ? "text-red-600" : ""
                                  }
                                >
                                  {realCommission.toFixed(2)} PLN
                                </span>
                                {realCommission < 0 && (
                                  <div className="mt-2 rounded-md bg-red-100 p-2">
                                    <p className="text-xs font-medium text-red-700">
                                      Zarządca dopłaca różnicę:{" "}
                                      {Math.abs(realCommission).toFixed(2)} PLN
                                    </p>
                                  </div>
                                )}
                              </>
                            );
                          }
                          if (
                            report?.finalSettlementType ===
                            "COMMISSION_MINUS_UTILITIES"
                          ) {
                            const base =
                              (report?.netIncome ?? 0) -
                              (report?.rentAmount ?? 0) -
                              (report?.utilitiesAmount ?? 0);
                            return `${(base * 0.25).toFixed(2)} PLN`;
                          }
                          return `${((report?.netIncome ?? 0) * 0.25).toFixed(2)} PLN`;
                        })()}
                      </div>
                    </div>
                    <div className="rounded-md bg-blue-100 p-3">
                      <p className="text-sm text-blue-700">Pozostało:</p>
                      <div className="text-xl font-bold text-blue-900">
                        {(() => {
                          if (
                            report?.finalSettlementType === "FIXED" ||
                            report?.finalSettlementType ===
                              "FIXED_MINUS_UTILITIES"
                          ) {
                            const net = Number(report?.netIncome ?? 0);
                            const fixedAmount = Number(
                              report?.apartment?.fixedPaymentAmount ?? 0,
                            );
                            const deductions =
                              report?.additionalDeductions ?? [];
                            const totalDeductionsGross = deductions.reduce(
                              (
                                sum: number,
                                d: { amount: number; vatOption: string },
                              ) =>
                                sum +
                                (d.vatOption === "VAT_8" ||
                                d.vatOption === "VAT_23"
                                  ? getGrossAmount(d.amount, d.vatOption)
                                  : d.amount),
                              0,
                            );
                            const adminTopUp = Math.max(fixedAmount - net, 0);
                            const remaining =
                              net + adminTopUp - totalDeductionsGross;
                            return `${remaining.toFixed(2)} PLN`;
                          }
                          if (
                            report?.finalSettlementType ===
                            "COMMISSION_MINUS_UTILITIES"
                          ) {
                            const base =
                              (report?.netIncome ?? 0) -
                              (report?.rentAmount ?? 0) -
                              (report?.utilitiesAmount ?? 0);
                            return `${(base * 0.75).toFixed(2)} PLN`;
                          }
                          return `${((report?.netIncome ?? 0) * 0.75).toFixed(2)} PLN`;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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
              {isOwnApartment
                ? "Podsumowanie rozliczenia"
                : "Rozliczenie z Właścicielem"}
            </h3>
            <p className="mt-1 text-sm text-green-700">
              {isOwnApartment
                ? "Apartament własny: pełny zysk netto po odliczeniach oraz podstawa opodatkowania i zryczałtowany podatek 8,5%."
                : "Ostateczna kalkulacja płatności dla właściciela"}
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
                {report.customSummaryEnabled && (
                  <span className="ml-2 inline-block rounded bg-blue-200 px-2 py-0.5 align-middle text-xs font-semibold text-blue-800">
                    poglądowo
                  </span>
                )}
              </div>
              {/* KWOTA STAŁA */}
              {!report.customSummaryEnabled &&
                !isOwnApartment &&
                report.finalSettlementType === "FIXED" &&
                report.fixedNetBase !== undefined && (
                  <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-4">
                    <div className="mb-2 flex items-center text-lg font-semibold text-green-800">
                      Rozliczenie właściciela: kwota stała
                      <FinalBadge />
                    </div>
                    {report.fixedPayoutProrateEnabled &&
                      fixedProrateFactor < 1 &&
                      report.fixedPayoutActiveDays != null && (
                        <p className="text-sm text-green-800">
                          Proporcja miesiąca:{" "}
                          <strong>
                            {report.fixedPayoutActiveDays} z {dimDaysReport}
                          </strong>{" "}
                          dni kalendarzowych (kwota stała w rozliczeniu:{" "}
                          {scaledContractFixed.toFixed(2)} PLN zamiast{" "}
                          {fixedBaseAmount.toFixed(2)} PLN).
                        </p>
                      )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">
                          Kwota bazowa{!isVatExempt && " (netto)"}:
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {(report.fixedNetBase ?? 0).toFixed(2)} PLN
                          <span className="block text-xs text-green-600">
                            (kwota stała z umowy: {fixedBaseAmount.toFixed(2)} PLN
                            {fixedProrateFactor < 1 && report.fixedPayoutActiveDays != null
                              ? ` × ${report.fixedPayoutActiveDays}/${dimDaysReport}`
                              : ""}
                            {totalAdditionalDeductionsGross > 0 && (
                              <>
                                {" "}
                                − dodatkowe odliczenia:{" "}
                                {totalAdditionalDeductionsGross.toFixed(2)} PLN
                                brutto
                              </>
                            )}
                            ; czynsz i media nie pomniejszają tej kwoty w tym
                            wariancie)
                          </span>
                        </p>
                      </div>
                      {!isVatExempt && (
                        <div className="rounded-md bg-green-100 p-3">
                          <p className="text-sm text-green-700">VAT:</p>
                          <p className="text-lg font-bold text-green-900">
                            {(report.fixedVat ?? 0).toFixed(2)} PLN
                          </p>
                        </div>
                      )}
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">DO WYPŁATY:</p>
                        <p className="text-2xl font-bold text-green-900">
                          {isVatExempt
                            ? `${summaryOwnerPayout.toFixed(2)} PLN`
                            : `${(report.fixedGross ?? summaryOwnerPayout).toFixed(2)} PLN`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              {/* KWOTA STAŁA PO ODL. MEDIÓW */}
              {!report.customSummaryEnabled &&
                !isOwnApartment &&
                report.finalSettlementType === "FIXED_MINUS_UTILITIES" &&
                report.fixedMinusUtilitiesNetBase !== undefined && (
                  <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-4">
                    <div className="mb-2 flex items-center text-lg font-semibold text-green-800">
                      Rozliczenie właściciela: kwota stała po odliczeniu mediów
                      <FinalBadge />
                    </div>
                    {report.fixedPayoutProrateEnabled &&
                      fixedProrateFactor < 1 &&
                      report.fixedPayoutActiveDays != null && (
                        <p className="text-sm text-green-800">
                          Proporcja miesiąca:{" "}
                          <strong>
                            {report.fixedPayoutActiveDays} z {dimDaysReport}
                          </strong>{" "}
                          dni — kwota stała w rozliczeniu:{" "}
                          {scaledContractFixed.toFixed(2)} PLN (z umowy:{" "}
                          {fixedBaseAmount.toFixed(2)} PLN).
                        </p>
                      )}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">
                          Kwota bazowa{!isVatExempt && " (netto)"}:
                        </p>
                        <p className="text-lg font-bold text-green-900">
                          {(report.fixedMinusUtilitiesNetBase ?? kwotaBazowaNetto).toFixed(2)} PLN
                          <span className="block text-xs text-green-600">
                            (kwota stała: {fixedBaseAmount.toFixed(2)} PLN
                            {fixedProrateFactor < 1 && report.fixedPayoutActiveDays != null
                              ? ` × ${report.fixedPayoutActiveDays}/${dimDaysReport} = ${scaledContractFixed.toFixed(2)} PLN`
                              : ""}
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
                            {(report.fixedMinusUtilitiesNetBase ?? kwotaBazowaNetto).toFixed(2)} PLN)
                          </span>
                        </p>
                      </div>
                      {!isVatExempt && (
                        <div className="rounded-md bg-green-100 p-3">
                          <p className="text-sm text-green-700">VAT:</p>
                          <p className="text-lg font-bold text-green-900">
                            {(report.fixedMinusUtilitiesVat ?? 0).toFixed(2)} PLN
                          </p>
                        </div>
                      )}
                      <div className="rounded-md bg-green-100 p-3">
                        <p className="text-sm text-green-700">DO WYPŁATY:</p>
                        <p className="text-2xl font-bold text-green-900">
                          {isVatExempt
                            ? `${summaryOwnerPayout.toFixed(2)} PLN`
                            : `${(report.fixedMinusUtilitiesGross ?? summaryOwnerPayout).toFixed(2)} PLN`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}


              {/* Prowizyjne po odliczeniu czynszu i mediów */}
              {!report.customSummaryEnabled &&
                !isOwnApartment &&
                report.finalSettlementType === "COMMISSION_MINUS_UTILITIES" &&
                (() => {
                  const commissionMinus = getCommissionPayoutNet({
                    netIncome: Number(report.netIncome ?? 0),
                    rentAmount: report.rentAmount ?? 0,
                    utilitiesAmount: report.utilitiesAmount ?? 0,
                    additionalDeductionsGross: totalAdditionalDeductionsGross,
                    commissionRate: 0.25,
                    deductCostsBeforeCommission: true,
                  });
                  const afterZw =
                    commissionMinus.commissionBase - commissionMinus.hostPayout;
                  return (
                    <div className="flex flex-col gap-2 rounded-lg bg-blue-50 p-4">
                      <div className="mb-2 flex items-center text-lg font-semibold text-blue-800">
                        Rozliczenie właściciela: prowizyjne po odliczeniu
                        czynszu i mediów
                        <FinalBadge />
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="rounded-md bg-blue-100 p-3">
                          <p className="text-sm text-blue-700">
                            Baza po odjęciu czynszu i mediów
                            {!isVatExempt && " (netto)"}:
                          </p>
                          <p className="text-lg font-bold text-blue-900">
                            {commissionMinus.commissionBase.toFixed(2)} PLN
                            <span className="block text-xs text-blue-600">
                              (zysk netto {Number(report.netIncome ?? 0).toFixed(2)} PLN
                              − czynsz: {(report.rentAmount ?? 0).toFixed(2)} PLN
                              − media: {(report.utilitiesAmount ?? 0).toFixed(2)} PLN).
                              Prowizja Złote Wynajmy{" "}
                              {commissionMinus.hostPayout.toFixed(2)} PLN (25% od
                              tej bazy).
                            </span>
                          </p>
                        </div>
                        <div className="rounded-md bg-blue-100 p-3">
                          <p className="text-sm text-blue-700">
                            Kwota bazowa{!isVatExempt && " (netto)"}:
                          </p>
                          <p className="text-lg font-bold text-blue-900">
                            {commissionMinus.ownerNetBase.toFixed(2)} PLN
                            <span className="block text-xs text-blue-600">
                              (po prowizji ZW: {afterZw.toFixed(2)} PLN −
                              dodatkowe odliczenia:{" "}
                              {totalAdditionalDeductionsGross.toFixed(2)} PLN
                              brutto)
                            </span>
                          </p>
                        </div>
                        {!isVatExempt && (
                          <div className="rounded-md bg-blue-100 p-3">
                            <p className="text-sm text-blue-700">VAT:</p>
                            <p className="text-lg font-bold text-blue-900">
                              {getVatAmount(
                                commissionMinus.ownerNetBase,
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
                              ? `${commissionMinus.ownerNetBase.toFixed(2)} PLN`
                              : `${getGrossAmount(commissionMinus.ownerNetBase, report.owner.vatOption).toFixed(2)} PLN`}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Prowizyjne — tylko apartamenty rozliczane z prowizją zarządcy */}
              {!report.customSummaryEnabled && !isOwnApartment && (
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
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                          {totalAdditionalDeductionsGross.toFixed(2)} PLN brutto
                          ={" "}
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
              )}

              {/* Sekcja rozliczenia */}
              <div className="mt-8 space-y-6"></div>

              {/* Nowe pola na końcu raportu */}
              <div className="mt-8 space-y-4">
                <div className="mt-8">
                  <h4 className="mb-4 text-xl font-semibold text-gray-800">
                    Podsumowanie
                  </h4>
                  <div
                    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isOwnApartment ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
                  >
                    <div
                      className={`rounded-md p-4 ${
                        useCommissionSummaryStyle
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          useCommissionSummaryStyle
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
                          useCommissionSummaryStyle
                            ? "text-blue-900"
                            : "text-green-900"
                        }`}
                      >
                        {summaryTaxBase.toFixed(2)} PLN
                      </p>
                    </div>
                    <div
                      className={`rounded-md p-4 ${
                        useCommissionSummaryStyle
                          ? "bg-blue-100"
                          : "bg-green-100"
                      }`}
                    >
                      <p
                        className={`text-sm ${
                          useCommissionSummaryStyle
                            ? "text-blue-700"
                            : "text-green-700"
                        }`}
                      >
                        Ostateczna wypłata Właściciela:
                      </p>
                      <p
                        className={`text-2xl font-bold ${
                          useCommissionSummaryStyle
                            ? "text-blue-900"
                            : "text-green-900"
                        }`}
                      >
                        {summaryOwnerPayout.toFixed(2)} PLN
                      </p>
                    </div>
                    {!isOwnApartment && (
                      <div className="rounded-md bg-purple-100 p-4">
                      <p className="text-sm text-purple-700">
                        Ostateczna prowizja Złote Wynajmy:
                      </p>
                      <p className="text-2xl font-bold text-purple-900">
                        {summaryHostPayout.toFixed(2)} PLN
                      </p>
                      <p className="mt-1 text-xs text-purple-600">
                        {report.finalSettlementType === "COMMISSION"
                          ? "Rozliczenie prowizyjne"
                          : report.finalSettlementType ===
                              "COMMISSION_MINUS_UTILITIES"
                            ? "Rozliczenie prowizyjne po odjęciu czynszu i mediów"
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
                    )}
                    <div className="rounded-md bg-yellow-100 p-4">
                      <p className="text-sm text-yellow-700">
                        Zryczałtowany podatek dochodowy 8.5% od wypłaty
                        właściciela:
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">
                        {summaryIncomeTax.toFixed(2)} PLN
                      </p>
                    </div>
                    {report.customSummaryEnabled &&
                      report.customSummaryNote && (
                        <div className="col-span-full rounded-md bg-orange-50 p-4 text-sm text-orange-800">
                          <div className="mb-1 font-semibold">Notatka:</div>
                          <div className="whitespace-pre-wrap">
                            {report.customSummaryNote}
                          </div>
                        </div>
                      )}
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
