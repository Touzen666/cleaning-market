"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { PaymentType, VATOption, ReportStatus } from "@prisma/client";
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

type ReportDetails = RouterOutputs["monthlyReports"]["getById"];

export default function ReportDetailsPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const actualParams = React.use(params);
  const { reportId } = actualParams;
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

  const [editingDeduction, setEditingDeduction] = useState<
    RouterOutputs["monthlyReports"]["getById"]["additionalDeductions"][0] | null
  >(null);

  const [orderedDeductions, setOrderedDeductions] = useState<
    ReportDetails["additionalDeductions"]
  >([]);

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

  // TRPC queries
  const reportQuery = api.monthlyReports.getById.useQuery(
    {
      reportId: reportId,
    },
    {
      // Brak cache dla natychmiastowych aktualizacji
      staleTime: 0, // 0 sekund - zawsze świeże dane
      // Nie refetchuj automatycznie przy focus
      refetchOnWindowFocus: false,
    },
  );

  const suggestedCommissionsQuery =
    api.monthlyReports.getSuggestedCommissions.useQuery({
      reportId: reportId,
    });

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

  const report = reportQuery.data;

  // Zaktualizuj useEffect gdy report się załaduje
  useEffect(() => {
    if (report) {
      setRentUtilitiesData({
        rentAmount: report.rentAmount ?? 0,
        utilitiesAmount: report.utilitiesAmount ?? 0,
      });
      // Sort deductions by order and set them to local state
      const sortedDeductions = [...report.additionalDeductions].sort(
        (a, b) => a.order - b.order,
      );
      setOrderedDeductions(sortedDeductions);
    }
  }, [report]);

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
    if (!deletionReason.trim()) {
      toast.error("Proszę podać przyczynę usunięcia raportu");
      return;
    }

    try {
      await archiveAndDeleteSentReportMutation.mutateAsync({
        reportId,
        deletionReason: deletionReason.trim(),
      });
      setShowArchiveDeleteModal(false);
      setDeletionReason("");
      toast.success("Raport został zarchiwizowany i usunięty");
      router.push(getBackToListPath());
    } catch {
      toast.error("Błąd podczas archiwizacji raportu");
    }
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
  const deleteReportMutation = api.monthlyReports.deleteReport.useMutation();
  const archiveAndDeleteSentReportMutation =
    api.monthlyReports.archiveAndDeleteSentReport.useMutation();

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

  // Funkcja obliczająca sugerowaną kwotę za sprzątanie
  const calculateSuggestedCleaningCost = () => {
    if (!report?.apartment?.cleaningCosts || !report.items) {
      return 0;
    }

    const cleaningCosts = report.apartment.cleaningCosts as Record<
      string,
      number
    >;
    const revenueItems = report.items.filter(
      (item) => item.type === "REVENUE" && item.reservation,
    );

    let totalCleaningCost = 0;

    for (const item of revenueItems) {
      if (item.reservation) {
        const totalGuests =
          (item.reservation.adults ?? 0) + (item.reservation.children ?? 0);

        if (totalGuests > 0) {
          // Find the cleaning cost for this number of guests
          // If exact match not found, use the highest available cost for fewer guests
          let cleaningCost = 0;
          for (let i = totalGuests; i >= 1; i--) {
            if (cleaningCosts[i.toString()] !== undefined) {
              cleaningCost = cleaningCosts[i.toString()]!;
              break;
            }
          }
          totalCleaningCost += cleaningCost;
        }
      }
    }

    return totalCleaningCost;
  };

  const suggestedCleaningCost = calculateSuggestedCleaningCost();

  // Funkcja obliczająca sugerowaną kwotę za pranie
  const calculateSuggestedLaundryCost = () => {
    if (!report?.apartment?.weeklyLaundryCost) {
      return 0;
    }

    // Koszt prania z ustawień apartamentu
    const laundryCostPerWeek = report.apartment.weeklyLaundryCost;
    const daysPerWeek = 7;

    // Oblicz liczbę dni w miesiącu raportu
    const year = report.year;
    const month = report.month;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Oblicz liczbę tygodni w miesiącu (z dokładnością do 2 miejsc po przecinku)
    // Przykład: 31 dni / 7 dni = 4.43 tygodni
    const weeksInMonth = Math.round((daysInMonth / daysPerWeek) * 100) / 100;

    // Oblicz całkowity koszt prania za miesiąc
    const totalLaundryCost = weeksInMonth * laundryCostPerWeek;

    return totalLaundryCost;
  };

  const suggestedLaundryCost = calculateSuggestedLaundryCost();

  // Funkcja obliczająca sugerowaną kwotę za tekstylia
  const calculateSuggestedTextileCost = () => {
    if (!report?.apartment) {
      return 0;
    }

    // Koszty z ustawień apartamentu
    const cleaningSuppliesCost = report.apartment.cleaningSuppliesCost ?? 132; // Stały koszt środków czystości
    const capsuleCostPerGuest = report.apartment.capsuleCostPerGuest ?? 2.5; // Koszt kapsułki na gościa
    const wineCost = report.apartment.wineCost ?? 250; // Koszt wina

    // Oblicz liczbę gości ze wszystkich rezerwacji
    const revenueItems = report.items.filter(
      (item) => item.type === "REVENUE" && item.reservation,
    );

    let totalGuests = 0;
    revenueItems.forEach((item) => {
      if (item.reservation) {
        const guests =
          (item.reservation.adults ?? 0) + (item.reservation.children ?? 0);
        totalGuests += guests;
      }
    });

    // Oblicz całkowity koszt tekstyliów: stałe koszty + kapsułki
    const totalCapsuleCost = totalGuests * capsuleCostPerGuest;
    const totalTextileCost = cleaningSuppliesCost + wineCost + totalCapsuleCost;

    return totalTextileCost;
  };

  const suggestedTextileCost = calculateSuggestedTextileCost();

  // Funkcja obliczająca koszt sprzątania dla pojedynczej rezerwacji
  const calculateCleaningCostForReservation = (reservation: {
    adults?: number | null;
    children?: number | null;
  }) => {
    if (!report?.apartment?.cleaningCosts) {
      return 0;
    }

    const cleaningCosts = report.apartment.cleaningCosts as Record<
      string,
      number
    >;
    const totalGuests = (reservation.adults ?? 0) + (reservation.children ?? 0);

    if (totalGuests > 0) {
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

  if (reportQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (reportQuery.error || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">
            {reportQuery.error?.message ?? "Raport nie został znaleziony"}
          </p>
          <button
            onClick={() => router.push(getBackToListPath())}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  const revenueItems = report.items.filter((item) => item.type === "REVENUE");
  const expenseItems = report.items.filter((item) =>
    ["EXPENSE", "FEE", "TAX", "COMMISSION"].includes(item.type),
  );

  // Directly before the JSX where you use them:
  const totalAdditionalDeductions = (report.additionalDeductions ?? []).reduce(
    (sum, d) => sum + d.amount,
    0,
  );
  const totalAdditionalDeductionsGross = (
    report.additionalDeductions ?? []
  ).reduce(
    (sum, d) =>
      sum +
      (d.vatOption === "VAT_23"
        ? d.amount * 1.23
        : d.vatOption === "VAT_8"
          ? d.amount * 1.08
          : d.amount),
    0,
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Raport {report.month.toString().padStart(2, "0")}/{report.year}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {report.apartment.name} - {report.owner.firstName}{" "}
                {report.owner.lastName}
              </p>
              {/* Informacja o sposobie rozliczenia */}
              <div className="mt-3 flex items-center space-x-4">
                <div className="inline-flex items-center rounded-md bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                  {report.owner.paymentType === "COMMISSION" ? (
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
                      {report.owner.fixedPaymentAmount
                        ? Number(report.owner.fixedPaymentAmount).toFixed(2)
                        : "0"}{" "}
                      PLN
                    </>
                  )}
                </div>
                <div className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800">
                  {report.owner.vatOption === "NO_VAT" && "Bez VAT"}
                  {report.owner.vatOption === "VAT_8" && "VAT 8%"}
                  {report.owner.vatOption === "VAT_23" && "VAT 23%"}
                </div>
              </div>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(getBackToListPath())}
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
                {/* Przycisk usuń raport - tylko dla admina */}
                <button
                  onClick={() => {
                    if (report.status === ReportStatus.SENT) {
                      setShowArchiveDeleteModal(true);
                    } else {
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
                  onClick={async () => {
                    await deleteReportMutation.mutateAsync({ reportId });
                    setShowDeleteModal(false);
                    router.push(getBackToListPath());
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Usuń raport
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
          <Modal onClose={() => setShowArchiveDeleteModal(false)}>
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
                    : "Archiwizuj i usuń"}
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
                    {report.totalRevenue.toFixed(2)} PLN
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
                    {report.totalExpenses.toFixed(2)} PLN
                  </dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`rounded-lg p-2 ${report.netIncome >= 0 ? "bg-green-500" : "bg-red-500"}`}
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
                    className={`text-lg font-medium ${report.netIncome >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {report.netIncome.toFixed(2)} PLN
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
                    report.status,
                  )}`}
                >
                  {getStatusText(report.status)}
                </span>
              </div>
              <div className="ml-5 w-0 flex-1">
                {report.status !== ReportStatus.SENT && (
                  <select
                    value={report.status}
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
                      {report.createdByAdmin?.name ?? "Nieznany użytkownik"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {report.createdAt
                        ? new Date(report.createdAt).toLocaleDateString(
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
              {report.approvedByAdmin && (
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
                        {report.approvedByAdmin.name ?? "Nieznany użytkownik"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {report.approvedAt
                          ? new Date(report.approvedAt).toLocaleDateString(
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
              {report.sentAt && (
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
                        {(() => {
                          const sentAction = report.history?.find(
                            (h) => h.action === "sent",
                          );
                          return (
                            sentAction?.admin?.name ?? "Nieznany użytkownik"
                          );
                        })()}
                      </p>
                      <p className="text-xs text-gray-400">
                        {report.sentAt
                          ? new Date(report.sentAt).toLocaleDateString(
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
            </div>
          </div>
        </div>

        {/* Quick Expense Entry */}
        {report.status !== ReportStatus.SENT && (
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
                              placeholder={
                                key === "sprzatanie" &&
                                suggestedCleaningCost > 0
                                  ? suggestedCleaningCost.toFixed(2)
                                  : key === "pranie" && suggestedLaundryCost > 0
                                    ? suggestedLaundryCost.toFixed(2)
                                    : key === "tekstylia" &&
                                        suggestedTextileCost > 0
                                      ? suggestedTextileCost.toFixed(2)
                                      : "0.00"
                              }
                              disabled={addingQuickExpense === key}
                            />
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {category.vatRate}% VAT
                            </span>
                          </div>
                          {key === "sprzatanie" &&
                            suggestedCleaningCost > 0 && (
                              <p className="mt-1 text-xs text-green-600">
                                💡 Sugerowana kwota:{" "}
                                {suggestedCleaningCost.toFixed(2)} PLN (na
                                podstawie{" "}
                                {
                                  report.items.filter(
                                    (item) =>
                                      item.type === "REVENUE" &&
                                      item.reservation,
                                  ).length
                                }{" "}
                                rezerwacji) - średnio{" "}
                                {(
                                  suggestedCleaningCost /
                                  report.items.filter(
                                    (item) =>
                                      item.type === "REVENUE" &&
                                      item.reservation,
                                  ).length
                                ).toFixed(2)}{" "}
                                PLN za rezerwację
                              </p>
                            )}
                          {key === "pranie" && suggestedLaundryCost > 0 && (
                            <p className="mt-1 text-xs text-green-600">
                              💡 Sugerowana kwota:{" "}
                              {suggestedLaundryCost.toFixed(2)} PLN (koszt
                              miesięczny:{" "}
                              {report.apartment.weeklyLaundryCost ?? 120} PLN co
                              7 dni) - średnio{" "}
                              {report.apartment.weeklyLaundryCost ?? 120} PLN za
                              tydzień
                            </p>
                          )}
                          {key === "tekstylia" && suggestedTextileCost > 0 && (
                            <p className="mt-1 text-xs text-green-600">
                              💡 Sugerowana kwota:{" "}
                              {suggestedTextileCost.toFixed(2)} PLN (środki:{" "}
                              {report.apartment.cleaningSuppliesCost ?? 132} PLN
                              + wino: {report.apartment.wineCost ?? 250} PLN +{" "}
                              kapsułki:{" "}
                              {report.apartment.capsuleCostPerGuest ?? 2.5}{" "}
                              PLN/gość)
                            </p>
                          )}
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
                              .net <= 0
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
              Rezerwacje i Przychody ({revenueItems.length})
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {revenueItems.length === 0 ? (
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
                        Ilość gości
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Koszt sprzątania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kwota
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Kategoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {revenueItems.map((item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.reservation?.guest ?? "-"}
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
                              {calculateCleaningCostForReservation(
                                item.reservation,
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
                          <span
                            className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getItemTypeColorLocal(
                              item.type,
                            )}`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Suggested Commissions */}
        {suggestedCommissionsQuery.data?.suggestions &&
          suggestedCommissionsQuery.data.suggestions.length > 0 &&
          report.status !== ReportStatus.SENT && (
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
            {report.status !== ReportStatus.SENT && (
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
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 hover:bg-indigo-700"
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
                                disabled={
                                  report.status === "SENT" ||
                                  deleteReportItemMutation.isPending
                                }
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
        {report.status !== ReportStatus.SENT && (
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
                      onChange={(e) =>
                        setRentUtilitiesData((prev) => ({
                          ...prev,
                          rentAmount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                    {report.suggestedRent && report.suggestedRent > 0 && (
                      <p className="text-xs text-gray-500">
                        💡 Sugerowany na podstawie poprzednich raportów:{" "}
                        {report.suggestedRent.toFixed(2)} PLN
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
                      onChange={(e) =>
                        setRentUtilitiesData((prev) => ({
                          ...prev,
                          utilitiesAmount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-yellow-500 focus:outline-none focus:ring-yellow-500"
                      placeholder="0.00"
                    />
                    {report.suggestedUtilities &&
                      report.suggestedUtilities > 0 && (
                        <p className="text-xs text-gray-500">
                          💡 Sugerowane na podstawie poprzednich raportów:{" "}
                          {report.suggestedUtilities.toFixed(2)} PLN
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
        {report.status !== ReportStatus.SENT && (
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
                          -{totalAdditionalDeductions.toFixed(2)} PLN
                        </span>
                      </span>
                      <span className="text-sm text-purple-900">
                        Brutto:{" "}
                        <span className="font-bold">
                          -{totalAdditionalDeductionsGross.toFixed(2)} PLN
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
          <div className="bg-white p-6">
            {/* Karta z zyskiem netto apartamentu */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <h5 className="mb-2 text-lg font-medium text-gray-800">
                Zysk netto apartamentu (przed wszystkimi potrąceniami)
              </h5>
              <p className="text-2xl font-bold text-gray-900">
                {report.netIncome.toFixed(2)} PLN
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
                    {(report.netIncome * 0.25).toFixed(2)} PLN
                  </p>
                </div>
                <div className="rounded-md bg-blue-100 p-3">
                  <p className="text-sm text-blue-700">Pozostało:</p>
                  <p className="text-xl font-bold text-blue-900">
                    {(report.netIncome * 0.75).toFixed(2)} PLN
                  </p>
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
              Ostateczna kalkulacja płatności dla {report.owner.firstName}{" "}
              {report.owner.lastName}
            </p>
          </div>
          <div className="bg-white p-6">
            <OwnerPayoutCalculation
              report={report}
              onRefetch={() => void reportQuery.refetch()}
              _additionalDeductionData={additionalDeductionData}
              _onDeleteDeduction={handleDeleteDeduction}
              _onEditDeduction={setEditingDeduction}
              sortedDeductions={orderedDeductions}
            />
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
  color?: "green" | "blue" | "gray";
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
  };

  const selectedColor = colorClasses[color];

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
        <p
          className={`font-bold ${selectedColor.valueText} ${
            isPayout ? "text-2xl" : "text-lg"
          }`}
        >
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
    <div className={`flex flex-col gap-2 rounded-lg ${selectedColor.bg} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <input
          type="radio"
          id={id}
          name="final-payout-type"
          checked={finalPayoutType === payoutType}
          onChange={() => handleFinalPayoutTypeChange(payoutType)}
          disabled={isDisabled}
          className={`h-4 w-4 ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${selectedColor.radio}`}
          title={
            isDisabled
              ? "Raport został wysłany i nie można go edytować. Jedynym rozwiązaniem jest usunięcie raportu."
              : ""
          }
        />
        <label
          htmlFor={id}
          className={`text-lg font-semibold ${isDisabled ? "cursor-not-allowed opacity-50" : ""} ${selectedColor.label}`}
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
  _onEditDeduction: (
    deduction: NonNullable<ReportDetails>["additionalDeductions"][number],
  ) => void;
  sortedDeductions: ReportDetails["additionalDeductions"];
}) {
  const [deductRentAndUtilities] = React.useState(true);

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

  // State do śledzenia stanu ładowania poszczególnych wartości (używane tylko przez setLoadingValues)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_loadingValues, setLoadingValues] = React.useState<{
    finalOwnerPayout: boolean;
    finalHostPayout: boolean;
    finalIncomeTax: boolean;
    finalVatAmount: boolean;
    totalRevenue: boolean;
    totalExpenses: boolean;
    netIncome: boolean;
    adminCommissionAmount: boolean;
    afterCommission: boolean;
    afterRentAndUtilities: boolean;
    totalAdditionalDeductions: boolean;
  }>({
    finalOwnerPayout: false,
    finalHostPayout: false,
    finalIncomeTax: false,
    finalVatAmount: false,
    totalRevenue: false,
    totalExpenses: false,
    netIncome: false,
    adminCommissionAmount: false,
    afterCommission: false,
    afterRentAndUtilities: false,
    totalAdditionalDeductions: false,
  });

  // State do śledzenia postępu rekalkulacji
  const [recalculationProgress, setRecalculationProgress] =
    React.useState<string>("");

  // Osobne loadery dla każdej z finalnych kart z postępem
  const [finalCardLoaders, setFinalCardLoaders] = React.useState({
    ownerPayout: false,
    hostPayout: false,
    incomeTax: false,
    taxBase: false,
  });

  // Progress dla każdej karty (0-100)
  const [finalCardProgress, setFinalCardProgress] = React.useState({
    ownerPayout: 0,
    hostPayout: 0,
    incomeTax: 0,
    taxBase: 0,
  });

  // Referencje do wartości przed mutacją - używane do monitorowania zmian
  const previousValuesRef = React.useRef({
    finalOwnerPayout: report.finalOwnerPayout,
    finalHostPayout: report.finalHostPayout,
    finalIncomeTax: (report as ReportDetails & { finalIncomeTax?: number })
      .finalIncomeTax,
    taxBase: report.taxBase,
  });

  // Funkcja do sprawdzania zmian po refetch
  // Wyodrębnij finalIncomeTax do osobnej zmiennej dla dependency array
  const currentFinalIncomeTax = (
    report as ReportDetails & { finalIncomeTax?: number }
  ).finalIncomeTax;

  // useEffect do automatycznego monitorowania zmian w wartościach
  React.useEffect(() => {
    // Jeśli żaden loader nie jest aktywny, nie monitoruj
    const anyLoaderActive =
      finalCardLoaders.ownerPayout ||
      finalCardLoaders.hostPayout ||
      finalCardLoaders.incomeTax ||
      finalCardLoaders.taxBase;
    if (!anyLoaderActive) return;

    const current = {
      finalOwnerPayout: report.finalOwnerPayout,
      finalHostPayout: report.finalHostPayout,
      finalIncomeTax: currentFinalIncomeTax,
      taxBase: report.taxBase,
    };

    const previous = previousValuesRef.current;

    // Sprawdź każde pole i wyłącz loader jeśli się zmieniło
    let hasChanges = false;

    if (
      finalCardLoaders.ownerPayout &&
      current.finalOwnerPayout !== previous.finalOwnerPayout
    ) {
      setFinalCardLoaders((prev) => ({ ...prev, ownerPayout: false }));
      setFinalCardProgress((prev) => ({ ...prev, ownerPayout: 100 }));
      console.log(
        "[MONITORING] finalOwnerPayout zaktualizowane:",
        previous.finalOwnerPayout,
        "->",
        current.finalOwnerPayout,
      );
      hasChanges = true;
    }

    if (
      finalCardLoaders.hostPayout &&
      current.finalHostPayout !== previous.finalHostPayout
    ) {
      setFinalCardLoaders((prev) => ({ ...prev, hostPayout: false }));
      setFinalCardProgress((prev) => ({ ...prev, hostPayout: 100 }));
      console.log(
        "[MONITORING] finalHostPayout zaktualizowane:",
        previous.finalHostPayout,
        "->",
        current.finalHostPayout,
      );
      hasChanges = true;
    }

    if (
      finalCardLoaders.incomeTax &&
      current.finalIncomeTax !== previous.finalIncomeTax
    ) {
      setFinalCardLoaders((prev) => ({ ...prev, incomeTax: false }));
      setFinalCardProgress((prev) => ({ ...prev, incomeTax: 100 }));
      console.log(
        "[MONITORING] finalIncomeTax zaktualizowane:",
        previous.finalIncomeTax,
        "->",
        current.finalIncomeTax,
      );
      hasChanges = true;
    }

    if (finalCardLoaders.taxBase && current.taxBase !== previous.taxBase) {
      setFinalCardLoaders((prev) => ({ ...prev, taxBase: false }));
      setFinalCardProgress((prev) => ({ ...prev, taxBase: 100 }));
      console.log(
        "[MONITORING] taxBase zaktualizowane:",
        previous.taxBase,
        "->",
        current.taxBase,
      );
      hasChanges = true;
    }

    // Zaktualizuj referencje jeśli były zmiany
    if (hasChanges) {
      previousValuesRef.current = current;
    }
  }, [
    report.finalOwnerPayout,
    report.finalHostPayout,
    currentFinalIncomeTax,
    report.taxBase,
    finalCardLoaders.ownerPayout,
    finalCardLoaders.hostPayout,
    finalCardLoaders.incomeTax,
    finalCardLoaders.taxBase,
  ]);

  // const isFinalSummaryLoading = Object.values(_loadingValues).some(Boolean); // Nieużywane - zastąpione przez finalCardLoaders

  // Funkcja do symulowania postępu dla kart
  const simulateProgress = (
    cardType: "ownerPayout" | "hostPayout" | "incomeTax" | "taxBase",
  ) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15 + 5; // 5-20% na krok
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
      }
      setFinalCardProgress((prev) => ({ ...prev, [cardType]: progress }));
    }, 200); // Co 200ms
  };

  // Funkcja do ukrywania wszystkich loaderów
  const hideAllLoaders = () => {
    setLoadingValues({
      finalOwnerPayout: false,
      finalHostPayout: false,
      finalIncomeTax: false,
      finalVatAmount: false,
      totalRevenue: false,
      totalExpenses: false,
      netIncome: false,
      adminCommissionAmount: false,
      afterCommission: false,
      afterRentAndUtilities: false,
      totalAdditionalDeductions: false,
    });

    // Resetuj progress kart
    setFinalCardProgress({
      ownerPayout: 0,
      hostPayout: 0,
      incomeTax: 0,
      taxBase: 0,
    });
  };

  // State do śledzenia poprzedniego typu rozliczenia
  const [previousSettlementType, setPreviousSettlementType] = React.useState(
    report.finalSettlementType,
  );

  // Debouncing dla zmian typu rozliczenia - WYŁĄCZONE (nie używane)
  // const [debouncedSettlementType, setDebouncedSettlementType] = React.useState(
  //   report.finalSettlementType,
  // );

  // useEffect do debouncing zmian typu rozliczenia - WYŁĄCZONE (nie używane)
  // React.useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setDebouncedSettlementType(report.finalSettlementType);
  //   }, 500); // 500ms debounce

  //   return () => clearTimeout(timer);
  // }, [report.finalSettlementType]);

  // useEffect do aktualizacji poprzedniego typu rozliczenia
  React.useEffect(() => {
    if (report.finalSettlementType !== previousSettlementType) {
      setPreviousSettlementType(report.finalSettlementType);
    }
  }, [report.finalSettlementType, previousSettlementType]);

  // Mutacja do zapisywania finalSettlementType
  const setFinalSettlementTypeMutation =
    api.monthlyReports.setFinalSettlementType.useMutation({
      onSuccess: () => {
        // Ustaw wszystkie loadery na true po zapisaniu typu rozliczenia
        setLoadingValues({
          finalOwnerPayout: true,
          finalHostPayout: true,
          finalIncomeTax: true,
          finalVatAmount: true,
          totalRevenue: true,
          totalExpenses: true,
          netIncome: true,
          adminCommissionAmount: true,
          afterCommission: true,
          afterRentAndUtilities: true,
          totalAdditionalDeductions: true,
        });

        // Ustaw osobne loadery dla finalnych kart na true i uruchom symulację postępu
        setFinalCardLoaders({
          ownerPayout: true,
          hostPayout: true,
          incomeTax: true,
          taxBase: true,
        });

        // Resetuj progress i uruchom symulację
        setFinalCardProgress({
          ownerPayout: 0,
          hostPayout: 0,
          incomeTax: 0,
          taxBase: 0,
        });

        simulateProgress("ownerPayout");
        simulateProgress("hostPayout");
        simulateProgress("incomeTax");
        simulateProgress("taxBase");

        setRecalculationProgress("");

        // Odśwież dane natychmiast
        onRefetch();

        // Monitoring jest teraz obsługiwany przez useEffect
        // Dodaj fallback timeout na wypadek gdyby wartości się nie zaktualizowały
        setTimeout(() => {
          setFinalCardLoaders((prev) => {
            const anyStillLoading =
              prev.ownerPayout ||
              prev.hostPayout ||
              prev.incomeTax ||
              prev.taxBase;
            if (anyStillLoading) {
              console.warn(
                "[MONITORING] Fallback timeout - wymuszam wyłączenie loaderów",
              );
              return {
                ownerPayout: false,
                hostPayout: false,
                incomeTax: false,
                taxBase: false,
              };
            }
            return prev;
          });
        }, 5000); // 5 sekund maksymalnie

        // Ukryj pozostałe loadery po krótkim opóźnieniu
        setTimeout(() => {
          hideAllLoaders();
        }, 200); // Krótkie opóźnienie na odczyt nowych danych
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
        // Ukryj wszystkie loadery w przypadku błędu
        hideAllLoaders();
        // Ukryj także finalne loadery
        setFinalCardLoaders({
          ownerPayout: false,
          hostPayout: false,
          incomeTax: false,
          taxBase: false,
        });
      },
    });

  // Funkcja do zapisywania wybranego typu rozliczenia
  const handleFinalPayoutTypeChange = async (newType: LocalPayoutType) => {
    // Natychmiast aktualizuj lokalny stan dla lepszej responsywności
    setFinalPayoutType(newType);

    // Ustaw wszystkie loadery na true
    setLoadingValues({
      finalOwnerPayout: true,
      finalHostPayout: true,
      finalIncomeTax: true,
      finalVatAmount: true,
      totalRevenue: true,
      totalExpenses: true,
      netIncome: true,
      adminCommissionAmount: true,
      afterCommission: true,
      afterRentAndUtilities: true,
      totalAdditionalDeductions: true,
    });

    // Zapisz aktualne wartości przed mutacją
    previousValuesRef.current = {
      finalOwnerPayout: report.finalOwnerPayout,
      finalHostPayout: report.finalHostPayout,
      finalIncomeTax: currentFinalIncomeTax,
      taxBase: report.taxBase,
    };

    // Ustaw także finalne loadery na true i zresetuj progress bary
    setFinalCardLoaders({
      ownerPayout: true,
      hostPayout: true,
      incomeTax: true,
      taxBase: true,
    });

    // Resetuj progress bary do 0%
    setFinalCardProgress({
      ownerPayout: 0,
      hostPayout: 0,
      incomeTax: 0,
      taxBase: 0,
    });

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
      // Pokaż postęp
      setRecalculationProgress("Zapisywanie typu rozliczenia...");

      // Wykonaj mutację w tle (nie czekaj na zakończenie)
      setFinalSettlementTypeMutation.mutate({
        reportId: report.id,
        finalSettlementType: settlementType,
      });

      // Loadery zostaną ukryte przez onSuccess callback
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
      // Ukryj wszystkie loadery w przypadku błędu
      setLoadingValues({
        finalOwnerPayout: false,
        finalHostPayout: false,
        finalIncomeTax: false,
        finalVatAmount: false,
        totalRevenue: false,
        totalExpenses: false,
        netIncome: false,
        adminCommissionAmount: false,
        afterCommission: false,
        afterRentAndUtilities: false,
        totalAdditionalDeductions: false,
      });
      // Ukryj także finalne loadery
      setFinalCardLoaders({
        ownerPayout: false,
        hostPayout: false,
        incomeTax: false,
        taxBase: false,
      });
    }
  };

  const isVatExempt = report.owner.vatOption === VATOption.NO_VAT;
  const isReportSent = report.status === ReportStatus.SENT;

  // Suma dodatkowych odliczeń (netto)
  // const totalAdditionalDeductions = (sortedDeductions ?? []).reduce(
  //   (sum, d) => sum + d.amount,
  //   0,
  // );

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

  // Obliczenia przybliżonych wartości dla natychmiastowego wyświetlania (obecnie nieużywane)
  // const calculateApproximateValues = (settlementType: LocalPayoutType) => {
  //   const netIncome = report.netIncome;
  //   const adminCommissionAmount = netIncome * 0.25;
  //   const afterCommission = netIncome - adminCommissionAmount;
  //   const rentAndUtilities =
  //     (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0);
  //   const afterRentAndUtilities = afterCommission - rentAndUtilities;
  //   const fixedAmount = Number(report.owner.fixedPaymentAmount ?? 0);

  //   let baseAmount = 0;
  //   if (settlementType === LocalPayoutType.FIXED_AMOUNT) {
  //     baseAmount = fixedAmount;
  //   } else if (
  //     settlementType === LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES
  //   ) {
  //     baseAmount =
  //       fixedAmount - rentAndUtilities - totalAdditionalDeductionsGross;
  //   } else if (settlementType === LocalPayoutType.COMMISSION) {
  //     baseAmount = afterRentAndUtilities - totalAdditionalDeductionsGross;
  //   }

  //   const vatRate =
  //     report.owner.vatOption === "VAT_23"
  //       ? 0.23
  //       : report.owner.vatOption === "VAT_8"
  //         ? 0.08
  //         : 0;
  //   const vatAmount = baseAmount * vatRate;
  //   const grossAmount = baseAmount + vatAmount;

  //   return {
  //     baseAmount,
  //     vatAmount,
  //     grossAmount,
  //     adminCommissionAmount,
  //     afterCommission,
  //     afterRentAndUtilities,
  //   };
  // };

  // Kwota stała z umowy (po odjęciu dodatkowych odliczeń)
  const fixedBaseAmount = Number(report.owner.fixedPaymentAmount ?? 0);
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

  return (
    <div className="space-y-6">
      <h4 className="text-xl font-semibold text-gray-800">
        Rozliczenie Prowizji Złote Wynajmy
      </h4>

      {report.owner.paymentType === PaymentType.FIXED_AMOUNT && (
        <>
          <PayoutOption
            id="final-fixed"
            label="Rozliczenie właściciela: kwota stała"
            payoutType={LocalPayoutType.FIXED_AMOUNT}
            finalPayoutType={finalPayoutType}
            handleFinalPayoutTypeChange={handleFinalPayoutTypeChange}
            isSelected={finalPayoutType === LocalPayoutType.FIXED_AMOUNT}
            color="green"
            isDisabled={isReportSent}
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
                        – odliczenia:{" "}
                        {totalAdditionalDeductionsGross.toFixed(2)} PLN brutto
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
            isDisabled={isReportSent}
          >
            {finalPayoutType ===
              LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES && (
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
            )}
          </PayoutOption>

          <PayoutOption
            id="final-commission"
            label="Rozliczenie właściciela: prowizyjne"
            payoutType={LocalPayoutType.COMMISSION}
            finalPayoutType={finalPayoutType}
            handleFinalPayoutTypeChange={handleFinalPayoutTypeChange}
            isSelected={finalPayoutType === LocalPayoutType.COMMISSION}
            color="blue"
            isDisabled={isReportSent}
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
                    (po odliczeniu czynszu:{" "}
                    {(report.rentAmount ?? 0).toFixed(2)} PLN + mediów:{" "}
                    {(report.utilitiesAmount ?? 0).toFixed(2)} PLN + dodatkowych
                    odliczeń: {totalAdditionalDeductionsGross.toFixed(2)} PLN
                    brutto ={" "}
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
        </>
      )}

      {report.owner.paymentType === PaymentType.COMMISSION && (
        <div className="rounded-lg bg-green-50 p-4">
          <h5 className="mb-2 text-lg font-medium text-green-800">
            Ostateczna wypłata dla właściciela (Prowizyjne)
          </h5>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <SummaryField
              label={`Kwota po prowizji Złote Wynajmy ${!isVatExempt ? "(netto)" : ""}`}
              value={`${netIncomeAfterAdminCommission.toFixed(2)} PLN`}
              color="green"
            />
            <SummaryField
              label="Kwota bazowa (netto)"
              value={`${netIncomeAfterAllDeductions.toFixed(2)} PLN`}
              subtext={
                totalAdditionalDeductionsGross > 0 && (
                  <span className="block text-xs text-green-600">
                    (po odliczeniu {totalAdditionalDeductionsGross.toFixed(2)}{" "}
                    PLN)
                  </span>
                )
              }
              color="green"
            />
            {!isVatExempt && (
              <SummaryField
                label="VAT"
                value={`${getVatAmount(netIncomeAfterAllDeductions, report.owner.vatOption).toFixed(2)} PLN (${report.owner.vatOption === "VAT_8" ? "8" : "23"}%)`}
                color="green"
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
              color="green"
            />
          </div>
        </div>
      )}

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
              {report.owner.vatOption === "NO_VAT" ? "(brutto)" : "(netto)"}:
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
            {finalCardLoaders.taxBase && (
              <ProgressBar
                progress={finalCardProgress.taxBase}
                color={
                  report.finalSettlementType === "COMMISSION" ? "blue" : "green"
                }
              />
            )}
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
            {finalCardLoaders.ownerPayout && (
              <ProgressBar
                progress={finalCardProgress.ownerPayout}
                color="green"
              />
            )}
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
            {finalCardLoaders.hostPayout && (
              <ProgressBar
                progress={finalCardProgress.hostPayout}
                color="purple"
              />
            )}
            {recalculationProgress && (
              <p className="mt-1 text-xs text-purple-600">
                {recalculationProgress}
              </p>
            )}
            <p className="mt-1 text-xs text-purple-600">
              {report.finalSettlementType === "COMMISSION"
                ? "Rozliczenie prowizyjne"
                : report.finalSettlementType === "FIXED"
                  ? "Rozliczenie kwota stała"
                  : report.finalSettlementType === "FIXED_MINUS_UTILITIES"
                    ? "Rozliczenie kwota stała po odliczeniu mediów"
                    : "Typ rozliczenia nie określony"}
            </p>
            {(report.finalSettlementType === "FIXED" ||
              report.finalSettlementType === "FIXED_MINUS_UTILITIES") && (
              <p className="mt-1 text-xs text-purple-500">
                Różnica:{" "}
                {(
                  (report.finalHostPayout ?? 0) -
                  (report.netIncome ?? 0) * 0.25
                ).toFixed(2)}{" "}
                PLN (rzeczywista prowizja{" "}
                {(report.finalHostPayout ?? 0).toFixed(2)} PLN - standardowa
                prowizja {((report.netIncome ?? 0) * 0.25).toFixed(2)} PLN)
              </p>
            )}
          </div>
          <div className="rounded-md bg-yellow-100 p-4">
            <p className="text-sm text-yellow-700">
              Zryczałtowany podatek dochodowy 8.5% od wypłaty właściciela:
            </p>
            <p className="text-2xl font-bold text-yellow-900">
              {(
                report as ReportDetails & { finalIncomeTax?: number }
              ).finalIncomeTax?.toFixed(2) ?? "0.00"}{" "}
              PLN
            </p>
            {finalCardLoaders.incomeTax && (
              <ProgressBar
                progress={finalCardProgress.incomeTax}
                color="yellow"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Progress Bar Component
const ProgressBar = ({
  progress,
  color = "blue",
}: {
  progress: number;
  color?: "blue" | "green" | "yellow" | "purple";
}) => {
  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    yellow: "bg-yellow-600",
    purple: "bg-purple-600",
  };

  return (
    <div className="mt-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full ${colors[color]} transition-all duration-300 ease-out`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="mt-1 text-center text-xs text-gray-600">
        {progress < 100 ? `${Math.round(progress)}%` : "Zakończono"}
      </p>
    </div>
  );
};

// Sortable Item Component for Deductions
function SortableDeductionItem({
  id,
  deduction,
  onEdit,
  onDelete,
}: {
  id: string;
  deduction: ReportDetails["additionalDeductions"][0];
  onEdit: (deduction: ReportDetails["additionalDeductions"][0]) => void;
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
