"use client";
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { VATOption, ReportStatus } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { getVatAmount, getGrossAmount } from "@/lib/vat";
import {
  translateReportStatus,
  getReportStatusColor,
  translateReportItemType,
  getReportItemTypeColor,
} from "@/lib/status-translations";
import Spinner from "@/app/_components/shared/Spinner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { toast } from "react-hot-toast";

type ReportDetails = NonNullable<RouterOutputs["monthlyReports"]["getById"]>;

// Rozszerzenie raportu o pola parkingowe i sugestie
type ReportWithParking = ReportDetails & {
  parkingAdminRent?: number | null;
  parkingRentalIncome?: number | null;
  parkingProfit?: number | null;
  suggestedParkingAdminRent?: number | null;
  suggestedParkingRentalIncome?: number | null;
};

// Custom summary fields returned by API (optional)
type ReportCustomFields = {
  customSummaryEnabled?: boolean;
  customTaxBase?: number | null;
  customOwnerPayout?: number | null;
  customHostPayout?: number | null;
  customIncomeTax?: number | null;
};

type ReportWithCustom = ReportDetails & ReportCustomFields;

declare global {
  interface Window {
    __customSummaryDirty?: boolean;
    __getCustomSummaryDraft?: () => {
      enabled: boolean;
      taxBase: number;
      ownerPayout: number;
      hostPayout: number;
      incomeTax: number;
    };
    __saveCustomSummary?: () => Promise<void>;
    __manualSettlementChange?: boolean;
  }
}

// Type for deductions that can handle both regular and historical reports
type DeductionItem = {
  id: string;
  name: string;
  vatOption: VATOption;
  order: number;
  amount: number;
  // Optional fields for regular reports
  createdAt?: Date;
  updatedAt?: Date;
  reportId?: string;
  // Optional fields for historical reports
  historicalReportId?: string;
};

// Type guard to check if a report is a historical report
function isHistoricalReport(
  report:
    | NonNullable<RouterOutputs["monthlyReports"]["getById"]>
    | NonNullable<RouterOutputs["monthlyReports"]["getHistoricalById"]>
    | null
    | undefined,
): report is NonNullable<RouterOutputs["monthlyReports"]["getHistoricalById"]> {
  return Boolean(report && "deletedByAdmin" in report);
}

// Extended apartment type with new fields

export default function ReportDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ roomId?: string; roomCode?: string }>;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const actualParams = React.use(params);
  const actualSearchParams = React.use(searchParams);
  const { reportId } = actualParams;
  const selectedRoomCode = actualSearchParams?.roomCode;

  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [loadingCommissionIndex, setLoadingCommissionIndex] = useState<
    number | null
  >(null);
  const [quickExpenses, setQuickExpenses] = useState({
    tekstylia: { net: 0, gross: 0 },
    sprzatanie: { net: 0, gross: 0 },
    pranie: { net: 0, gross: 0 },
  });
  const [addingQuickExpense, setAddingQuickExpense] = useState<string | null>(
    null,
  );
  const [itemFormData, setItemFormData] = useState({
    type: "EXPENSE" as const,
    category: "",
    description: "",
    amount: 0,
    netAmount: 0,
    date: new Date().toISOString().split("T")[0],
    notes: "",
    // Nowe pola dla niestandardowych wydatków
    isCustomExpense: false,
    customExpenseName: "",
    customVatRate: 0, // 0 = brak VAT, 8, 23
  });

  // Dodaj state dla czynszu i mediów
  const [rentUtilitiesData, setRentUtilitiesData] = useState({
    rentAmount: 0,
    utilitiesAmount: 0,
  });
  const [isRentUtilitiesDirty, setIsRentUtilitiesDirty] = useState(false);

  // Parking section state
  const [parkingAdminRent, setParkingAdminRent] = useState<number>(0);
  const [parkingRentalIncome, setParkingRentalIncome] = useState<number>(0);
  const [isParkingDirty, setIsParkingDirty] = useState(false);
  const parkingProfit = Math.max(
    0,
    Number(parkingRentalIncome || 0) - Number(parkingAdminRent || 0),
  );

  // Dodaj state dla dodatkowego odliczenia
  const [additionalDeductionData, setAdditionalDeductionData] = useState<{
    name: string;
    amount: number;
    vatOption: VATOption;
  }>({
    name: "",
    amount: 0,
    vatOption: VATOption.NO_VAT,
  });

  const [editingDeduction, setEditingDeduction] =
    useState<DeductionItem | null>(null);

  const [orderedDeductions, setOrderedDeductions] = useState<DeductionItem[]>(
    [],
  );

  // Function to determine the correct navigation path based on user role
  const getBackToListPath = () => {
    // Check if user is logged in as owner (has role property set to "OWNER")
    if (
      session?.user &&
      "role" in session.user &&
      session.user.role === "OWNER"
    ) {
      return "/apartamentsOwner/reports";
    }
    // Default to admin reports list
    return "/admin/reports";
  };

  // Dodaj mutację
  const updateRentUtilitiesMutation =
    api.monthlyReports.updateRentAndUtilities.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
        setIsRentUtilitiesDirty(false);
      },
    });

  const updateAdditionalDeductionMutation =
    api.monthlyReports.updateAdditionalDeduction.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
        setEditingDeduction(null);
      },
    });

  const addAdditionalDeductionMutation =
    api.monthlyReports.addAdditionalDeduction.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
        // Reset form after successful save
        setAdditionalDeductionData({
          name: "",
          amount: 0,
          vatOption: VATOption.NO_VAT,
        });
      },
    });

  const deleteAdditionalDeductionMutation =
    api.monthlyReports.deleteAdditionalDeduction.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
      },
    });

  const deleteReportItemMutation = api.monthlyReports.deleteItem.useMutation({
    onSuccess: () => {
      toast.success("Pozycja została usunięta.");
      void reportQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const updateDeductionsOrderMutation =
    api.monthlyReports.updateDeductionsOrder.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
      },
      onError: (error) => {
        alert(`Błąd podczas aktualizacji kolejności: ${error.message}`);
        // Optionally revert local state if server update fails
        void reportQuery.refetch(); // Refetch to get original order
      },
    });

  // Parking mutation
  const updateParkingMutation = api.monthlyReports.updateParking.useMutation({
    onSuccess: () => {
      toast.success("Zapisano sekcję Parking");
      void reportQuery.refetch();
      setIsParkingDirty(false);
    },
    onError: (error) => {
      toast.error(`Błąd zapisu sekcji Parking: ${error.message}`);
    },
  });

  // TRPC queries
  const reportQuery = api.monthlyReports.getById.useQuery(
    {
      reportId: reportId,
    },
    {
      // Krótki cache aby uniknąć zbyt częstych refetchów
      staleTime: 1000, // 1 sekunda - dane są świeże przez 1 sekundę
      // Nie refetchuj automatycznie przy focus
      refetchOnWindowFocus: false,
      // Disable query until reportId is available
      enabled: !!reportId,
    },
  );

  const historicalReportQuery = api.monthlyReports.getHistoricalById.useQuery(
    {
      reportId: reportId,
    },
    {
      enabled: !!reportId &&
        reportQuery.isError &&
        // uruchamiaj tylko, gdy błąd to NOT_FOUND (a nie np. chwilowy błąd sieci)
        (reportQuery.error &&
          typeof (reportQuery.error as { data?: { code?: string } }).data?.code === "string" &&
          (reportQuery.error as { data?: { code?: string } }).data?.code === "NOT_FOUND") &&
        status === "authenticated" &&
        !reportQuery.isLoading,
      retry: false, // nie ponawiaj – to ścieżka awaryjna
    },
  );

  const suggestedCommissionsQuery =
    api.monthlyReports.getSuggestedCommissions.useQuery(
      {
        reportId: reportId,
      },
      {
        enabled: !!reportId && reportQuery.isSuccess, // Only enable when the regular report query has succeeded
      },
    );

  // TRPC mutations
  const addItemMutation = api.monthlyReports.addItem.useMutation({
    onSuccess: () => {
      toast.success("Pozycja została dodana.");
      void reportQuery.refetch();
      setShowAddItemForm(false);
      setItemFormData({
        type: "EXPENSE",
        category: "",
        description: "",
        amount: 0,
        netAmount: 0,
        date: new Date().toISOString().split("T")[0],
        notes: "",
        isCustomExpense: false,
        customExpenseName: "",
        customVatRate: 0,
      });
    },
    onError: (error) => {
      toast.error(`Błąd: ${error.message}`);
    },
  });

  const updateOrAddItemMutation =
    api.monthlyReports.updateOrAddItem.useMutation({
      onSuccess: (data) => {
        if (data.wasUpdated) {
          toast.success("Pozycja została zaktualizowana");
        } else {
          toast.success("Pozycja została dodana");
        }
        void reportQuery.refetch();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    });

  const updateStatusMutation = api.monthlyReports.updateStatus.useMutation({
    onSuccess: () => {
      void reportQuery.refetch();
    },
  });

  const rebuildRevenueMutation =
    api.monthlyReports.rebuildRevenueItems.useMutation({
      onSuccess: async (res) => {
        toast.success(`Przychody odświeżone (dodano: ${res.created})`);
        await reportQuery.refetch();
      },
      onError: (err) =>
        toast.error(`Błąd przeliczania przychodów: ${err.message}`),
    });

  // Dodawanie faktury przychodowej (ręcznej)
  const addIncomeInvoiceMutation =
    api.monthlyReports.addIncomeInvoice.useMutation({
      onSuccess: async () => {
        toast.success("Dodano fakturę przychodową");
        await reportQuery.refetch();
        setIncomeInvoiceAmount(0);
      },
      onError: (err) => toast.error(`Błąd: ${err.message}`),
    });
  const [incomeInvoiceAmount, setIncomeInvoiceAmount] = useState<number>(0);
  const [invoiceStart, setInvoiceStart] = useState<string>("");
  const [invoiceEnd, setInvoiceEnd] = useState<string>("");
  const updateIncomeInvoice =
    api.monthlyReports.updateIncomeInvoice.useMutation({
      onSuccess: async () => {
        await reportQuery.refetch();
      },
      onError: (e) => toast.error(e.message),
    });

  const updateSettlementDetailsMutation =
    api.monthlyReports.updateSettlementDetails.useMutation({
      onSuccess: () => {
        // Odśwież dane po krótkim opóźnieniu aby uniknąć konfliktów
        setTimeout(() => {
          void reportQuery.refetch();
        }, 100);
        console.log(`✅ Zaktualizowano typ rozliczenia`);
        toast.success(
          "Typ rozliczenia został automatycznie zaktualizowany na podstawie ustawień apartamentu",
        );
      },
      onError: (error) => {
        console.error(
          `❌ Błąd podczas aktualizacji typu rozliczenia: ${error.message}`,
        );
        toast.error(
          `Błąd podczas aktualizacji typu rozliczenia: ${error.message}`,
        );
      },
    });

  const report = reportQuery.data;
  const historicalReport = historicalReportQuery.data;

  // Użyj historycznego raportu, jeśli zwykły nie istnieje
  const finalReport = report ?? historicalReport;
  const isHistorical = Boolean(!report && historicalReport);

  // Zaktualizuj useEffect gdy report się załaduje
  useEffect(() => {
    if (finalReport) {
      // Nie nadpisuj lokalnie edytowanych wartości czynszu/mediów
      if (!isRentUtilitiesDirty) {
        // Prefill z zapisanych wartości lub – jeśli puste/0 – z sugestii (ostatni raport lub domyślne z apartamentu)
        const existingRent = finalReport.rentAmount ?? 0;
        const existingUtilities = finalReport.utilitiesAmount ?? 0;

        let prefillRent = existingRent;
        let prefillUtilities = existingUtilities;

        if (!isHistoricalReport(finalReport)) {
          const normalReport = finalReport as unknown as {
            suggestedRent?: number | null;
            suggestedUtilities?: number | null;
          };
          if (!prefillRent || prefillRent === 0) {
            const s = Number(normalReport.suggestedRent ?? 0);
            if (s > 0) prefillRent = s;
          }
          if (!prefillUtilities || prefillUtilities === 0) {
            const s = Number(normalReport.suggestedUtilities ?? 0);
            if (s > 0) prefillUtilities = s;
          }
        }

        setRentUtilitiesData({
          rentAmount: prefillRent,
          utilitiesAmount: prefillUtilities,
        });
      }
      // Sort deductions by order and set them to local state
      const sortedDeductions = [
        ...(finalReport.additionalDeductions ?? []),
      ].sort((a, b) => a.order - b.order) as DeductionItem[];
      setOrderedDeductions(sortedDeductions);
    }
  }, [finalReport, isRentUtilitiesDirty, report]);

  // Initialize parking defaults from stored values or suggestions
  useEffect(() => {
    const r = report as ReportWithParking | null | undefined;
    if (!r) return;
    const hasStoredValues =
      typeof r.parkingAdminRent === "number" ||
      typeof r.parkingRentalIncome === "number";
    const initialAdminRent = hasStoredValues
      ? Number(r.parkingAdminRent ?? 0)
      : Number(r.suggestedParkingAdminRent ?? 0);
    const initialRentalIncome = hasStoredValues
      ? Number(r.parkingRentalIncome ?? 0)
      : Number(r.suggestedParkingRentalIncome ?? 0);
    setParkingAdminRent(initialAdminRent);
    setParkingRentalIncome(initialRentalIncome);
  }, [report, report?.id]);

  // Auto-save suggestions if there are no stored values yet
  useEffect(() => {
    const r = report as ReportWithParking | null | undefined;
    if (!r) return;
    const storedAdmin = Number(r.parkingAdminRent ?? 0);
    const storedIncome = Number(r.parkingRentalIncome ?? 0);
    const suggAdmin = Number(r.suggestedParkingAdminRent ?? 0);
    const suggIncome = Number(r.suggestedParkingRentalIncome ?? 0);
    if (
      storedAdmin === 0 &&
      storedIncome === 0 &&
      (suggAdmin > 0 || suggIncome > 0)
    ) {
      updateParkingMutation.mutate({
        reportId: report!.id,
        parkingAdminRent: suggAdmin,
        parkingRentalIncome: suggIncome,
        parkingProfit: Math.max(0, suggIncome - suggAdmin),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, report?.id]);

  // useEffect do automatycznego aktualizowania typu rozliczenia gdy zmienią się ustawienia apartamentu
  useEffect(() => {
    if (!finalReport || finalReport.status === "SENT") {
      return;
    }

    // Sprawdź czy ustawienia apartamentu wymagają aktualizacji typu rozliczenia
    const apartmentPaymentType = finalReport.apartment.paymentType;
    const currentSettlementType = finalReport.finalSettlementType;

    // Mapuj typ apartamentu na typ rozliczenia
    let expectedSettlementType:
      | "COMMISSION"
      | "FIXED"
      | "FIXED_MINUS_UTILITIES";
    if (apartmentPaymentType === "COMMISSION") {
      expectedSettlementType = "COMMISSION";
    } else if (apartmentPaymentType === "FIXED_AMOUNT") {
      expectedSettlementType = "FIXED";
    } else if (apartmentPaymentType === "FIXED_AMOUNT_MINUS_UTILITIES") {
      expectedSettlementType = "FIXED_MINUS_UTILITIES";
    } else {
      expectedSettlementType = "COMMISSION"; // Domyślnie
    }

    // Nie nadpisuj ręcznej zmiany użytkownika (flaga globalna) ani ustawionego już typu
    const manualChange =
      typeof window !== "undefined" && Boolean(window.__manualSettlementChange);
    if (!currentSettlementType && expectedSettlementType && !manualChange) {
      console.log(
        `🔄 Aktualizuję typ rozliczenia dla raportu ${finalReport.id}: ${currentSettlementType} -> ${expectedSettlementType} (ustawienia apartamentu: ${apartmentPaymentType})`,
      );

      updateSettlementDetailsMutation.mutate({
        reportId: finalReport.id,
        finalSettlementType: expectedSettlementType,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalReport]); // Usunięto updateSettlementDetailsMutation z dependency array aby zapobiec pętli

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedDeductions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Update order property for each item
        const updatedOrderForApi = newOrder.map((item, index) => ({
          id: item.id,
          order: index,
        }));

        updateDeductionsOrderMutation.mutate({
          reportId: reportId,
          orderedDeductions: updatedOrderForApi,
        });

        return newOrder;
      });
    }
  }

  // Dodaj funkcję do zapisywania
  const handleSaveRentUtilities = async () => {
    try {
      await updateRentUtilitiesMutation.mutateAsync({
        reportId: reportId,
        ...rentUtilitiesData,
      });
      setIsRentUtilitiesDirty(false);
    } catch (error) {
      console.error("Error saving rent and utilities:", error);
    }
  };

  const handleSaveAdditionalDeduction = async () => {
    if (!additionalDeductionData.name || additionalDeductionData.amount <= 0) {
      alert("Proszę wypełnić nazwę i kwotę odliczenia");
      return;
    }

    try {
      await addAdditionalDeductionMutation.mutateAsync({
        reportId: reportId,
        ...additionalDeductionData,
      });
    } catch (error) {
      console.error("Error saving additional deduction:", error);
    }
  };

  const handleDeleteDeduction = async (deductionId: string) => {
    if (confirm("Czy na pewno chcesz usunąć to odliczenie?")) {
      try {
        await deleteAdditionalDeductionMutation.mutateAsync({
          deductionId,
        });
      } catch (error) {
        console.error("Error deleting additional deduction:", error);
      }
    }
  };

  const handleUpdateAdditionalDeduction = async () => {
    if (!editingDeduction) return;

    try {
      await updateAdditionalDeductionMutation.mutateAsync({
        deductionId: editingDeduction.id,
        name: editingDeduction.name,
        amount: editingDeduction.amount,
        vatOption: editingDeduction.vatOption,
      });
    } catch (error) {
      console.error("Error updating additional deduction:", error);
    }
  };

  const calculateVATAmount = (
    netAmount: number,
    category: string,
    customVatRate?: number,
  ) => {
    // Jeśli mamy niestandardową stawkę VAT, użyj jej
    if (customVatRate !== undefined) {
      const vatAmount = netAmount * (customVatRate / 100);
      return netAmount + vatAmount;
    }

    // W przeciwnym razie szukaj w predefiniowanych kategoriach
    const categoryData = expenseCategories.find((cat) => cat.name === category);
    if (!categoryData) return netAmount;

    const vatAmount = netAmount * (categoryData.vatRate / 100);
    return netAmount + vatAmount;
  };

  const expenseCategories = [
    {
      name: "Tekstylia",
      vatRate: 23,
      description: "Tekstylia, wino i środki czystości",
    },
    {
      name: "Sprzątanie",
      vatRate: 23,
      description: "Usługi sprzątania apartamentu",
    },
    {
      name: "Pranie",
      vatRate: 23,
      description: "Pranie pościeli i ręczników",
    },
  ];

  const quickExpenseCategories = {
    tekstylia: {
      name: "Tekstylia",
      vatRate: 23,
      description: "Tekstylia, wino i środki czystości",
    },
    sprzatanie: {
      name: "Sprzątanie",
      vatRate: 23,
      description: "Usługi sprzątania apartamentu",
    },
    pranie: {
      name: "Pranie",
      vatRate: 23,
      description: "Pranie pościeli i ręczników",
    },
  };

  const handleQuickExpenseChange = (
    category: keyof typeof quickExpenses,
    netAmount: number,
  ) => {
    const categoryData = quickExpenseCategories[category];
    const vatAmount = netAmount * (categoryData.vatRate / 100);
    const grossAmount = netAmount + vatAmount;

    setQuickExpenses((prev) => ({
      ...prev,
      [category]: { net: netAmount, gross: grossAmount },
    }));
  };

  const addQuickExpense = async (category: keyof typeof quickExpenses) => {
    const expense = quickExpenses[category];
    const categoryData = quickExpenseCategories[category];

    if (expense.net <= 0) return;

    try {
      setAddingQuickExpense(category);
      await updateOrAddItemMutation.mutateAsync({
        reportId: reportId,
        type: "EXPENSE",
        category: categoryData.name,
        description: categoryData.description,
        amount: expense.gross,
        date: new Date(),
        notes: `Kwota netto: ${expense.net.toFixed(2)} PLN, VAT (${categoryData.vatRate}%): ${(expense.gross - expense.net).toFixed(2)} PLN`,
      });

      // Reset the input after successful add
      setQuickExpenses((prev) => ({
        ...prev,
        [category]: { net: 0, gross: 0 },
      }));
    } catch (error) {
      console.error("Error adding quick expense:", error);
    } finally {
      setAddingQuickExpense(null);
    }
  };

  // Funkcja obliczająca liczbę nocy między datami
  const calculateNights = (checkIn: Date, checkOut: Date) => {
    const oneDay = 24 * 60 * 60 * 1000; // milisekundy w dniu
    const diffTime = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.round(diffTime / oneDay);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    setItemFormData((prev) => {
      const newValue = type === "number" ? Number(value) : value;
      const updated = { ...prev, [name]: newValue };

      // Obsługa przełączania na wydatek niestandardowy
      if (name === "category" && value === "CUSTOM") {
        updated.isCustomExpense = true;
        updated.category = "";
      } else if (name === "category" && value !== "CUSTOM") {
        updated.isCustomExpense = false;
        updated.customExpenseName = "";
        updated.customVatRate = 0;
      }

      // Automatyczne obliczenie VAT dla kwoty netto
      if (name === "netAmount") {
        if (updated.isCustomExpense) {
          updated.amount = calculateVATAmount(
            Number(value),
            "",
            updated.customVatRate,
          );
        } else if (updated.category) {
          updated.amount = calculateVATAmount(Number(value), updated.category);
        }
      }

      // Automatyczne obliczenie VAT przy zmianie kategorii (predefiniowanej)
      if (
        name === "category" &&
        updated.netAmount > 0 &&
        !updated.isCustomExpense
      ) {
        updated.amount = calculateVATAmount(updated.netAmount, value);
        // Automatyczne uzupełnienie opisu
        const categoryData = expenseCategories.find(
          (cat) => cat.name === value,
        );
        if (categoryData && !updated.description) {
          updated.description = categoryData.description;
        }
      }

      // Automatyczne obliczenie VAT przy zmianie stawki VAT (niestandardowej)
      if (
        name === "customVatRate" &&
        updated.netAmount > 0 &&
        updated.isCustomExpense
      ) {
        updated.amount = calculateVATAmount(
          updated.netAmount,
          "",
          Number(value),
        );
      }

      // Ustawienie kategorii na podstawie nazwy niestandardowego wydatku
      if (name === "customExpenseName" && updated.isCustomExpense) {
        updated.category = value;
      }

      return updated;
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addItemMutation.mutateAsync({
        reportId: reportId,
        ...itemFormData,
        date: new Date(itemFormData.date!),
      });
    } catch (error) {
      if (error instanceof Error) {
        toast.error(`Błąd: ${error.message}`);
      } else {
        toast.error("Wystąpił nieznany błąd podczas dodawania pozycji.");
      }
    }
  };

  // =========================
  // Guard przed utratą niezapisanych niestandardowych wartości podsumowania
  // (stan i modal na poziomie strony)
  // =========================
  const [, setShowUnsavedCustomModal] = React.useState(false);
  const [, setPendingNavigatePath] = React.useState<string | null>(null);

  const handleNavigateWithUnsavedCheck = (path: string) => {
    try {
      const dirty = Boolean(window?.__customSummaryDirty);
      if (dirty) {
        setPendingNavigatePath(path);
        setShowUnsavedCustomModal(true);
        return;
      }
    } catch {}
    router.push(path);
  };

  const handleAddSuggestedCommission = async (
    suggestion: {
      type: "COMMISSION";
      category: string;
      description: string;
      amount: number;
      date: Date;
      notes: string;
      totalRevenue?: number;
    },
    index: number,
  ) => {
    try {
      setLoadingCommissionIndex(index);
      await addItemMutation.mutateAsync({
        reportId: reportId,
        type: suggestion.type,
        category: suggestion.category,
        description: suggestion.description,
        amount: suggestion.amount,
        date: suggestion.date,
        notes: suggestion.notes,
      });

      // Refetch suggestions after adding
      void suggestedCommissionsQuery.refetch();
    } catch (error) {
      console.error("Error adding suggested commission:", error);
    } finally {
      setLoadingCommissionIndex(null);
    }
  };

  const addDiscountMutation =
    api.monthlyReports.addReservationDiscount.useMutation({
      onSuccess: () => {
        void reportQuery.refetch();
      },
      onError: (error) => {
        alert(`Błąd podczas dodawania rabatu: ${error.message}`);
      },
    });

  const handleAddDiscount = (reservationId: number) => {
    if (
      confirm("Czy na pewno chcesz dodać rabat 10% (+VAT) dla tej rezerwacji?")
    ) {
      addDiscountMutation.mutate({ reportId, reservationId });
    }
  };

  const handleStatusChange = (status: ReportStatus, notes?: string) => {
    // Jeśli próbujemy wysłać raport, pokaż modal potwierdzenia
    if (status === ReportStatus.SENT) {
      setShowSendConfirmationModal(true);
      setPendingStatusChange({ status, notes });
      return;
    }

    updateStatusMutation.mutate({ reportId, status, notes });
  };

  const [showSendConfirmationModal, setShowSendConfirmationModal] =
    useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    status: ReportStatus;
    notes?: string;
  } | null>(null);

  const handleConfirmSend = () => {
    if (pendingStatusChange) {
      updateStatusMutation.mutate({
        reportId,
        status: pendingStatusChange.status,
        notes: pendingStatusChange.notes,
      });
      setShowSendConfirmationModal(false);
      setPendingStatusChange(null);
    }
  };

  const handleArchiveAndDelete = async () => {
    console.log("handleArchiveAndDelete called", { deletionReason, reportId });

    if (!deletionReason.trim()) {
      toast.error("Proszę podać przyczynę usunięcia raportu");
      return;
    }

    console.log("Calling archiveAndDeleteSentReportMutation with:", {
      reportId,
      deletionReason: deletionReason.trim(),
    });

    archiveAndDeleteSentReportMutation.mutate({
      reportId,
      deletionReason: deletionReason.trim(),
    });
    setShowArchiveDeleteModal(false);
    setDeletionReason("");
  };

  // Używamy nowych funkcji z lib/status-translations
  const getStatusColor = getReportStatusColor;
  const getStatusText = translateReportStatus;
  const getItemTypeTextLocal = translateReportItemType;
  const getItemTypeColorLocal = getReportItemTypeColor;

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [showArchiveDeleteModal, setShowArchiveDeleteModal] =
    React.useState(false);
  const [deletionReason, setDeletionReason] = React.useState("");

  // Debug logging
  React.useEffect(() => {
    if (showArchiveDeleteModal) {
      console.log(
        "Archive delete modal is now visible, deletionReason:",
        deletionReason,
      );
    }
  }, [showArchiveDeleteModal, deletionReason]);
  const deleteReportMutation = api.monthlyReports.deleteReport.useMutation({
    onSuccess: () => {
      toast.success("Raport został usunięty");
      router.push(getBackToListPath());
    },
    onError: (error) => {
      toast.error(`Błąd podczas usuwania raportu: ${error.message}`);
    },
  });

  const archiveAndDeleteSentReportMutation =
    api.monthlyReports.archiveAndDeleteSentReport.useMutation({
      onSuccess: (data) => {
        console.log("Archive and delete success:", data);
        toast.success("Raport został zarchiwizowany i usunięty");
        router.push(getBackToListPath());
      },
      onError: (error) => {
        console.error("Archive and delete error:", error);
        toast.error(`Błąd podczas archiwizacji raportu: ${error.message}`);
      },
    });

  const handleDeleteItem = (itemId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę pozycję z raportu?")) {
      deleteReportItemMutation.mutate({ itemId });
    }
  };

  // Mutacja do dodawania kosztów sprzątania
  const addCleaningCosts = api.monthlyReports.addCleaningCosts.useMutation({
    onSuccess: (data) => {
      if (data.wasUpdated) {
        toast.success("Koszty sprzątania zostały zaktualizowane");
      } else {
        toast.success("Koszty sprzątania zostały dodane do raportu");
      }
      void reportQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Błąd: ${err.message}`);
    },
  });

  const handleAddCleaningCosts = () => {
    if (
      confirm(
        "Czy chcesz dodać automatyczne koszty sprzątania do tego raportu?",
      )
    ) {
      addCleaningCosts.mutate({ reportId });
    }
  };

  // Mutacja do dodawania kosztów prania
  const addLaundryCosts = api.monthlyReports.addLaundryCosts.useMutation({
    onSuccess: (data) => {
      if (data.wasUpdated) {
        toast.success("Koszty prania zostały zaktualizowane");
      } else {
        toast.success("Koszty prania zostały dodane do raportu");
      }
      void reportQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Błąd: ${err.message}`);
    },
  });

  const handleAddLaundryCosts = () => {
    if (
      confirm("Czy chcesz dodać automatyczne koszty prania do tego raportu?")
    ) {
      addLaundryCosts.mutate({ reportId });
    }
  };

  // Mutacja do dodawania kosztów tekstyliów
  const addTextileCosts = api.monthlyReports.addTextileCosts.useMutation({
    onSuccess: (data) => {
      if (data.wasUpdated) {
        toast.success("Koszty tekstyliów zostały zaktualizowane");
      } else {
        toast.success("Koszty tekstyliów zostały dodane do raportu");
      }
      void reportQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Błąd: ${err.message}`);
    },
  });

  const handleAddTextileCosts = () => {
    if (
      confirm(
        "Czy chcesz dodać automatyczne koszty tekstyliów do tego raportu?",
      )
    ) {
      addTextileCosts.mutate({ reportId });
    }
  };

  // (Usunięto automatyczne wyliczanie sugerowanych kosztów sprzątania)
  // Zmiana źródła rezerwacji (admin)
  // Standardowe źródła rozpoznawane w systemie
  const STANDARD_SOURCES = ["Booking", "Airbnb", "Złote Wynajmy"] as const;
  // Pozwalamy na dowolny string jako źródło (może pochodzić z bazy)
  type ReservationSource = string;
  const updateReservationSource = api.reservation.updateSource.useMutation({
    onSuccess: async () => {
      await reportQuery.refetch();
      toast.success("Źródło rezerwacji zaktualizowane");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleChangeSource = (
    reservationId: number,
    newSource: ReservationSource,
  ) => {
    updateReservationSource.mutate({ reservationId, newSource });
  };

  // Zwraca wartość, która ma być ustawiona w select jako aktualna
  // - jeżeli źródło z bazy pasuje do standardowych, zwracamy standardową wartość
  // - w przeciwnym razie zwracamy surową wartość z bazy (dynamiczna opcja)
  const computeSourceValue = (src?: string | null): string => {
    const raw = (src ?? "").trim();
    if (!raw) return "Złote Wynajmy";
    const lower = raw.toLowerCase();
    if (lower.includes("airbnb")) return "Airbnb";
    if (lower.includes("book")) return "Booking";
    if (lower === "złote wynajmy" || lower === "zlote wynajmy")
      return "Złote Wynajmy";
    return raw;
  };

  // Buduje listę opcji do selecta: standardowe + ewentualna dynamiczna z bazy
  const buildSourceOptions = (src?: string | null): string[] => {
    const value = computeSourceValue(src);
    const options = new Set<string>([...STANDARD_SOURCES]);
    if (
      value &&
      !STANDARD_SOURCES.map((s) => s.toLowerCase()).includes(
        value.toLowerCase(),
      )
    ) {
      options.add(value);
    }
    return Array.from(options);
  };

  const getCreateDateSafe = (
    res?: { createDate?: Date } | null,
    fallback?: Date,
  ): Date | undefined => {
    if (res?.createDate instanceof Date) return res.createDate;
    return fallback;
  };

  // (Usunięto automatyczne wyliczanie sugerowanych kosztów prania)

  // (Usunięto automatyczne wyliczanie sugerowanych kosztów tekstyliów)

  // Funkcja obliczająca koszt sprzątania dla pojedynczej rezerwacji
  const calculateCleaningCostForReservation = (reservation: {
    adults?: number | null;
    children?: number | null;
  }): number => {
    const apartment = report?.apartment;
    if (!apartment?.cleaningCosts) {
      return 0;
    }

    const cleaningCosts = apartment.cleaningCosts as Record<
      string,
      number
    > | null;
    const totalGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);

    if (totalGuests > 0 && cleaningCosts) {
      // Find the cleaning cost for this number of guests
      // If exact match not found, use the highest available cost for fewer guests
      for (let i = totalGuests; i >= 1; i--) {
        if (cleaningCosts[i.toString()] !== undefined) {
          return cleaningCosts[i.toString()]!;
        }
      }
    }

    return 0;
  };

  if (
    status === "loading" ||
    reportQuery.isLoading ||
    (reportQuery.isError &&
      historicalReportQuery.isFetching &&
      status === "authenticated")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  if (
    (reportQuery.error &&
      !historicalReportQuery.data &&
      status === "authenticated") ||
    (!finalReport &&
      status === "authenticated" &&
      !reportQuery.isLoading &&
      !historicalReportQuery.isLoading &&
      !historicalReportQuery.isFetching &&
      !historicalReportQuery.isError &&
      !historicalReportQuery.isSuccess &&
      !historicalReportQuery.isStale &&
      !historicalReportQuery.isRefetching &&
      !historicalReportQuery.isPaused &&
      !historicalReportQuery.isPlaceholderData &&
      !historicalReportQuery.isFetched &&
      !historicalReportQuery.isFetchedAfterMount &&
      !historicalReportQuery.isInitialLoading &&
      !historicalReportQuery.isLoadingError &&
      !historicalReportQuery.isRefetchError &&
      !historicalReportQuery.isFetching &&
      !historicalReportQuery.isLoading &&
      !historicalReportQuery.isError &&
      !historicalReportQuery.isSuccess &&
      !historicalReportQuery.isStale &&
      !historicalReportQuery.isRefetching &&
      !historicalReportQuery.isPaused &&
      !historicalReportQuery.isPlaceholderData &&
      !historicalReportQuery.isFetched &&
      !historicalReportQuery.isFetchedAfterMount &&
      !historicalReportQuery.isInitialLoading &&
      !historicalReportQuery.isLoadingError &&
      !historicalReportQuery.isRefetchError &&
      !historicalReportQuery.isFetching)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">
            {reportQuery.error?.message ?? "Raport nie został znaleziony"}
          </p>
          <button
            onClick={() => handleNavigateWithUnsavedCheck(getBackToListPath())}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  const revenueItems = (finalReport?.items ?? []).filter(
    (item) => item.type === "REVENUE",
  );
  // Rezerwacje/przychody (tylko skutecznie zrealizowane – nie filtrujemy po liczbie gości)
  const reservationItems = revenueItems.filter((item) => {
    const r = item.reservation;
    if (!r) return false;
    const s = (r.status ?? "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (
      s.includes("anul") ||
      s.includes("odrzuc") ||
      s.includes("withdraw") ||
      s.includes("cancel") ||
      s.includes("nieopl") ||
      s.includes("oczekuje") ||
      s.includes("niepopraw") ||
      s.includes("wyjasn")
    ) {
      return false;
    }
    return true;
  });
  // Jeżeli brak rezerwacji powiązanych (np. ręczne przychody), pokaż wszystkie przychody
  const displayedRevenueItems =
    reservationItems.length > 0 ? reservationItems : revenueItems;
  const expenseItems = (finalReport?.items ?? []).filter((item) =>
    ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(item.type),
  );
  const localTotalRevenue =
    revenueItems.reduce((sum, i) => sum + i.amount, 0) +
    Number(
      (finalReport as unknown as { parkingRentalIncome?: number })
        ?.parkingRentalIncome ?? 0,
    );

  // Odliczenia są obliczane w komponencie OwnerPayoutCalculation

  if (!finalReport) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Raport {finalReport.month.toString().padStart(2, "0")}/
                {finalReport.year}
                {isHistorical && (
                  <span className="ml-2 inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-800">
                    Zarchiwizowany i anulowany
                  </span>
                )}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {finalReport.apartment.name}
                {(() => {
                  const roomsCount =
                    (finalReport as unknown as { apartment?: { _count?: { rooms?: number } } })?.apartment?._count?.rooms ??
                    0;
                  const roomCode =
                    selectedRoomCode ??
                    ((finalReport as unknown as { room?: { code?: string } })?.room?.code ?? undefined);
                  return roomsCount > 1 && roomCode ? (
                    <>
                      {" "}
                      • Pokój {roomCode}
                    </>
                  ) : null;
                })()}{" "}
                - {finalReport.owner.firstName} {finalReport.owner.lastName}
              </p>
              {/* Informacja o sposobie rozliczenia */}
              <div className="mt-3 flex items-center space-x-4">
                <div className="inline-flex items-center rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {finalReport.apartment.paymentType === "COMMISSION" ? (
                    <>
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
                      Prowizja od przychodów
                    </>
                  ) : (
                    <>
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
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                        />
                      </svg>
                      Kwota stała:{" "}
                      {finalReport.apartment.fixedPaymentAmount
                        ? Number(
                            finalReport.apartment.fixedPaymentAmount,
                          ).toFixed(2)
                        : "0"}{" "}
                      PLN
                    </>
                  )}
                </div>
                <div className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  {finalReport.owner.vatOption === "NO_VAT" && "Bez VAT"}
                  {finalReport.owner.vatOption === "VAT_8" && "VAT 8%"}
                  {finalReport.owner.vatOption === "VAT_23" && "VAT 23%"}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() =>
                    handleNavigateWithUnsavedCheck(getBackToListPath())
                  }
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
                <button
                  onClick={() => rebuildRevenueMutation.mutate({ reportId })}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-blue-500"
                  disabled={rebuildRevenueMutation.isPending}
                >
                  {rebuildRevenueMutation.isPending
                    ? "Przeliczanie..."
                    : "Przelicz przychody"}
                </button>

                {/* Przycisk usuń raport - tylko dla admina */}
                <button
                  onClick={() => {
                    console.log(
                      "Delete button clicked, report status:",
                      finalReport.status,
                    );
                    if (finalReport.status === ReportStatus.SENT) {
                      console.log("Opening archive delete modal");
                      setShowArchiveDeleteModal(true);
                    } else {
                      console.log("Opening regular delete modal");
                      setShowDeleteModal(true);
                    }
                  }}
                  className="inline-flex items-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Usuń raport
                </button>
              </div>
            </div>
          </div>
        </div>
        {editingDeduction && (
          <Modal onClose={() => setEditingDeduction(null)}>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Edytuj odliczenie
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nazwa odliczenia
                  </label>
                  <input
                    type="text"
                    value={editingDeduction.name}
                    onChange={(e) =>
                      setEditingDeduction({
                        ...editingDeduction,
                        name: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kwota netto (PLN)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingDeduction.amount}
                    onChange={(e) =>
                      setEditingDeduction({
                        ...editingDeduction,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Stawka VAT
                  </label>
                  <select
                    value={editingDeduction.vatOption}
                    onChange={(e) =>
                      setEditingDeduction({
                        ...editingDeduction,
                        vatOption: e.target.value as VATOption,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                  >
                    <option value={VATOption.NO_VAT}>Bez VAT (0%)</option>
                    <option value={VATOption.VAT_8}>VAT 8%</option>
                    <option value={VATOption.VAT_23}>VAT 23%</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setEditingDeduction(null)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleUpdateAdditionalDeduction}
                  className="rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
                  disabled={updateAdditionalDeductionMutation.isPending}
                >
                  {updateAdditionalDeductionMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz zmiany"}
                </button>
              </div>
            </div>
          </Modal>
        )}
        {showDeleteModal && (
          <Modal onClose={() => setShowDeleteModal(false)}>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-bold text-red-700">
                Czy na pewno chcesz usunąć ten raport?
              </h2>
              <p className="mb-6 text-gray-700">
                Tej operacji nie można cofnąć. Raport zostanie trwale usunięty
                zarówno dla admina, jak i właściciela.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    deleteReportMutation.mutate({ reportId });
                    setShowDeleteModal(false);
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  disabled={deleteReportMutation.isPending}
                >
                  {deleteReportMutation.isPending
                    ? "Usuwanie..."
                    : "Usuń raport"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal potwierdzenia wysyłania raportu */}
        {showSendConfirmationModal && (
          <Modal onClose={() => setShowSendConfirmationModal(false)}>
            <div className="p-6">
              <h2 className="mb-4 text-lg font-bold text-orange-700">
                Potwierdź wysłanie raportu
              </h2>
              <p className="mb-6 text-gray-700">
                Czy na pewno chcesz wysłać ten raport? Po wysłaniu:
              </p>
              <ul className="mb-6 list-inside list-disc space-y-2 text-sm text-gray-600">
                <li>
                  Raport zostanie zamrożony i nie będzie można go edytować
                </li>
                <li>Właściciel otrzyma dostęp do ostatecznej wersji raportu</li>
                <li>
                  Jedynym sposobem na zmianę będzie usunięcie i ponowne
                  utworzenie raportu
                </li>
              </ul>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowSendConfirmationModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleConfirmSend}
                  className="rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
                  disabled={updateStatusMutation.isPending}
                >
                  {updateStatusMutation.isPending
                    ? "Wysyłanie..."
                    : "Wyślij raport"}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Modal archiwizacji i usuwania raportu wysłanego */}
        {showArchiveDeleteModal && (
          <Modal
            onClose={() => {
              console.log("Closing archive delete modal");
              setShowArchiveDeleteModal(false);
            }}
          >
            <div className="p-6">
              <h2 className="mb-4 text-lg font-bold text-red-700">
                Arhiwizuj i usuń raport wysłany
              </h2>
              <p className="mb-6 text-gray-700">
                Ten raport został wysłany i zostanie zarchiwizowany przed
                usunięciem. Raport zostanie zapisany w historii z informacją o
                przyczynie usunięcia.
              </p>
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Przyczyna usunięcia *
                </label>
                <textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-red-500 focus:outline-none focus:ring-red-500"
                  rows={3}
                  placeholder="Podaj przyczynę usunięcia raportu..."
                  required
                />
                {deletionReason && (
                  <p className="mt-1 text-sm text-gray-500">
                    Długość: {deletionReason.length} znaków
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowArchiveDeleteModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  onClick={handleArchiveAndDelete}
                  className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  disabled={
                    archiveAndDeleteSentReportMutation.isPending ||
                    !deletionReason.trim()
                  }
                >
                  {archiveAndDeleteSentReportMutation.isPending
                    ? "Archiwizowanie..."
                    : `Archiwizuj i usuń ${!deletionReason.trim() ? "(wymagana przyczyna)" : ""}`}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Report Info */}
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
                    {finalReport.totalExpenses.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`rounded-lg p-2 ${finalReport.netIncome >= 0 ? "bg-green-500" : "bg-red-500"}`}
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
                    className={`text-lg font-medium ${finalReport.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {finalReport.netIncome.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStatusColor(
                    finalReport.status,
                  )}`}
                >
                  {getStatusText(finalReport.status)}
                </span>
              </div>
              <div className="ml-5 w-0 flex-1">
                {!isHistorical && finalReport.status !== ReportStatus.SENT && (
                  <select
                    value={finalReport.status}
                    onChange={(e) =>
                      handleStatusChange(e.target.value as ReportStatus)
                    }
                    className="block w-full rounded-md border-gray-300 text-sm"
                    disabled={updateStatusMutation.isPending}
                  >
                    <option value="DRAFT">Szkic</option>
                    <option value="REVIEW">Do przeglądu</option>
                    <option value="APPROVED">Zatwierdzony</option>
                    <option value="SENT">Wysłany</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Report User Information - Admin Only */}
        <div className="mb-6 overflow-hidden rounded-lg bg-gray-50 shadow">
          <div className="px-6 py-4">
            <h3 className="flex items-center text-lg font-medium text-gray-900">
              <svg
                className="mr-2 h-5 w-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Informacje o Użytkownikach (Tylko Admin)
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Historia użytkowników odpowiedzialnych za ten raport
            </p>
          </div>
          <div className="border-t border-gray-200 bg-white p-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* Użytkownik, który stworzył raport */}
              <div className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="rounded-lg bg-blue-500 p-2">
                      <svg
                        className="h-4 w-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-gray-900">
                      Stworzony przez
                    </h4>
                    <p className="text-sm text-gray-500">
                      {finalReport.createdByAdmin?.name ??
                        "Nieznany użytkownik"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {finalReport.createdAt
                        ? new Date(finalReport.createdAt).toLocaleDateString(
                            "pl-PL",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )
                        : "Data nieznana"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Użytkownik, który zatwierdził raport */}
              {finalReport.approvedByAdmin && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-lg bg-green-500 p-2">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Zatwierdzony przez
                      </h4>
                      <p className="text-sm text-gray-500">
                        {finalReport.approvedByAdmin.name ??
                          "Nieznany użytkownik"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {finalReport.approvedAt
                          ? new Date(finalReport.approvedAt).toLocaleDateString(
                              "pl-PL",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "Data nieznana"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Użytkownik, który wysłał raport */}
              {finalReport.sentAt && (
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="rounded-lg bg-purple-500 p-2">
                        <svg
                          className="h-4 w-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-gray-900">
                        Wysłany przez
                      </h4>
                      <p className="text-sm text-gray-500">
                        {finalReport.sentByAdmin?.name ?? "Nieznany użytkownik"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {finalReport.sentAt
                          ? new Date(finalReport.sentAt).toLocaleDateString(
                              "pl-PL",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "Data nieznana"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Użytkownik, który usunął raport (tylko dla historycznych) */}
              {isHistorical &&
                isHistoricalReport(finalReport) &&
                finalReport.deletedByAdmin && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="rounded-lg bg-red-500 p-2">
                          <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-red-900">
                          Usunięty przez
                        </h4>
                        <p className="text-sm text-red-700">
                          {(isHistoricalReport(finalReport) &&
                            finalReport.deletedByAdmin?.name) ??
                            "Nieznany użytkownik"}
                        </p>
                        <p className="text-xs text-red-600">
                          {isHistoricalReport(finalReport) &&
                          finalReport.deletedAt
                            ? new Date(
                                finalReport.deletedAt,
                              ).toLocaleDateString("pl-PL", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Data nieznana"}
                        </p>
                        {isHistoricalReport(finalReport) &&
                          finalReport.deletionReason && (
                            <p className="mt-1 text-xs text-red-600">
                              <strong>Przyczyna:</strong>{" "}
                              {finalReport.deletionReason}
                            </p>
                          )}
                      </div>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Quick Expense Entry */}
        {!isHistorical && finalReport.status !== ReportStatus.SENT && (
          <div className="mb-8 overflow-hidden rounded-lg bg-green-50 shadow">
            <div className="px-6 py-4">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
                Szybkie Dodawanie Kosztów
              </h3>
              <p className="mt-1 text-sm text-green-700">
                Wprowadź kwoty netto dla głównych kategorii wydatków - VAT
                zostanie automatycznie obliczony
              </p>
            </div>
            <div className="border-t border-green-200 bg-white">
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                {Object.entries(quickExpenseCategories).map(
                  ([key, category]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="mb-3">
                        <h4 className="font-medium text-gray-900">
                          {category.name}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {category.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Kwota netto (PLN)
                          </label>
                          <div className="mt-1 flex items-center space-x-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={
                                quickExpenses[key as keyof typeof quickExpenses]
                                  .net || ""
                              }
                              onChange={(e) =>
                                handleQuickExpenseChange(
                                  key as keyof typeof quickExpenses,
                                  parseFloat(e.target.value) || 0,
                                )
                              }
                              className="block w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-green-500 focus:outline-none focus:ring-green-500"
                              placeholder={"0.00"}
                              disabled={addingQuickExpense === key}
                            />
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {category.vatRate}% VAT
                            </span>
                          </div>
                          {(() => {
                            // Backend zwraca kwoty NETTO (sprzątanie: stawka × liczba, pranie: tygodnie × stawka, tekstylia: rezerwacje × stawka) – nie dzielimy przez VAT
                            const suggestedFromApi =
                              (
                                finalReport as {
                                  suggestedQuickExpenses?: {
                                    sprzatanie?: number;
                                    pranie?: number;
                                    tekstylia?: number;
                                  };
                                }
                              )?.suggestedQuickExpenses?.[
                                key as keyof typeof quickExpenses
                              ];
                            const suggestedNet =
                              suggestedFromApi != null && suggestedFromApi > 0
                                ? Math.round(suggestedFromApi * 100) / 100
                                : null;
                            const suggestionNote =
                              key === "sprzatanie"
                                ? "na bazie liczby gości w rezerwacjach"
                                : key === "pranie"
                                  ? "na bazie dni w miesiącu (pranie co 7 dni)"
                                  : "na bazie rezerwacji";
                            return suggestedNet != null && suggestedNet > 0 ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-600">
                                  Sugerowana kwota netto:{" "}
                                  <strong className="text-gray-900">
                                    {suggestedNet.toFixed(2)} PLN
                                  </strong>
                                  {" "}({suggestionNote})
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickExpenseChange(
                                      key as keyof typeof quickExpenses,
                                      suggestedNet,
                                    )
                                  }
                                  className="rounded border border-green-600 bg-white px-2 py-0.5 text-xs font-medium text-green-700 hover:bg-green-50"
                                >
                                  Użyj sugerowanej
                                </button>
                              </div>
                            ) : null;
                          })()}
                        </div>

                        {quickExpenses[key as keyof typeof quickExpenses].net >
                          0 && (
                          <div className="rounded-md bg-gray-50 p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                VAT ({category.vatRate}%):
                              </span>
                              <span className="font-medium text-gray-900">
                                {(
                                  quickExpenses[
                                    key as keyof typeof quickExpenses
                                  ].gross -
                                  quickExpenses[
                                    key as keyof typeof quickExpenses
                                  ].net
                                ).toFixed(2)}{" "}
                                PLN
                              </span>
                            </div>
                            <div className="mt-1 flex justify-between text-sm font-medium">
                              <span className="text-gray-900">
                                Kwota brutto:
                              </span>
                              <span className="text-green-600">
                                {quickExpenses[
                                  key as keyof typeof quickExpenses
                                ].gross.toFixed(2)}{" "}
                                PLN
                              </span>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() =>
                            addQuickExpense(key as keyof typeof quickExpenses)
                          }
                          disabled={
                            addingQuickExpense === key ||
                            quickExpenses[key as keyof typeof quickExpenses]
                              .net <= 0 ||
                            isHistorical ||
                            (!isHistoricalReport(finalReport) &&
                              finalReport?.status === ReportStatus.SENT)
                          }
                          className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-green-700"
                        >
                          {addingQuickExpense === key ? (
                            <>
                              <svg
                                className="mr-2 h-4 w-4 animate-spin text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Dodawanie...
                            </>
                          ) : (
                            <>
                              <svg
                                className="mr-2 h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
                              </svg>
                              Dodaj do raportu
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        )}

        {/* Revenue Items (Reservations) */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="px-6 py-4">
            <h3 className="text-lg font-semibold leading-6 text-gray-900">
              Rezerwacje i Przychody ({displayedRevenueItems.length})
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {displayedRevenueItems.length === 0 ? (
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
                        Data złożenia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Data wymeldowania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Noce
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Ilość gości
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Koszt sprzątania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {displayedRevenueItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.reservation?.guest ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.reservation ? (
                            <select
                              value={computeSourceValue(
                                item.reservation.source,
                              )}
                              onChange={(e) =>
                                handleChangeSource(
                                  item.reservation!.id,
                                  e.target.value,
                                )
                              }
                              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs"
                              disabled={updateReservationSource.isPending}
                            >
                              {buildSourceOptions(item.reservation.source).map(
                                (opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ),
                              )}
                            </select>
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
                            ? new Date(
                                getCreateDateSafe(
                                  {
                                    createDate: (
                                      item.reservation as { createDate?: Date }
                                    ).createDate,
                                  },
                                  item.reservation.start,
                                )!,
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
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                          {item.reservation ? (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {(item.reservation.adults ?? 0) +
                                (item.reservation.children ?? 0)}{" "}
                              gości
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-center text-sm">
                          {item.reservation ? (
                            <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                              {(
                                calculateCleaningCostForReservation(
                                  item.reservation,
                                ) || 0
                              ).toFixed(2)}{" "}
                              PLN
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-green-600">
                          +{item.amount.toFixed(2)} {item.currency}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {item.reservation?.source?.toLowerCase() ===
                              "airbnb" && (
                              <button
                                onClick={() =>
                                  handleAddDiscount(item.reservation!.id)
                                }
                                className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 disabled:opacity-50 hover:bg-orange-200"
                                disabled={addDiscountMutation.isPending}
                              >
                                Dodaj Rabat 10%
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Faktury przychodowe (ręcznie dodane) */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  Faktury przychodowe (ręczne)
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Pozycje dodane do raportu, ponieważ rezerwacje były
                  realizowane przed integracją z systemem rezerwacji.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2 py-1 shadow-sm ring-1 ring-gray-200">
                <label className="text-sm text-gray-700">Kwota (PLN)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={
                    Number.isFinite(incomeInvoiceAmount)
                      ? incomeInvoiceAmount
                      : 0
                  }
                  onChange={(e) =>
                    setIncomeInvoiceAmount(Number(e.target.value))
                  }
                  className="h-8 w-28 rounded border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <label className="ml-2 text-sm text-gray-700">Okres</label>
                <input
                  type="date"
                  value={invoiceStart || ""}
                  onChange={(e) => setInvoiceStart(e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="px-1 text-gray-500">-</span>
                <input
                  type="date"
                  value={invoiceEnd || ""}
                  onChange={(e) => setInvoiceEnd(e.target.value)}
                  className="h-8 rounded border border-gray-300 px-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  onClick={() =>
                    addIncomeInvoiceMutation.mutate({
                      reportId,
                      amount: Number(incomeInvoiceAmount),
                      startDate: invoiceStart
                        ? new Date(invoiceStart)
                        : undefined,
                      endDate: invoiceEnd ? new Date(invoiceEnd) : undefined,
                    })
                  }
                  disabled={
                    addIncomeInvoiceMutation.isPending ||
                    !incomeInvoiceAmount ||
                    incomeInvoiceAmount <= 0
                  }
                  className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-emerald-500"
                >
                  {addIncomeInvoiceMutation.isPending
                    ? "Dodawanie..."
                    : "Dodaj fakturę"}
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {((): JSX.Element => {
              const items = revenueItems.filter((i) => !i.reservation);
              if (items.length === 0) {
                return (
                  <div className="py-12 text-center">
                    <p className="text-gray-500">Brak faktur przychodowych</p>
                  </div>
                );
              }
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Data
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Opis
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Kwota (PLN)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                            {new Date(item.date).toLocaleDateString("pl-PL", {
                              timeZone: "UTC",
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="flex flex-col">
                              <span>
                                {item.description ??
                                  "Faktura przychodowa (ręczna) – dodana do raportu z powodu rezerwacji sprzed integracji"}
                              </span>
                              <span className="mt-1 inline-flex w-fit items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                                ręcznie dodane
                              </span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-semibold text-gray-900">
                            {Number(item.amount).toFixed(2)}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                            {!isHistorical &&
                              finalReport.status !== ReportStatus.SENT && (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={async () => {
                                      const val = prompt(
                                        "Nowa kwota (PLN)",
                                        String(item.amount),
                                      );
                                      if (val == null) return;
                                      const next = Number(val);
                                      if (!Number.isFinite(next) || next <= 0)
                                        return;
                                      const period = prompt(
                                        "Okres (YYYY-MM-DD - YYYY-MM-DD), opcjonalnie",
                                        (item.notes ?? "").replace(
                                          /^Okres:\s*/,
                                          "",
                                        ),
                                      );
                                      let startDate: Date | undefined;
                                      let endDate: Date | undefined;
                                      if (period) {
                                        const m =
                                          /^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/.exec(
                                            period,
                                          );
                                        if (m) {
                                          startDate = new Date(m[1]!);
                                          endDate = new Date(m[2]!);
                                        }
                                      }
                                      updateIncomeInvoice.mutate({
                                        itemId: item.id,
                                        amount: next,
                                        startDate,
                                        endDate,
                                      });
                                    }}
                                    className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                                  >
                                    Edytuj
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (!confirm("Usunąć tę fakturę?"))
                                        return;
                                      deleteReportItemMutation.mutate({
                                        itemId: item.id,
                                      });
                                    }}
                                    className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                                  >
                                    Usuń
                                  </button>
                                </div>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Suggested Commissions */}
        {suggestedCommissionsQuery.data?.suggestions &&
          suggestedCommissionsQuery.data.suggestions.length > 0 &&
          !isHistorical &&
          finalReport.status !== ReportStatus.SENT && (
            <SuggestedCommissionsSection
              suggestions={suggestedCommissionsQuery.data.suggestions}
              onAddCommission={handleAddSuggestedCommission}
              loadingIndex={loadingCommissionIndex}
            />
          )}

        {/* Expense Items */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="flex items-center justify-between px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Wydatki i Prowizje ({expenseItems.length})
            </h3>
            {!isHistorical && finalReport.status !== ReportStatus.SENT && (
              <div className="flex gap-2">
                {/* Przycisk dodawania/aktualizacji kosztów sprzątania */}
                {
                  <button
                    onClick={handleAddCleaningCosts}
                    disabled={addCleaningCosts.isPending}
                    className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-green-700"
                  >
                    {addCleaningCosts.isPending ? (
                      <>
                        <svg
                          className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Dodawanie...
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {expenseItems.some(
                          (item) =>
                            item.category === "Sprzątanie" &&
                            item.isAutoGenerated,
                        )
                          ? "Aktualizuj koszty sprzątania"
                          : "Dodaj koszty sprzątania"}
                      </>
                    )}
                  </button>
                }

                {/* Przycisk dodawania/aktualizacji kosztów prania */}
                {
                  <button
                    onClick={handleAddLaundryCosts}
                    disabled={addLaundryCosts.isPending}
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-blue-700"
                  >
                    {addLaundryCosts.isPending ? (
                      <>
                        <svg
                          className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Dodawanie...
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {expenseItems.some(
                          (item) =>
                            item.category === "Pranie" && item.isAutoGenerated,
                        )
                          ? "Aktualizuj koszty prania"
                          : "Dodaj koszty prania"}
                      </>
                    )}
                  </button>
                }

                {/* Przycisk dodawania/aktualizacji kosztów tekstyliów */}
                {
                  <button
                    onClick={handleAddTextileCosts}
                    disabled={addTextileCosts.isPending}
                    className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-purple-700"
                  >
                    {addTextileCosts.isPending ? (
                      <>
                        <svg
                          className="-ml-1 mr-2 h-4 w-4 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Dodawanie...
                      </>
                    ) : (
                      <>
                        <svg
                          className="mr-2 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                        {expenseItems.some(
                          (item) =>
                            item.category === "Tekstylia" &&
                            item.isAutoGenerated,
                        )
                          ? "Aktualizuj koszty tekstyliów"
                          : "Dodaj koszty tekstyliów"}
                      </>
                    )}
                  </button>
                }
                <button
                  onClick={() => setShowAddItemForm(true)}
                  disabled={
                    isHistorical ||
                    (finalReport?.status as ReportStatus) === ReportStatus.SENT
                  }
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Dodaj pozycję
                </button>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200">
            {expenseItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-gray-500">Brak dodatkowych pozycji</p>
                <p className="mt-1 text-sm text-gray-400">
                  Kliknij &quot;Dodaj pozycję&quot; aby dodać prowizje, koszty
                  lub podatki
                </p>
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
                        Opis
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Notatki
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Akcje
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
                          {new Date(item.date).toLocaleDateString("pl-PL", {
                            timeZone: "UTC",
                          })}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getItemTypeColorLocal(
                              item.type,
                            )}`}
                          >
                            {getItemTypeTextLocal(item.type)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.category}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          <div className="font-medium text-gray-900">
                            {item.description}
                          </div>
                          {item.reservation && (
                            <div className="mt-1 text-xs text-gray-500">
                              Rezerwacja:{" "}
                              {new Date(
                                item.reservation.start,
                              ).toLocaleDateString("pl-PL", {
                                timeZone: "UTC",
                              })}{" "}
                              -{" "}
                              {new Date(
                                item.reservation.end,
                              ).toLocaleDateString("pl-PL", {
                                timeZone: "UTC",
                              })}
                            </div>
                          )}
                          {item.notes && (
                            <div className="max-w-sm text-xs italic text-gray-400">
                              {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-red-600">
                          -{item.amount.toFixed(2)} {item.currency}
                        </td>
                        <td className="max-w-sm whitespace-normal px-6 py-4 text-sm text-gray-500">
                          {item.notes ?? "-"}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                          {(item.type === "EXPENSE" ||
                            item.type === "COMMISSION") &&
                            (!item.isAutoGenerated ||
                              item.type === "EXPENSE") && (
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={Boolean(
                                  isHistorical ||
                                    finalReport?.status === "SENT" ||
                                    deleteReportItemMutation.isPending,
                                )}
                                className="text-red-600 disabled:cursor-not-allowed disabled:text-gray-400 hover:text-red-900"
                                title="Usuń pozycję"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
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
        </div>

        {/* Rent and Utilities Section */}
        {!isHistorical && finalReport?.status !== ReportStatus.SENT && (
          <div className="mb-8 overflow-hidden rounded-lg bg-yellow-50 shadow">
            <div className="border-b border-yellow-200 px-6 py-4">
              <h3 className="flex items-center text-lg font-medium text-yellow-900">
                <svg
                  className="mr-2 h-5 w-5 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
                  />
                </svg>
                Czynsz i Media za Mieszkanie
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Wprowadź kwoty czynszu i mediów. Sugerowane wartości bazują na
                ostatnim zatwierdzonym raporcie.
              </p>
              <div className="mt-2 rounded-md bg-orange-100 p-2">
                <p className="text-xs font-medium text-orange-800">
                  ⚠️ Pamiętaj: Czynsz i media są odejmowane PO odjęciu prowizji
                  25% dla administratora
                </p>
              </div>
            </div>
            <div className="bg-white p-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Czynsz za mieszkanie (PLN)
                  </label>
                  <div className="mt-1 space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rentUtilitiesData.rentAmount}
                      onChange={(e) => {
                        setRentUtilitiesData((prev) => ({
                          ...prev,
                          rentAmount: parseFloat(e.target.value) || 0,
                        }));
                        setIsRentUtilitiesDirty(true);
                      }}
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                    {!isHistoricalReport(finalReport) &&
                      "suggestedRent" in finalReport &&
                      finalReport.suggestedRent &&
                      finalReport.suggestedRent > 0 && (
                        <p className="text-xs text-gray-500">
                          💡 Sugerowany na podstawie poprzednich raportów:{" "}
                          {finalReport.suggestedRent.toFixed(2)} PLN
                        </p>
                      )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Media (prąd, gaz, woda, internet) (PLN)
                  </label>
                  <div className="mt-1 space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={rentUtilitiesData.utilitiesAmount}
                      onChange={(e) => {
                        setRentUtilitiesData((prev) => ({
                          ...prev,
                          utilitiesAmount: parseFloat(e.target.value) || 0,
                        }));
                        setIsRentUtilitiesDirty(true);
                      }}
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                    {!isHistoricalReport(finalReport) &&
                      "suggestedUtilities" in finalReport &&
                      finalReport.suggestedUtilities &&
                      finalReport.suggestedUtilities > 0 && (
                        <p className="text-xs text-gray-500">
                          💡 Sugerowane na podstawie poprzednich raportów:{" "}
                          {finalReport.suggestedUtilities.toFixed(2)} PLN
                        </p>
                      )}
                  </div>
                </div>
              </div>
              {/* Nowe pole: suma czynszu i mediów */}
              <div className="mt-4 rounded-md bg-yellow-100 p-3">
                <p className="text-sm font-semibold text-yellow-700">
                  Suma czynszu i mediów:
                </p>
                <p className="text-lg font-bold text-yellow-900">
                  {(
                    (rentUtilitiesData.rentAmount ?? 0) +
                    (rentUtilitiesData.utilitiesAmount ?? 0)
                  ).toFixed(2)}{" "}
                  PLN
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveRentUtilities}
                  disabled={updateRentUtilitiesMutation.isPending}
                  className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-yellow-700"
                >
                  {updateRentUtilitiesMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz czynsz i media"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Additional Deductions Section */}
        {!isHistorical && finalReport.status !== ReportStatus.SENT && (
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
              <p className="mt-1 text-sm text-purple-700">
                Dodatkowe koszty odejmowane od ostatecznej wypłaty właściciela.
                Możesz zmieniać kolejność przeciągając elementy.
              </p>
            </div>
            <div className="bg-white p-6">
              {/* Lista istniejących odliczeń */}
              {orderedDeductions && orderedDeductions.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-md mb-3 font-medium text-gray-800">
                    Istniejące odliczenia:
                  </h4>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={orderedDeductions}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="mb-3 space-y-2">
                        {orderedDeductions.map((deduction) => (
                          <SortableDeductionItem
                            key={deduction.id}
                            id={deduction.id}
                            deduction={deduction}
                            onEdit={setEditingDeduction}
                            onDelete={handleDeleteDeduction}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {/* Podsumowanie sumy odliczeń */}
                  <div className="mt-4 rounded-md bg-purple-200 p-3">
                    <p className="mb-1 text-sm font-semibold text-purple-800">
                      Suma wszystkich odliczeń:
                    </p>
                    <div className="flex gap-8">
                      <span className="text-sm text-purple-900">
                        Netto:{" "}
                        <span className="font-bold">
                          -
                          {orderedDeductions
                            .reduce((sum, d) => sum + d.amount, 0)
                            .toFixed(2)}{" "}
                          PLN
                        </span>
                      </span>
                      <span className="text-sm text-purple-900">
                        Brutto:{" "}
                        <span className="font-bold">
                          -
                          {orderedDeductions
                            .reduce(
                              (sum, d) =>
                                sum +
                                (d.vatOption === "VAT_23"
                                  ? d.amount * 1.23
                                  : d.vatOption === "VAT_8"
                                    ? d.amount * 1.08
                                    : d.amount),
                              0,
                            )
                            .toFixed(2)}{" "}
                          PLN
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Formularz dodawania nowego odliczenia */}
              <div className="border-t border-purple-200 pt-4">
                <h4 className="text-md mb-3 font-medium text-gray-800">
                  Dodaj nowe odliczenie:
                </h4>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Nazwa odliczenia
                    </label>
                    <input
                      type="text"
                      value={additionalDeductionData.name}
                      onChange={(e) =>
                        setAdditionalDeductionData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                      placeholder="np. Opłata za sprzątanie"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kwota netto (PLN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={additionalDeductionData.amount}
                      onChange={(e) =>
                        setAdditionalDeductionData((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stawka VAT
                    </label>
                    <select
                      value={additionalDeductionData.vatOption}
                      onChange={(e) =>
                        setAdditionalDeductionData((prev) => ({
                          ...prev,
                          vatOption: e.target.value as VATOption,
                        }))
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
                    >
                      <option value={VATOption.NO_VAT}>Bez VAT (0%)</option>
                      <option value={VATOption.VAT_8}>VAT 8%</option>
                      <option value={VATOption.VAT_23}>VAT 23%</option>
                    </select>
                  </div>
                </div>

                {additionalDeductionData.amount > 0 && (
                  <div className="mt-4 rounded-md bg-purple-100 p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-700">VAT:</span>
                      <span className="font-medium text-purple-900">
                        {additionalDeductionData.vatOption === VATOption.VAT_23
                          ? (additionalDeductionData.amount * 0.23).toFixed(2)
                          : additionalDeductionData.vatOption ===
                              VATOption.VAT_8
                            ? (additionalDeductionData.amount * 0.08).toFixed(2)
                            : "0.00"}{" "}
                        PLN
                      </span>
                    </div>
                    <div className="mt-1 flex justify-between text-sm font-medium">
                      <span className="text-purple-900">Kwota brutto:</span>
                      <span className="text-purple-600">
                        {additionalDeductionData.vatOption === VATOption.VAT_23
                          ? (additionalDeductionData.amount * 1.23).toFixed(2)
                          : additionalDeductionData.vatOption ===
                              VATOption.VAT_8
                            ? (additionalDeductionData.amount * 1.08).toFixed(2)
                            : additionalDeductionData.amount.toFixed(2)}{" "}
                        PLN
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveAdditionalDeduction}
                    disabled={addAdditionalDeductionMutation.isPending}
                    className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-purple-700"
                  >
                    {addAdditionalDeductionMutation.isPending
                      ? "Zapisywanie..."
                      : "Dodaj odliczenie"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podsumowanie rozliczenia - sekcja dla administratora */}
        <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="border-b border-green-200 px-6 py-4">
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
          {/* Parking section (before commission settlement) */}
          <div className="bg-white p-6">
            <div className="mb-6 rounded-lg bg-yellow-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-yellow-800">
                Parking
              </h5>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-yellow-800">
                    Czynsz administracyjny
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={parkingAdminRent}
                    onChange={(e) => {
                      setParkingAdminRent(Number(e.target.value));
                      setIsParkingDirty(true);
                    }}
                    className="mt-1 block w-full rounded-md border-yellow-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-800">
                    Przychód z najmy
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={parkingRentalIncome}
                    onChange={(e) => {
                      setParkingRentalIncome(Number(e.target.value));
                      setIsParkingDirty(true);
                    }}
                    className="mt-1 block w-full rounded-md border-yellow-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-yellow-800">
                    Zysk
                  </label>
                  <div className="mt-1 rounded-md bg-white px-3 py-2 text-right font-semibold text-yellow-900">
                    {parkingProfit.toFixed(2)} PLN
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-yellow-700">
                  Domyślne wartości pochodzą z ostatniego wysłanego raportu dla
                  tego apartamentu.
                </p>
                <button
                  type="button"
                  disabled={
                    !report ||
                    updateParkingMutation.isPending ||
                    !isParkingDirty
                  }
                  onClick={() => {
                    if (!report) return;
                    updateParkingMutation.mutate({
                      reportId: report.id,
                      parkingAdminRent: Number(parkingAdminRent || 0),
                      parkingRentalIncome: Number(parkingRentalIncome || 0),
                      parkingProfit: Math.max(
                        0,
                        Number(parkingRentalIncome || 0) -
                          Number(parkingAdminRent || 0),
                      ),
                    });
                  }}
                  className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-yellow-700"
                >
                  {updateParkingMutation.isPending
                    ? "Zapisywanie..."
                    : "Zapisz"}
                </button>
              </div>
            </div>

            {/* Karta z zyskiem netto apartamentu */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-gray-800">
                Zysk netto apartamentu (przed wszystkimi potrąceniami)
              </h5>
              <p className="text-2xl font-bold text-gray-900">
                {report?.netIncome?.toFixed(2) ?? "0.00"} PLN
              </p>
              {report && (
                <p className="mt-1 text-xs text-gray-600">
                  Uwzględniono zysk z parkingu:{" "}
                  {Math.max(
                    0,
                    Number(parkingRentalIncome || 0) -
                      Number(parkingAdminRent || 0),
                  ).toFixed(2)}{" "}
                  PLN
                </p>
              )}
              {(() => {
                if (
                  report?.finalSettlementType === "FIXED" ||
                  report?.finalSettlementType === "FIXED_MINUS_UTILITIES"
                ) {
                  const netIncome = report?.netIncome ?? 0;
                  const fixedAmount = Number(
                    report?.apartment?.fixedPaymentAmount ?? 0,
                  );
                  if (fixedAmount > netIncome) {
                    return (
                      <p className="mt-1 text-sm text-gray-600">
                        Uwaga: kwota stała dla właściciela wynosi{" "}
                        {fixedAmount.toFixed(2)} PLN
                      </p>
                    );
                  }
                }
                return null;
              })()}
            </div>

            {/* Karta z prowizją 25% dla administratora (procent korygowany dynamicznie) */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-blue-800">
                {(() => {
                  // Oblicz dynamiczny procent prowizji na podstawie "kwota prowizji" i "pozostało"
                  const netIncome = Number(report?.netIncome ?? 0);
                  let commission = 0;
                  let remaining = 0;

                  if (
                    report?.finalSettlementType === "FIXED" ||
                    report?.finalSettlementType === "FIXED_MINUS_UTILITIES"
                  ) {
                    const fixedAmount = Number(
                      report?.apartment?.fixedPaymentAmount ?? 0,
                    );
                    commission = netIncome - fixedAmount; // może być ujemna – dopłata admina

                    const deductions = report?.additionalDeductions ?? [];
                    const totalDeductionsGross = deductions.reduce(
                      (sum: number, d: { amount: number; vatOption: string }) =>
                        sum +
                        (d.vatOption === "VAT_8" || d.vatOption === "VAT_23"
                          ? getGrossAmount(d.amount, d.vatOption)
                          : d.amount),
                      0,
                    );
                    const adminTopUp = Math.max(fixedAmount - netIncome, 0);
                    remaining = netIncome + adminTopUp - totalDeductionsGross;
                  } else {
                    // Rozliczenie prowizyjne – klasyczne 25% od zysku netto
                    commission = netIncome * 0.25;
                    remaining = netIncome * 0.75;
                  }

                  const percent =
                    netIncome > 0
                      ? (commission / (commission + remaining)) * 100
                      : 0;
                  const labelPct = `${percent.toFixed(2)}%`;
                  return `Prowizja ${labelPct} dla administratora`;
                })()}
              </h5>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-md bg-blue-100 p-3">
                  <p className="text-sm text-blue-700">Kwota prowizji:</p>
                  <div className="text-xl font-bold text-blue-900">
                    {(() => {
                      // Sprawdź czy raport ma ustawiony finalSettlementType
                      if (
                        report?.finalSettlementType === "FIXED" ||
                        report?.finalSettlementType === "FIXED_MINUS_UTILITIES"
                      ) {
                        const netIncome = report.netIncome ?? 0;
                        const fixedAmount = Number(
                          report.apartment?.fixedPaymentAmount ?? 0,
                        );
                        const realCommission = netIncome - fixedAmount;
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

                      // Standardowa prowizja 25% gdy nie ma rozliczenia z kwotą stałą
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
                        report?.finalSettlementType === "FIXED_MINUS_UTILITIES"
                      ) {
                        const netIncome = Number(report?.netIncome ?? 0);
                        const fixedAmount = Number(
                          report?.apartment?.fixedPaymentAmount ?? 0,
                        );
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
                        const adminTopUp = Math.max(fixedAmount - netIncome, 0);
                        const remaining =
                          netIncome + adminTopUp - totalDeductionsGross;

                        return (
                          <>
                            {`${remaining.toFixed(2)} PLN`}
                            <div className="mt-2 text-xs text-blue-700">
                              <span className="block">
                                dopłata administratora: {adminTopUp.toFixed(2)}{" "}
                                PLN
                                {" + zysk netto: "}
                                {netIncome.toFixed(2)} PLN
                                {" - dodatkowe odliczenia: "}
                                {totalDeductionsGross.toFixed(2)} PLN
                              </span>
                            </div>
                          </>
                        );
                      }
                      return `${((report?.netIncome ?? 0) * 0.75).toFixed(2)} PLN`;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Owner Payout Calculation */}
        <div className="mb-8 overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-blue-50 shadow">
          <div className="border-b border-green-200 px-6 py-4">
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
              Rozliczenie z Właścicielem
            </h3>
            <p className="mt-1 text-sm text-green-700">
              Ostateczna kalkulacja płatności dla{" "}
              {report?.owner?.firstName ?? ""} {report?.owner?.lastName ?? ""}
            </p>
          </div>
          <div className="bg-white p-6">
            {report && (
              <OwnerPayoutCalculation
                report={report}
                onRefetch={async () => {
                  await reportQuery.refetch();
                }}
                _additionalDeductionData={additionalDeductionData}
                _onDeleteDeduction={handleDeleteDeduction}
                _onEditDeduction={setEditingDeduction}
                sortedDeductions={orderedDeductions}
              />
            )}
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItemForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-screen w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Dodaj Nową Pozycję
              </h3>

              <form onSubmit={handleAddItem} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Typ
                  </label>
                  <select
                    name="type"
                    value={itemFormData.type}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                  >
                    <option value="EXPENSE">Wydatek</option>
                    <option value="FEE">Opłata</option>
                    <option value="TAX">Podatek</option>
                    <option value="COMMISSION">Prowizja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kategoria
                  </label>
                  {itemFormData.type === "EXPENSE" ? (
                    <select
                      name="category"
                      value={
                        itemFormData.isCustomExpense
                          ? "CUSTOM"
                          : itemFormData.category
                      }
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      required
                    >
                      <option value="">Wybierz kategorię</option>
                      {expenseCategories.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name} (VAT: {cat.vatRate}%)
                        </option>
                      ))}
                      <option value="CUSTOM">Wydatek niestandardowy</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="category"
                      value={itemFormData.category}
                      onChange={handleInputChange}
                      placeholder="np. Booking.com, Airbnb"
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      required
                    />
                  )}
                  {itemFormData.category &&
                    itemFormData.type === "EXPENSE" &&
                    !itemFormData.isCustomExpense && (
                      <p className="mt-1 text-xs text-gray-500">
                        {
                          expenseCategories.find(
                            (cat) => cat.name === itemFormData.category,
                          )?.description
                        }
                      </p>
                    )}
                </div>

                {/* Pola dla niestandardowego wydatku */}
                {itemFormData.isCustomExpense &&
                  itemFormData.type === "EXPENSE" && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nazwa wydatku
                        </label>
                        <input
                          type="text"
                          name="customExpenseName"
                          value={itemFormData.customExpenseName}
                          onChange={handleInputChange}
                          placeholder="np. Zakup wyposażenia"
                          className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Stawka VAT
                        </label>
                        <select
                          name="customVatRate"
                          value={itemFormData.customVatRate}
                          onChange={handleInputChange}
                          className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        >
                          <option value={0}>Brak VAT (0%)</option>
                          <option value={8}>VAT 8%</option>
                          <option value={23}>VAT 23%</option>
                        </select>
                      </div>
                    </>
                  )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Opis
                  </label>
                  <input
                    type="text"
                    name="description"
                    value={itemFormData.description}
                    onChange={handleInputChange}
                    placeholder="Szczegółowy opis pozycji"
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  />
                </div>

                {itemFormData.type === "EXPENSE" &&
                ((itemFormData.category &&
                  expenseCategories.find(
                    (cat) => cat.name === itemFormData.category,
                  )) ||
                  itemFormData.isCustomExpense) ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Kwota netto (PLN)
                      </label>
                      <input
                        type="number"
                        name="netAmount"
                        value={itemFormData.netAmount}
                        onChange={handleInputChange}
                        step="0.01"
                        min="0"
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        VAT (
                        {itemFormData.isCustomExpense
                          ? itemFormData.customVatRate
                          : expenseCategories.find(
                              (cat) => cat.name === itemFormData.category,
                            )?.vatRate}
                        %):{" "}
                        {itemFormData.isCustomExpense
                          ? (
                              (itemFormData.netAmount *
                                itemFormData.customVatRate) /
                              100
                            ).toFixed(2)
                          : (
                              (itemFormData.netAmount *
                                (expenseCategories.find(
                                  (cat) => cat.name === itemFormData.category,
                                )?.vatRate ?? 0)) /
                              100
                            ).toFixed(2)}{" "}
                        PLN
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Kwota brutto (PLN)
                      </label>
                      <input
                        type="number"
                        name="amount"
                        value={itemFormData.amount}
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 px-3 py-2 shadow-sm"
                        readOnly
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Automatycznie obliczona z kwoty netto + VAT
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Kwota (PLN)
                    </label>
                    <input
                      type="number"
                      name="amount"
                      value={itemFormData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Data
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={itemFormData.date}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Notatki (opcjonalne)
                  </label>
                  <textarea
                    name="notes"
                    value={itemFormData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    placeholder="Dodatkowe informacje..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddItemForm(false)}
                    className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={addItemMutation.isPending}
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700"
                  >
                    {addItemMutation.isPending ? "Dodawanie..." : "Dodaj"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Komponent sekcji sugerowanych prowizji
function SuggestedCommissionsSection({
  suggestions,
  onAddCommission,
  loadingIndex,
}: {
  suggestions: Array<{
    type: "COMMISSION";
    category: string;
    description: string;
    date: Date;
    notes: string;
    totalRevenue?: number;
  }>;
  onAddCommission: (
    suggestion: {
      type: "COMMISSION";
      category: string;
      description: string;
      amount: number;
      date: Date;
      notes: string;
      totalRevenue?: number;
    },
    index: number,
  ) => Promise<void>;
  loadingIndex: number | null;
}) {
  const [percentages, setPercentages] = useState<Record<string, string>>({});

  useEffect(() => {
    const defaultPercentages: Record<string, string> = {};
    suggestions.forEach((suggestion) => {
      const categoryLower = suggestion.category.toLowerCase();
      if (categoryLower === "airbnb") {
        defaultPercentages[suggestion.category] = "15";
      } else if (categoryLower.startsWith("booking")) {
        defaultPercentages[suggestion.category] = "12";
      }
    });
    setPercentages((prev) => ({ ...defaultPercentages, ...prev }));
  }, [suggestions]);

  const handlePercentageChange = (channel: string, value: string) => {
    setPercentages((prev) => ({ ...prev, [channel]: value }));
  };

  const calculateCommissionAmount = (
    totalRevenue: number,
    percentage: number,
    channel: string,
  ): number => {
    const categoryLower = channel.toLowerCase();
    const commission = (totalRevenue * percentage) / 100;

    if (categoryLower === "airbnb") {
      return commission * 1.23; // Dodaj 23% VAT
    }

    if (categoryLower.startsWith("booking")) {
      const transactionFee = totalRevenue * 0.016; // 1.6% opłaty transakcyjnej
      return commission + transactionFee;
    }

    return commission;
  };

  const handleAddClick = (
    suggestion: {
      type: "COMMISSION";
      category: string;
      description: string;
      date: Date;
      notes: string;
      totalRevenue?: number;
    },
    index: number,
  ) => {
    const percentage = parseFloat(percentages[suggestion.category] ?? "0");
    if (!isNaN(percentage) && percentage > 0 && suggestion.totalRevenue) {
      const amount = calculateCommissionAmount(
        suggestion.totalRevenue,
        percentage,
        suggestion.category,
      );

      let notes = `${suggestion.notes} - ${percentage}% od ${suggestion.totalRevenue.toFixed(2)} PLN`;
      const categoryLower = suggestion.category.toLowerCase();

      if (categoryLower === "airbnb") {
        const commissionNet = (suggestion.totalRevenue * percentage) / 100;
        const vat = commissionNet * 0.23;
        notes = `Prowizja Airbnb (netto): ${commissionNet.toFixed(2)} PLN (${percentage}%) + VAT (23%): ${vat.toFixed(2)} PLN.`;
      } else if (categoryLower.startsWith("booking")) {
        const commissionGross = amount;
        const commissionNet = commissionGross / 1.08;
        const vat = commissionGross - commissionNet;
        const standardCommissionValue =
          (suggestion.totalRevenue * percentage) / 100;
        const transactionFeeValue = suggestion.totalRevenue * 0.016;
        notes = `Prowizja Booking (brutto): ${commissionGross.toFixed(2)} PLN. Składowe: Prowizja (${percentage}%): ${standardCommissionValue.toFixed(2)} PLN + Opłata transakcyjna (1.6%): ${transactionFeeValue.toFixed(2)} PLN. W kwocie brutto zawarty jest VAT (8%): ${vat.toFixed(2)} PLN. Kwota netto: ${commissionNet.toFixed(2)} PLN.`;
      }

      void onAddCommission(
        {
          ...suggestion,
          amount,
          notes: notes,
        },
        index,
      );
    }
  };

  return (
    <div className="mb-6 overflow-hidden rounded-lg bg-blue-50 shadow">
      <div className="px-6 py-4">
        <h3 className="flex items-center text-lg font-medium text-blue-900">
          <svg
            className="mr-2 h-5 w-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Sugerowane Prowizje
        </h3>
        <p className="mt-1 text-sm text-blue-700">
          Wprowadź procent prowizji od sumy przychodów z każdego kanału:
        </p>
      </div>
      <div className="border-t border-blue-200 bg-white">
        <div className="divide-y divide-gray-200">
          {suggestions.map((suggestion, index) => {
            const categoryLower = suggestion.category.toLowerCase();
            const isAirbnb = categoryLower === "airbnb";
            const isBooking = categoryLower.startsWith("booking");

            const percentage = parseFloat(
              percentages[suggestion.category] ?? "0",
            );
            const calculatedAmount =
              suggestion.totalRevenue && percentage > 0
                ? calculateCommissionAmount(
                    suggestion.totalRevenue,
                    percentage,
                    suggestion.category,
                  )
                : 0;
            const transactionFeeDisplay =
              isBooking && suggestion.totalRevenue
                ? suggestion.totalRevenue * 0.016
                : 0;

            return (
              <div
                key={index}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <svg
                        className="h-4 w-4 text-blue-600"
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
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        Prowizja - {suggestion.category}
                      </p>
                      <p className="text-sm text-gray-500">
                        Przychód z kanału: {suggestion.totalRevenue?.toFixed(2)}{" "}
                        PLN
                      </p>
                      {transactionFeeDisplay > 0 && (
                        <p className="text-sm text-gray-500">
                          Opłata transakcyjna (1.6%):{" "}
                          {transactionFeeDisplay.toFixed(2)} PLN
                        </p>
                      )}
                      {calculatedAmount > 0 && (
                        <p className="text-sm font-medium text-blue-600">
                          Prowizja (brutto): {calculatedAmount.toFixed(2)} PLN
                          {isAirbnb && " (z 23% VAT)"}
                          {isBooking &&
                            " (z wliczonym 8% VAT i opłatą transakcyjną 1.6%)"}
                        </p>
                      )}
                      {isAirbnb && (
                        <p className="text-xs italic text-gray-500">
                          Rabat 10% + 23% VAT
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <input
                      type="number"
                      placeholder="15"
                      step="0.1"
                      min="0"
                      max="100"
                      value={percentages[suggestion.category] ?? ""}
                      onChange={(e) =>
                        handlePercentageChange(
                          suggestion.category,
                          e.target.value,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddClick(suggestion, index);
                        }
                      }}
                      className="w-16 rounded-md border-gray-300 px-2 py-1 text-sm"
                      disabled={loadingIndex === index}
                    />
                    <span className="ml-1 text-sm text-gray-500">%</span>
                  </div>
                  <button
                    onClick={() => handleAddClick(suggestion, index)}
                    disabled={
                      loadingIndex === index ||
                      !percentages[suggestion.category] ||
                      parseFloat(percentages[suggestion.category] ?? "0") <=
                        0 ||
                      !suggestion.totalRevenue
                    }
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-blue-700"
                  >
                    {loadingIndex === index ? (
                      <>
                        <svg
                          className="mr-1 h-3 w-3 animate-spin text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Dodawanie...
                      </>
                    ) : (
                      "Dodaj"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SummaryField = ({
  label,
  value,
  isLoading,
  loadingValue,
  subtext,
  color = "gray",
  isPayout = false,
}: {
  label: string;
  value: string;
  isLoading?: boolean;
  loadingValue?: string;
  subtext?: React.ReactNode;
  color?: "green" | "blue" | "gray" | "red";
  isPayout?: boolean;
}) => {
  const colorClasses = {
    green: {
      bg: "bg-green-100",
      text: "text-green-700",
      valueText: "text-green-900",
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-700",
      valueText: "text-blue-900",
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-700",
      valueText: "text-gray-900",
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-700",
      valueText: "text-red-900",
    },
  };

  const selectedColor = colorClasses[color];
  // Zmniejsz czcionkę o połowę gdy wartość prezentuje rozbicie netto + VAT = brutto
  const isVatBreakdown =
    isPayout && (value.includes(" + ") || value.includes("="));
  // Jeszcze mniejsze o ~25% względem poprzedniego: z text-xl na text-lg
  const sizeClass = isPayout
    ? isVatBreakdown
      ? "text-lg"
      : "text-2xl"
    : "text-lg";

  return (
    <div className={`rounded-md ${selectedColor.bg} p-3`}>
      <p className={`text-sm ${selectedColor.text}`}>{label}</p>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center space-y-2 py-4">
          <Spinner />
          <p className="text-sm font-medium">
            {loadingValue ?? "Przeliczanie..."}
          </p>
        </div>
      ) : (
        <p className={`font-bold ${selectedColor.valueText} ${sizeClass}`}>
          {value}
        </p>
      )}
      {subtext && !isLoading && (
        <div className="text-xs text-gray-600">{subtext}</div>
      )}
    </div>
  );
};

// Nowy komponent do obliczania i wyświetlania rozliczenia z właścicielem
enum LocalPayoutType {
  FIXED_AMOUNT = "FIXED_AMOUNT",
  FIXED_AMOUNT_MINUS_UTILITIES = "FIXED_AMOUNT_MINUS_UTILITIES",
  COMMISSION = "COMMISSION",
}

const PayoutOption = ({
  id,
  label,
  payoutType,
  finalPayoutType,
  handleFinalPayoutTypeChange,
  isSelected,
  children,
  color = "green",
  isDisabled = false,
  disabledTitle,
}: {
  id: string;
  label: string;
  payoutType: LocalPayoutType;
  finalPayoutType: LocalPayoutType;
  handleFinalPayoutTypeChange: (type: LocalPayoutType) => void;
  isSelected: boolean;
  children: React.ReactNode;
  color?: "green" | "blue";
  isDisabled?: boolean;
  disabledTitle?: string;
}) => {
  const colorClasses = {
    green: {
      radio: "border-green-300 text-green-600 focus:ring-green-500",
      label: "text-green-800",
      badge: "bg-green-200 text-green-900",
      bg: "bg-green-50",
    },
    blue: {
      radio: "border-blue-300 text-blue-600 focus:ring-blue-500",
      label: "text-blue-800",
      badge: "bg-blue-200 text-blue-900",
      bg: "bg-blue-50",
    },
  };

  const selectedColor = colorClasses[color];

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg ${selectedColor.bg} p-4`}
      title={isDisabled ? disabledTitle : undefined}
    >
      <div
        className="mb-2 flex items-center gap-2"
        title={isDisabled ? disabledTitle : undefined}
      >
        <input
          type="radio"
          id={id}
          name="final-payout-type"
          checked={finalPayoutType === payoutType}
          onChange={() => handleFinalPayoutTypeChange(payoutType)}
          disabled={isDisabled}
          className={`h-4 w-4 ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${selectedColor.radio}`}
          title={isDisabled ? disabledTitle : ""}
        />
        <label
          htmlFor={id}
          className={`text-lg font-semibold ${isDisabled ? "cursor-not-allowed opacity-50" : ""} ${selectedColor.label}`}
          title={isDisabled ? disabledTitle : undefined}
        >
          {label}
        </label>
        {isSelected && (
          <span
            className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${selectedColor.badge}`}
          >
            Wybrano jako ostateczne
          </span>
        )}
      </div>
      {children}
    </div>
  );
};

function OwnerPayoutCalculation({
  report,
  onRefetch,
  _additionalDeductionData,
  _onDeleteDeduction,
  _onEditDeduction,
  sortedDeductions,
}: {
  report: ReportDetails;
  onRefetch: () => void;
  _additionalDeductionData: {
    name: string;
    amount: number;
    vatOption: VATOption;
  };
  _onDeleteDeduction: (deductionId: string) => Promise<void>;
  _onEditDeduction: (deduction: DeductionItem) => void;
  sortedDeductions: DeductionItem[];
}) {
  // Sprawdź czy właściciel jest zwolniony z VAT
  const isVatExempt = report.owner.vatOption === VATOption.NO_VAT;
  const isReportSent = report.status === ReportStatus.SENT;
  const [deductRentAndUtilities] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [finalPayoutType, setFinalPayoutType] = React.useState<LocalPayoutType>(
    () => {
      if (report.finalSettlementType === "FIXED") {
        return LocalPayoutType.FIXED_AMOUNT;
      } else if (report.finalSettlementType === "FIXED_MINUS_UTILITIES") {
        return LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES;
      } else {
        return LocalPayoutType.COMMISSION;
      }
    },
  );

  // Referencje do wartości przed mutacją - używane do monitorowania zmian
  const previousValuesRef = React.useRef({
    finalOwnerPayout: report.finalOwnerPayout,
    finalHostPayout: report.finalHostPayout,
    finalIncomeTax: (report as ReportDetails & { finalIncomeTax?: number })
      .finalIncomeTax,
    taxBase: report.taxBase,
    totalRevenue: report.totalRevenue,
    totalExpenses: report.totalExpenses,
    netIncome: report.netIncome,
    adminCommissionAmount: report.adminCommissionAmount,
    afterCommission: report.afterCommission,
    afterRentAndUtilities: report.afterRentAndUtilities,
    totalAdditionalDeductions: report.totalAdditionalDeductions,
  });

  // Funkcja do sprawdzania zmian po refetch
  // Wyodrębnij finalIncomeTax do osobnej zmiennej dla dependency array
  const currentFinalIncomeTax = (
    report as ReportDetails & { finalIncomeTax?: number }
  ).finalIncomeTax;

  // State do śledzenia poprzedniego typu rozliczenia
  const [previousSettlementType, setPreviousSettlementType] = React.useState(
    report.finalSettlementType,
  );

  // useEffect do aktualizacji poprzedniego typu rozliczenia
  React.useEffect(() => {
    if (report.finalSettlementType !== previousSettlementType) {
      setPreviousSettlementType(report.finalSettlementType);
    }
  }, [report.finalSettlementType, previousSettlementType]);

  // useEffect do inicjalizacji previousValuesRef gdy komponent się zamontuje
  React.useEffect(() => {
    // Zainicjalizuj referencje z aktualnymi wartościami
    previousValuesRef.current = {
      finalOwnerPayout: report.finalOwnerPayout,
      finalHostPayout: report.finalHostPayout,
      finalIncomeTax: currentFinalIncomeTax,
      taxBase: report.taxBase,
      totalRevenue: report.totalRevenue,
      totalExpenses: report.totalExpenses,
      netIncome: report.netIncome,
      adminCommissionAmount: report.adminCommissionAmount,
      afterCommission: report.afterCommission,
      afterRentAndUtilities: report.afterRentAndUtilities,
      totalAdditionalDeductions: report.totalAdditionalDeductions,
    };
  }, [
    report.finalOwnerPayout,
    report.finalHostPayout,
    currentFinalIncomeTax,
    report.taxBase,
    report.totalRevenue,
    report.totalExpenses,
    report.netIncome,
    report.adminCommissionAmount,
    report.afterCommission,
    report.afterRentAndUtilities,
    report.totalAdditionalDeductions,
  ]);

  // Mutacja do zapisywania finalSettlementType
  const setFinalSettlementTypeMutation =
    api.monthlyReports.setFinalSettlementType.useMutation({
      onSuccess: () => {
        // Tylko odśwież dane bez ustawiania loaderów
        onRefetch();
      },
      onError: (error) => {
        console.error("Error saving final settlement type:", error);
        // Revert the state change if save failed
        setFinalPayoutType(
          report.finalSettlementType === "FIXED"
            ? LocalPayoutType.FIXED_AMOUNT
            : report.finalSettlementType === "FIXED_MINUS_UTILITIES"
              ? LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES
              : LocalPayoutType.COMMISSION,
        );
        // Błąd zapisu - nie ma potrzeby ustawiania loaderów
      },
    });

  // Funkcja do zapisywania wybranego typu rozliczenia
  const handleFinalPayoutTypeChange = async (newType: LocalPayoutType) => {
    // Natychmiast aktualizuj lokalny stan dla lepszej responsywności
    setFinalPayoutType(newType);

    // Mapuj lokalny typ na typ z bazy danych
    let settlementType: "COMMISSION" | "FIXED" | "FIXED_MINUS_UTILITIES";
    switch (newType) {
      case LocalPayoutType.FIXED_AMOUNT:
        settlementType = "FIXED";
        break;
      case LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES:
        settlementType = "FIXED_MINUS_UTILITIES";
        break;
      case LocalPayoutType.COMMISSION:
      default:
        settlementType = "COMMISSION";
        break;
    }

    try {
      // Oznacz ręczną zmianę, aby logika auto-dopasowania nie nadpisała wyboru
      if (typeof window !== "undefined") {
        window.__manualSettlementChange = true;
      }
      // Wykonaj mutację i poczekaj na zakończenie, następnie odśwież dane
      await setFinalSettlementTypeMutation.mutateAsync({
        reportId: report.id,
        finalSettlementType: settlementType,
      });
      // Odśwież dane raportu po zmianie typu rozliczenia
      onRefetch();
    } catch (error) {
      console.error("Error saving final settlement type:", error);
      // Revert the state change if save failed
      setFinalPayoutType(
        report.finalSettlementType === "FIXED"
          ? LocalPayoutType.FIXED_AMOUNT
          : report.finalSettlementType === "FIXED_MINUS_UTILITIES"
            ? LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES
            : LocalPayoutType.COMMISSION,
      );
    } finally {
      // Po krótkim czasie zdejmij flagę ręcznej zmiany
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.__manualSettlementChange = false;
        }, 500);
      }
    }
  };

  // Funkcja do odświeżania z loaderem
  const handleRefresh = () => {
    setIsRefreshing(true);
    try {
      onRefetch();
    } finally {
      // Ukryj loader po 1 sekundzie żeby użytkownik widział że coś się dzieje
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  // Suma dodatkowych odliczeń (netto) - używana tylko w totalAdditionalDeductionsGross

  // Suma dodatkowych odliczeń (brutto)
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

  // Kwota stała z umowy (po odjęciu dodatkowych odliczeń)
  const fixedBaseAmount = Number(report.apartment.fixedPaymentAmount ?? 0);
  const fixedBaseAmountAfterDeductions =
    fixedBaseAmount - totalAdditionalDeductionsGross;

  // Zysk procentowy (po prowizji admina i odjęciu czynszu/mediów)
  const adminCommissionRate = 0.25; // 25%
  const adminCommissionAmount = report.netIncome * adminCommissionRate;
  const netIncomeAfterAdminCommission =
    report.netIncome - adminCommissionAmount;
  const rentAndUtilities =
    (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);

  // Nowe: jeśli nie potrącamy czynszu i mediów, nie odejmujemy ich od kwoty do wypłaty
  const netIncomeAfterRentAndUtilities = deductRentAndUtilities
    ? netIncomeAfterAdminCommission - rentAndUtilities
    : netIncomeAfterAdminCommission;

  // Kwota po odjęciu dodatkowych odliczeń (odejmujemy kwoty brutto)
  const netIncomeAfterAllDeductions =
    netIncomeAfterRentAndUtilities - totalAdditionalDeductionsGross;

  const kwotaBazowaNetto =
    fixedBaseAmount - rentAndUtilities - totalAdditionalDeductionsGross;

  // NOWE: Obliczanie kwot w podsumowaniu na podstawie wybranego typu rozliczenia
  const getSummaryValues = React.useCallback(() => {
    const isVatExemptLocal = report.owner.vatOption === "NO_VAT";
    switch (finalPayoutType) {
      case LocalPayoutType.FIXED_AMOUNT:
        // Kwota stała: właściciel dostaje ustaloną kwotę, administrator dopłaca różnicę jeśli potrzeba
        // Podstawa opodatkowania = kwota stała (NETTO), dodatkowe odliczenia NIE wpływają na podstawę
        const fixedTaxBase = fixedBaseAmount;
        const ownerPayoutFixed = Math.max(0, fixedBaseAmountAfterDeductions);
        // W trybach z kwotą stałą „Prowizja Złote Wynajmy” to różnica między zyskiem netto a kwotą stałą z umowy
        // (może być ujemna – wtedy oznacza dopłatę administratora)
        const hostPayoutFixed = report.netIncome - fixedBaseAmount;

        const fixedOwnerPayout = isVatExemptLocal
          ? ownerPayoutFixed
          : getGrossAmount(ownerPayoutFixed, report.owner.vatOption);

        return {
          finalOwnerPayout: fixedOwnerPayout,
          finalHostPayout: hostPayoutFixed, // Może być ujemne (administrator dopłaca)
          finalIncomeTax: fixedTaxBase * 0.085,
          taxBase: fixedTaxBase,
        };

      case LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES:
        // Kwota stała po mediach: Podstawa opodatkowania = kwota stała - (czynsz + media), bez dodatkowych odliczeń
        const fixedMinusUtilitiesTaxBase = Math.max(
          0,
          fixedBaseAmount - rentAndUtilities,
        );
        const ownerPayoutFixedMinusUtilities = Math.max(0, kwotaBazowaNetto);
        // „Prowizja Złote Wynajmy” = zysk netto - kwota stała z umowy (niezależnie od potrąceń mediów)
        const hostPayoutFixedMinusUtilities =
          report.netIncome - fixedBaseAmount;

        const fixedMinusUtilitiesOwnerPayout = isVatExemptLocal
          ? ownerPayoutFixedMinusUtilities
          : getGrossAmount(
              ownerPayoutFixedMinusUtilities,
              report.owner.vatOption,
            );

        return {
          finalOwnerPayout: fixedMinusUtilitiesOwnerPayout,
          finalHostPayout: hostPayoutFixedMinusUtilities, // Może być ujemne (administrator dopłaca)
          finalIncomeTax: fixedMinusUtilitiesTaxBase * 0.085,
          taxBase: fixedMinusUtilitiesTaxBase,
        };

      case LocalPayoutType.COMMISSION:
      default:
        // Podstawa opodatkowania = "Kwota po prowizji Złote Wynajmy" (netto po prowizji admina)
        // Nie odejmujemy czynszu, mediów ani dodatkowych odliczeń
        const commissionTaxBase = netIncomeAfterAdminCommission;
        const commissionOwnerPayout = isVatExemptLocal
          ? netIncomeAfterAllDeductions
          : getGrossAmount(netIncomeAfterAllDeductions, report.owner.vatOption);

        return {
          finalOwnerPayout: commissionOwnerPayout, // DO WYPŁATY (brutto jeśli VAT)
          finalHostPayout: adminCommissionAmount, // Prowizja admina
          finalIncomeTax: commissionTaxBase * 0.085, // 8.5% podatku
          taxBase: commissionTaxBase,
        };
    }
  }, [
    report.owner.vatOption,
    report.netIncome,
    finalPayoutType,
    fixedBaseAmount,
    fixedBaseAmountAfterDeductions,
    kwotaBazowaNetto,
    netIncomeAfterAdminCommission,
    netIncomeAfterAllDeductions,
    rentAndUtilities,
    adminCommissionAmount,
  ]);

  // Wartości podsumowania są obliczane w getSummaryValues() i używane bezpośrednio

  // =========================
  // Niestandardowe podsumowanie – stan lokalny i mutacja
  // =========================
  const setCustomSummaryMutation =
    api.monthlyReports.setCustomSummary.useMutation({
      onSuccess: async () => {
        toast.success("Zapisano niestandardowe podsumowanie");
        // Jeśli włączono niestandardowe wartości – ustaw rozliczenie prowizyjne (lokalnie i w bazie) zanim odświeżymy dane
        if (customEnabled && finalPayoutType !== LocalPayoutType.COMMISSION) {
          setFinalPayoutType(LocalPayoutType.COMMISSION);
          await handleFinalPayoutTypeChange(LocalPayoutType.COMMISSION);
        }
        // Odśwież dane po ewentualnej zmianie typu rozliczenia
        onRefetch();
        setIsCustomDirty(false);
        // Natychmiast pokaż zapisaną notatkę w widoku tylko do odczytu
        setSavedCustomNote(
          Boolean(customEnabled) ? (customNote ?? "").trim() : "",
        );
      },
      onError: (err) => {
        toast.error(`Błąd zapisu: ${err.message}`);
      },
    });

  // Stabilizujemy dependencies, aby nie zmieniały rozmiaru (bez funkcji w tablicy)
  const initialSummary = React.useMemo(
    () => getSummaryValues(),
    [getSummaryValues],
  );
  const [showCustomEditor, setShowCustomEditor] = React.useState(false);
  const reportWithCustom = report as ReportWithCustom;
  const [customEnabled, setCustomEnabled] = React.useState<boolean>(
    Boolean(reportWithCustom.customSummaryEnabled ?? false),
  );
  const [customTaxBase, setCustomTaxBase] = React.useState<number | "">(
    Number(reportWithCustom.customTaxBase ?? initialSummary.taxBase ?? 0),
  );
  const [customOwnerPayout, setCustomOwnerPayout] = React.useState<number | "">(
    Number(
      reportWithCustom.customOwnerPayout ??
        initialSummary.finalOwnerPayout ??
        0,
    ),
  );
  const [customHostPayout, setCustomHostPayout] = React.useState<number | "">(
    Number(
      reportWithCustom.customHostPayout ?? initialSummary.finalHostPayout ?? 0,
    ),
  );
  const [customIncomeTax, setCustomIncomeTax] = React.useState<number | "">(
    Number(
      reportWithCustom.customIncomeTax ?? initialSummary.finalIncomeTax ?? 0,
    ),
  );
  const [customNote, setCustomNote] = React.useState<string>(
    (reportWithCustom as ReportWithCustom & { customSummaryNote?: string })
      .customSummaryNote ?? "",
  );
  // Notatka zapisana – do wyświetlania pod podsumowaniem bez odświeżania
  const [savedCustomNote, setSavedCustomNote] = React.useState<string>(
    (
      (reportWithCustom as ReportWithCustom & { customSummaryNote?: string })
        .customSummaryNote ?? ""
    ).trim(),
  );
  const [isCustomDirty, setIsCustomDirty] = React.useState(false);

  React.useEffect(() => {
    // Aktualizuj stan przy zmianie raportu
    const nextInitial = getSummaryValues();
    const r = report as ReportWithCustom;
    setCustomEnabled(Boolean(r.customSummaryEnabled ?? false));
    setCustomTaxBase(Number(r.customTaxBase ?? nextInitial.taxBase ?? 0));
    setCustomOwnerPayout(
      Number(r.customOwnerPayout ?? nextInitial.finalOwnerPayout ?? 0),
    );
    setCustomHostPayout(
      Number(r.customHostPayout ?? nextInitial.finalHostPayout ?? 0),
    );
    setCustomIncomeTax(
      Number(r.customIncomeTax ?? nextInitial.finalIncomeTax ?? 0),
    );
    setSavedCustomNote(
      (
        (r as ReportWithCustom & { customSummaryNote?: string })
          .customSummaryNote ?? ""
      ).trim(),
    );
    setIsCustomDirty(false);
  }, [
    report,
    report?.id,
    finalPayoutType,
    deductRentAndUtilities,
    getSummaryValues,
  ]);

  // Ochrona przed przypadkowym opuszczeniem strony
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isCustomDirty) {
        e.preventDefault();
        e.returnValue = "Masz niezapisane zmiany";
        return "Masz niezapisane zmiany";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isCustomDirty]);

  // Udostępnij globalnie, aby rodzic mógł wyświetlić modal i zapisać
  React.useEffect(() => {
    window.__customSummaryDirty = isCustomDirty;
    window.__getCustomSummaryDraft = () => ({
      enabled: customEnabled,
      taxBase: Number(customTaxBase || 0),
      ownerPayout: Number(customOwnerPayout || 0),
      hostPayout: Number(customHostPayout || 0),
      incomeTax: Number(customIncomeTax || 0),
    });
    window.__saveCustomSummary = async () => {
      await setCustomSummaryMutation.mutateAsync({
        reportId: report.id,
        enabled: Boolean(customEnabled),
        taxBase: customEnabled ? Number(customTaxBase || 0) : null,
        ownerPayout: customEnabled ? Number(customOwnerPayout || 0) : null,
        hostPayout: customEnabled ? Number(customHostPayout || 0) : null,
        incomeTax: customEnabled ? Number(customIncomeTax || 0) : null,
        note: customEnabled ? customNote : null,
      });
    };
    return () => {
      delete window.__customSummaryDirty;
      delete window.__getCustomSummaryDraft;
      delete window.__saveCustomSummary;
    };
  }, [
    isCustomDirty,
    customEnabled,
    customTaxBase,
    customOwnerPayout,
    customHostPayout,
    customIncomeTax,
    report?.id,
    setCustomSummaryMutation,
    customNote,
  ]);

  return (
    <div className="space-y-6">
      {/* Przycisk przeliczania z loaderem */}
      <div className="mb-4">
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isReportSent}
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-blue-700"
        >
          {isRefreshing ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Przeliczanie...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Przelicz podsumowanie
            </>
          )}
        </button>

        {/* Progress bar podczas odświeżania */}
        {isRefreshing && (
          <div className="mt-2">
            <div className="h-2 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full animate-pulse rounded-full bg-blue-600"
                style={{ width: "100%" }}
              ></div>
            </div>
            <p className="mt-1 text-sm text-gray-600">Odświeżanie danych...</p>
          </div>
        )}
      </div>

      {/* Zawsze pokazuj 3 opcje rozliczenia */}
      <PayoutOption
        id="final-commission"
        label="Rozliczenie właściciela: prowizyjne"
        payoutType={LocalPayoutType.COMMISSION}
        finalPayoutType={finalPayoutType}
        handleFinalPayoutTypeChange={handleFinalPayoutTypeChange}
        isSelected={finalPayoutType === LocalPayoutType.COMMISSION}
        color="blue"
        isDisabled={isReportSent || customEnabled}
        disabledTitle={
          isReportSent
            ? "Raport został wysłany i nie można go edytować. Jedynym rozwiązaniem jest usunięcie raportu."
            : customEnabled
              ? 'Opcje rozliczenia są zablokowane, ponieważ używasz niestandardowych wartości. Aby wrócić do standardowego sposobu liczenia, odznacz "Użyj niestandardowych wartości w podsumowaniu" i zapisz.'
              : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryField
            label={`Kwota po prowizji Złote Wynajmy ${!isVatExempt ? "(netto)" : ""}`}
            value={`${netIncomeAfterAdminCommission.toFixed(2)} PLN`}
            color="blue"
          />
          <SummaryField
            label={`Kwota bazowa ${!isVatExempt ? "(netto)" : ""}`}
            value={`${netIncomeAfterAllDeductions.toFixed(2)} PLN`}
            subtext={
              <span className="block text-xs text-blue-600">
                (po odliczeniu czynszu: {(report.rentAmount ?? 0).toFixed(2)}{" "}
                PLN + mediów: {(report.utilitiesAmount ?? 0).toFixed(2)} PLN +
                dodatkowych odliczeń:{" "}
                {totalAdditionalDeductionsGross.toFixed(2)} PLN brutto ={" "}
                {(
                  (report.rentAmount ?? 0) +
                  (report.utilitiesAmount ?? 0) +
                  totalAdditionalDeductionsGross
                ).toFixed(2)}{" "}
                PLN)
              </span>
            }
            color="blue"
          />
          {!isVatExempt && (
            <SummaryField
              label="VAT"
              value={`${getVatAmount(netIncomeAfterAllDeductions, report.owner.vatOption).toFixed(2)} PLN (${report.owner.vatOption === "VAT_8" ? "8" : "23"}%)`}
              color="blue"
            />
          )}
          <SummaryField
            label="DO WYPŁATY"
            value={
              isVatExempt
                ? `${netIncomeAfterAllDeductions.toFixed(2)} PLN`
                : `${getGrossAmount(netIncomeAfterAllDeductions, report.owner.vatOption).toFixed(2)} PLN`
            }
            isPayout
            color="blue"
          />
        </div>
      </PayoutOption>

      <PayoutOption
        id="final-fixed"
        label="Rozliczenie właściciela: kwota stała"
        payoutType={LocalPayoutType.FIXED_AMOUNT}
        finalPayoutType={finalPayoutType}
        handleFinalPayoutTypeChange={handleFinalPayoutTypeChange}
        isSelected={finalPayoutType === LocalPayoutType.FIXED_AMOUNT}
        color="green"
        isDisabled={isReportSent || customEnabled}
        disabledTitle={
          isReportSent
            ? "Raport został wysłany i nie można go edytować. Jedynym rozwiązaniem jest usunięcie raportu."
            : customEnabled
              ? 'Opcje rozliczenia są zablokowane, ponieważ używasz niestandardowych wartości. Aby wrócić do standardowego sposobu liczenia, odznacz "Użyj niestandardowych wartości w podsumowaniu" i zapisz.'
              : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryField
            label={`Kwota bazowa ${!isVatExempt ? "(netto)" : ""}`}
            value={`${fixedBaseAmountAfterDeductions.toFixed(2)} PLN`}
            subtext={
              <span>
                (kwota stała: {fixedBaseAmount.toFixed(2)} PLN
                {totalAdditionalDeductionsGross > 0 && (
                  <>
                    {" "}
                    – odliczenia: {totalAdditionalDeductionsGross.toFixed(
                      2,
                    )}{" "}
                    PLN brutto
                  </>
                )}
                {" = "}
                {fixedBaseAmountAfterDeductions.toFixed(2)} PLN)
              </span>
            }
            color="green"
          />
          {!isVatExempt && (
            <SummaryField
              label="VAT"
              value={`${getVatAmount(fixedBaseAmountAfterDeductions, report.owner.vatOption).toFixed(2)} PLN (${report.owner.vatOption === "VAT_8" ? "8" : "23"}%)`}
              color="green"
            />
          )}
          <SummaryField
            label="DO WYPŁATY"
            value={
              isVatExempt
                ? `${fixedBaseAmountAfterDeductions.toFixed(2)} PLN`
                : `${getGrossAmount(fixedBaseAmountAfterDeductions, report.owner.vatOption).toFixed(2)} PLN`
            }
            isPayout
            color="green"
          />
        </div>
      </PayoutOption>

      <PayoutOption
        id="final-fixed-minus-utilities"
        label="Rozliczenie właściciela: kwota stała po odliczeniu mediów"
        payoutType={LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES}
        finalPayoutType={finalPayoutType}
        handleFinalPayoutTypeChange={handleFinalPayoutTypeChange}
        isSelected={
          finalPayoutType === LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES
        }
        color="green"
        isDisabled={isReportSent || customEnabled}
        disabledTitle={
          isReportSent
            ? "Raport został wysłany i nie można go edytować. Jedynym rozwiązaniem jest usunięcie raportu."
            : customEnabled
              ? 'Opcje rozliczenia są zablokowane, ponieważ używasz niestandardowych wartości. Aby wrócić do standardowego sposobu liczenia, odznacz "Użyj niestandardowych wartości w podsumowaniu" i zapisz.'
              : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryField
            label={`Kwota bazowa ${!isVatExempt ? "(netto)" : ""}`}
            value={`${kwotaBazowaNetto.toFixed(2)} PLN`}
            subtext={
              <span>
                (kwota stała: {fixedBaseAmount.toFixed(2)} PLN
                {" - czynsz: "}
                {(report.rentAmount ?? 0).toFixed(2)} PLN
                {" - media: "}
                {(report.utilitiesAmount ?? 0).toFixed(2)} PLN
                {totalAdditionalDeductionsGross > 0 && (
                  <>
                    {" - dodatkowe odliczenia: "}
                    {totalAdditionalDeductionsGross.toFixed(2)} PLN brutto
                  </>
                )}
                {" = "}
                {kwotaBazowaNetto.toFixed(2)} PLN)
              </span>
            }
            color="green"
          />
          {!isVatExempt && (
            <SummaryField
              label="VAT"
              value={`${getVatAmount(kwotaBazowaNetto, report.owner.vatOption).toFixed(2)} PLN (${report.owner.vatOption === "VAT_8" ? "8" : "23"}%)`}
              color="green"
            />
          )}
          <SummaryField
            label="DO WYPŁATY"
            value={
              isVatExempt
                ? `${kwotaBazowaNetto.toFixed(2)} PLN`
                : `${getGrossAmount(kwotaBazowaNetto, report.owner.vatOption).toFixed(2)} PLN`
            }
            isPayout
            color="green"
          />
        </div>
      </PayoutOption>

      {/* Sekcja podsumowania z 4 polami */}
      <div className="mt-8 rounded-lg bg-gray-50 p-6">
        <h4 className="mb-4 text-lg font-semibold text-gray-800">
          Podsumowanie rozliczenia
        </h4>
        {customEnabled && (
          <div className="mb-4 flex items-start gap-2 rounded-md bg-orange-100 p-3 text-orange-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
              />
            </svg>
            <p className="text-sm">
              Raport został przeliczony na zasadach indywidualnych opisanych w
              notatce poniżej.
            </p>
          </div>
        )}

        {/* Przycisk i edytor niestandardowego podsumowania */}
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowCustomEditor((v) => !v)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showCustomEditor ? "Ukryj edytor" : "Wprowadź własne parametry"}
          </button>
          {customEnabled && (
            <span className="text-sm text-indigo-700">
              Niestandardowe wartości są włączone
            </span>
          )}
        </div>

        {showCustomEditor && (
          <div className="mb-6 rounded-md border border-indigo-200 bg-white p-4">
            <label className="mb-3 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={customEnabled}
                onChange={(e) => {
                  const next = e.target.checked;
                  setCustomEnabled(next);
                  // Po wyłączeniu niestandardowych wartości przeładuj podsumowanie
                  if (!next) {
                    // Przywróć domyślne rozliczenie prowizyjne lokalnie i w bazie
                    if (finalPayoutType !== LocalPayoutType.COMMISSION) {
                      void handleFinalPayoutTypeChange(
                        LocalPayoutType.COMMISSION,
                      );
                    }
                    // Wyłącz niestandardowe wartości także po stronie serwera i odśwież raport
                    void (async () => {
                      try {
                        await setCustomSummaryMutation.mutateAsync({
                          reportId: report.id,
                          enabled: false,
                          taxBase: null,
                          ownerPayout: null,
                          hostPayout: null,
                          incomeTax: null,
                          note: null,
                        });
                      } finally {
                        onRefetch();
                      }
                    })();
                  }
                  setIsCustomDirty(true);
                }}
              />
              Użyj niestandardowych wartości w podsumowaniu (widoczne dla
              właściciela po wysłaniu)
            </label>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="mb-1 text-sm text-gray-600">
                  Podstawa opodatkowania
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={customTaxBase}
                  onChange={(e) => {
                    setCustomTaxBase(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setIsCustomDirty(true);
                  }}
                  disabled={!customEnabled}
                />
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-600">
                  Wypłata właściciela
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={customOwnerPayout}
                  onChange={(e) => {
                    setCustomOwnerPayout(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setIsCustomDirty(true);
                  }}
                  disabled={!customEnabled}
                />
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-600">
                  Prowizja Złote Wynajmy
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={customHostPayout}
                  onChange={(e) => {
                    setCustomHostPayout(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setIsCustomDirty(true);
                  }}
                  disabled={!customEnabled}
                />
              </div>
              <div>
                <div className="mb-1 text-sm text-gray-600">
                  Podatek dochodowy
                </div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  value={customIncomeTax}
                  onChange={(e) => {
                    setCustomIncomeTax(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                    setIsCustomDirty(true);
                  }}
                  disabled={!customEnabled}
                />
              </div>
            </div>

            {/* Notatka do niestandardowego podsumowania */}
            <div className="mt-6">
              <div className="mb-1 text-sm text-gray-600">Notatka</div>
              <textarea
                className="min-h-[120px] w-full rounded-md border border-gray-300 px-3 py-2"
                value={customNote}
                onChange={(e) => {
                  setCustomNote(e.target.value);
                  setIsCustomDirty(true);
                }}
                placeholder="Opisz indywidualne zasady rozliczenia..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Notatka będzie widoczna dla właściciela w raporcie.
              </p>
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  await setCustomSummaryMutation.mutateAsync({
                    reportId: report.id,
                    enabled: Boolean(customEnabled),
                    taxBase: customEnabled ? Number(customTaxBase || 0) : null,
                    ownerPayout: customEnabled
                      ? Number(customOwnerPayout || 0)
                      : null,
                    hostPayout: customEnabled
                      ? Number(customHostPayout || 0)
                      : null,
                    incomeTax: customEnabled
                      ? Number(customIncomeTax || 0)
                      : null,
                    note: customEnabled ? customNote : null,
                  });
                }}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                disabled={setCustomSummaryMutation.isPending}
              >
                Zapisz
              </button>
              <button
                type="button"
                onClick={() => {
                  const base = getSummaryValues();
                  setCustomTaxBase(base.taxBase ?? 0);
                  setCustomOwnerPayout(base.finalOwnerPayout ?? 0);
                  setCustomHostPayout(base.finalHostPayout ?? 0);
                  setCustomIncomeTax(base.finalIncomeTax ?? 0);
                  setIsCustomDirty(true);
                }}
                className="rounded-md bg-gray-200 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
              >
                Uzupełnij wartości automatyczne
              </button>
            </div>
          </div>
        )}

        {/* Zapisana notatka – widok tylko do odczytu pod podsumowaniem */}
        {(() => {
          const r = report as ReportWithCustom & { customSummaryNote?: string };
          const noteToShow = (
            (typeof savedCustomNote === "string" && savedCustomNote.length > 0
              ? savedCustomNote
              : r.customSummaryNote) ?? ""
          ).trim();
          if (!customEnabled || noteToShow.length === 0) return null;
          return (
            <div className="mb-6 rounded-md border border-orange-200 bg-orange-50 p-4 text-orange-900">
              <div className="mb-2 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  Notatka do niestandardowego rozliczenia
                </span>
              </div>
              <div className="whitespace-pre-wrap break-words text-sm">
                {noteToShow}
              </div>
            </div>
          );
        })()}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(() => {
            const r = report as ReportWithCustom;
            const taxBaseValue: number =
              r.customSummaryEnabled && r.customTaxBase != null
                ? Number(r.customTaxBase)
                : getSummaryValues().taxBase;
            return (
              <SummaryField
                label="Podstawa opodatkowania"
                value={`${taxBaseValue.toFixed(2)} PLN`}
                subtext={
                  !customEnabled
                    ? (() => {
                        const isVat = report.owner.vatOption !== "NO_VAT";
                        if (finalPayoutType === LocalPayoutType.COMMISSION) {
                          // Podstawa = Kwota po prowizji Złote Wynajmy (netto)
                          return (
                            <span className="block text-xs text-gray-600">
                              {isVat ? "(netto) " : ""}Kwota po prowizji:{" "}
                              {netIncomeAfterAdminCommission.toFixed(2)} PLN ={" "}
                              {taxBaseValue.toFixed(2)} PLN
                            </span>
                          );
                        }
                        if (finalPayoutType === LocalPayoutType.FIXED_AMOUNT) {
                          return (
                            <span className="block text-xs text-gray-600">
                              {isVat ? "(netto) " : ""}Kwota stała:{" "}
                              {fixedBaseAmount.toFixed(2)} PLN
                            </span>
                          );
                        }
                        // FIXED_MINUS_UTILITIES
                        return (
                          <span className="block text-xs text-gray-600">
                            {isVat ? "(netto) " : ""}Kwota stała:{" "}
                            {fixedBaseAmount.toFixed(2)} PLN
                            {" - czynsz: "}
                            {(report.rentAmount ?? 0).toFixed(2)} PLN
                            {" - media: "}
                            {(report.utilitiesAmount ?? 0).toFixed(2)} PLN
                            {" = "}
                            {taxBaseValue.toFixed(2)} PLN
                          </span>
                        );
                      })()
                    : undefined
                }
                color="gray"
              />
            );
          })()}
          {(() => {
            const r = report as ReportWithCustom;
            const ownerValue: number =
              r.customSummaryEnabled && r.customOwnerPayout != null
                ? Number(r.customOwnerPayout)
                : getSummaryValues().finalOwnerPayout;
            return (
              <SummaryField
                label="Wypłata właściciela"
                value={(() => {
                  const isVat = report.owner.vatOption !== "NO_VAT";
                  if (!isVat) return `${ownerValue.toFixed(2)} PLN`;
                  const netto =
                    finalPayoutType === LocalPayoutType.COMMISSION
                      ? netIncomeAfterAllDeductions
                      : finalPayoutType === LocalPayoutType.FIXED_AMOUNT
                        ? fixedBaseAmountAfterDeductions
                        : kwotaBazowaNetto;
                  const vat = getVatAmount(netto, report.owner.vatOption);
                  const brutto = netto + vat;
                  return `${netto.toFixed(2)} PLN + ${vat.toFixed(2)} PLN = ${brutto.toFixed(2)} PLN`;
                })()}
                isPayout
                color="green"
                subtext={
                  !customEnabled
                    ? (() => {
                        if (report.owner.vatOption === "NO_VAT") return null;
                        return (
                          <span className="text-xs text-gray-600">
                            (netto + VAT = brutto)
                          </span>
                        );
                      })()
                    : undefined
                }
              />
            );
          })()}
          {(() => {
            const r = report as ReportWithCustom;
            const hostValue: number =
              r.customSummaryEnabled && r.customHostPayout != null
                ? Number(r.customHostPayout)
                : getSummaryValues().finalHostPayout;
            return (
              <SummaryField
                label="Prowizja Złote Wynajmy"
                value={`${hostValue.toFixed(2)} PLN`}
                color={hostValue < 0 ? "red" : "blue"}
                subtext={
                  !customEnabled
                    ? hostValue < 0
                      ? "Zarządca dopłaca różnicę w kwocie stałej!"
                      : undefined
                    : undefined
                }
              />
            );
          })()}
          {(() => {
            const r = report as ReportWithCustom;
            const taxValue: number =
              r.customSummaryEnabled && r.customIncomeTax != null
                ? Number(r.customIncomeTax)
                : getSummaryValues().finalIncomeTax;
            return (
              <SummaryField
                label="Podatek dochodowy"
                value={`${taxValue.toFixed(2)} PLN`}
                color="gray"
                subtext={
                  <span className="text-xs text-gray-600">
                    Zryczałtowany podatek dochodowy liczony od przychodów
                    (8,5%). Właściciel może rozliczać się inną metodą – zgłoś
                    nam to, aby dostosować sposób liczenia podatku w raportach.
                  </span>
                }
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component

// Sortable Item Component for Deductions
function SortableDeductionItem({
  id,
  deduction,
  onEdit,
  onDelete,
}: {
  id: string;
  deduction: DeductionItem;
  onEdit: (deduction: DeductionItem) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      className="mb-2 flex items-center gap-2 rounded-md bg-purple-100 p-3"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none p-2"
        title="Przeciągnij, aby zmienić kolejność"
      >
        <svg
          className="h-5 w-5 text-gray-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zm10 0a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM8 5a1 1 0 10-2 0v10a1 1 0 102 0V5zm4 0a1 1 0 10-2 0v10a1 1 0 102 0V5z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="flex-grow">
        <div className="mb-2 text-sm font-medium text-purple-900">
          {deduction.name}
        </div>
        <div className="grid grid-cols-5 items-center gap-2 text-center text-sm">
          <div>
            <div className="font-semibold text-purple-700">Kwota netto</div>
            <div className="font-medium text-purple-900">
              -{deduction.amount.toFixed(2)} PLN
            </div>
          </div>
          <div>
            <div className="font-semibold text-purple-700">Stawka VAT</div>
            <div className="font-medium text-purple-900">{vatLabel}</div>
          </div>
          <div>
            <div className="font-semibold text-purple-700">Kwota VAT</div>
            <div className="font-medium text-purple-900">
              {vatAmount === 0 ? "-" : `-${vatAmount.toFixed(2)} PLN`}
            </div>
          </div>
          <div>
            <div className="font-semibold text-purple-700">Kwota brutto</div>
            <div className="font-bold text-purple-900">
              -{grossAmount.toFixed(2)} PLN
            </div>
          </div>
          <div className="flex h-full items-center justify-center gap-2">
            <button
              onClick={() => onEdit(deduction)}
              className="rounded-md bg-yellow-100 p-2 text-yellow-600 transition hover:bg-yellow-200"
              title="Edytuj odliczenie"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h2v2H7v-2h2zm0 0v-2H7v2h2z"
                />
              </svg>
            </button>
            <button
              onClick={() => onDelete(deduction.id)}
              className="rounded-md bg-red-100 p-2 text-red-600 transition hover:bg-red-200"
              title="Usuń odliczenie"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
