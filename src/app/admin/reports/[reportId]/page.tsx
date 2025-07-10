"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { PaymentType, VATOption, ReportStatus } from "@prisma/client";
import { Modal } from "@/components/ui/Modal";
import { getVatAmount, getGrossAmount } from "@/lib/vat";

type ReportDetails = RouterOutputs["monthlyReports"]["getById"];

const expenseCategories = [
  {
    name: "Sprzątanie",
    vatRate: 23,
    description: "Usługi sprzątania apartamentu",
  },
  { name: "Pranie", vatRate: 8, description: "Pranie pościeli i ręczników" },
  {
    name: "Zakupy środków czystości",
    vatRate: 23,
    description: "Środki czyszczące i higiena",
  },
  { name: "Inne", vatRate: 23, description: "Inne wydatki" },
];

export default function ReportDetailsPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const router = useRouter();
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

  // TRPC queries
  const reportQuery = api.monthlyReports.getById.useQuery({
    reportId: reportId,
  });

  const suggestedCommissionsQuery =
    api.monthlyReports.getSuggestedCommissions.useQuery({
      reportId: reportId,
    });

  // TRPC mutations
  const addItemMutation = api.monthlyReports.addItem.useMutation({
    onSuccess: () => {
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
    }
  }, [report]);

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

  const quickExpenseCategories = {
    tekstylia: {
      name: "Tekstylia",
      vatRate: 23,
      description: "Zakup i wymiana tekstyliów",
    },
    sprzatanie: {
      name: "Sprzątanie",
      vatRate: 23,
      description: "Usługi sprzątania apartamentu",
    },
    pranie: {
      name: "Pranie",
      vatRate: 8,
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
      await addItemMutation.mutateAsync({
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
      console.error("Error adding item:", error);
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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        reportId: reportId,
        status: newStatus as ReportStatus,
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "REVIEW":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: ReportStatus) => {
    switch (status) {
      case "DRAFT":
        return "Szkic";
      case "REVIEW":
        return "Do przeglądu";
      case "APPROVED":
        return "Zatwierdzony";
      case "SENT":
        return "Wysłany";
      default:
        return status;
    }
  };

  const getItemTypeTextLocal = (type: string) => {
    switch (type) {
      case "REVENUE":
        return "Przychód";
      case "EXPENSE":
        return "Wydatek";
      case "FEE":
        return "Opłata";
      case "TAX":
        return "Podatek";
      case "COMMISSION":
        return "Prowizja";
      default:
        return type;
    }
  };

  const getItemTypeColorLocal = (type: string) => {
    switch (type) {
      case "REVENUE":
        return "bg-green-100 text-green-800";
      case "EXPENSE":
        return "bg-red-100 text-red-800";
      case "FEE":
        return "bg-orange-100 text-orange-800";
      case "TAX":
        return "bg-purple-100 text-purple-800";
      case "COMMISSION":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const deleteReportMutation = api.monthlyReports.deleteReport.useMutation();

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
            onClick={() => router.push("/admin/reports")}
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
                {/* Przycisk usuń raport - tylko dla admina */}
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
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
                    router.push("/admin/reports");
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                >
                  Usuń raport
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
                    onChange={(e) => handleStatusChange(e.target.value)}
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
                              placeholder="0.00"
                              disabled={addingQuickExpense === key}
                            />
                            <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                              {category.vatRate}% VAT
                            </span>
                          </div>
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
                          className="inline-flex w-full items-center justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {revenueItems.map((item) => (
                      <tr key={item.id}>
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
                              className="rounded bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-200 disabled:opacity-50"
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
          <div className="px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Wydatki i Prowizje ({expenseItems.length})
            </h3>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {expenseItems.map((item) => (
                      <tr key={item.id}>
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
                  className="inline-flex items-center rounded-md bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
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
                Dodatkowe koszty odejmowane od ostatecznej wypłaty właściciela
              </p>
            </div>
            <div className="bg-white p-6">
              {/* Lista istniejących odliczeń */}
              {report.additionalDeductions &&
                report.additionalDeductions.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md mb-3 font-medium text-gray-800">
                      Istniejące odliczenia:
                    </h4>
                    <div className="mb-3 space-y-2">
                      {report.additionalDeductions.map((deduction) => {
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
                            <div className="grid grid-cols-5 items-center gap-2 text-center text-sm">
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
                              <div className="flex h-full items-center justify-center gap-2">
                                <button
                                  onClick={() => setEditingDeduction(deduction)}
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
                                  onClick={() =>
                                    handleDeleteDeduction(deduction.id)
                                  }
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
                        );
                      })}
                    </div>
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
                    className="inline-flex items-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
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
              additionalDeductionData={additionalDeductionData}
              onDeleteDeduction={handleDeleteDeduction}
              onEditDeduction={setEditingDeduction}
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
                    className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

// Nowy komponent do obliczania i wyświetlania rozliczenia z właścicielem
enum LocalPayoutType {
  FIXED_AMOUNT = "FIXED_AMOUNT",
  FIXED_AMOUNT_MINUS_UTILITIES = "FIXED_AMOUNT_MINUS_UTILITIES",
  COMMISSION = "COMMISSION",
}

function OwnerPayoutCalculation({
  report,
  onRefetch,
  additionalDeductionData,
  onDeleteDeduction,
  onEditDeduction,
}: {
  report: ReportDetails;
  onRefetch: () => void;
  additionalDeductionData: {
    name: string;
    amount: number;
    vatOption: VATOption;
  };
  onDeleteDeduction: (deductionId: string) => Promise<void>;
  onEditDeduction: (
    deduction: NonNullable<ReportDetails>["additionalDeductions"][number],
  ) => void;
}) {
  const [deductRentAndUtilities, setDeductRentAndUtilities] =
    React.useState(true);

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

  // Mutacja do zapisywania finalSettlementType
  const setFinalSettlementTypeMutation =
    api.monthlyReports.setFinalSettlementType.useMutation({
      onSuccess: () => {
        // Refetch report data after successful update
        onRefetch();
      },
    });

  // Funkcja do zapisywania wybranego typu rozliczenia
  const handleFinalPayoutTypeChange = async (newType: LocalPayoutType) => {
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
      await setFinalSettlementTypeMutation.mutateAsync({
        reportId: report.id,
        finalSettlementType: settlementType,
      });
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
    }
  };

  const isVatExempt = report.owner.vatOption === VATOption.NO_VAT;

  // Suma dodatkowych odliczeń (netto)
  const totalAdditionalDeductions = (report.additionalDeductions ?? []).reduce(
    (sum, d) => sum + d.amount,
    0,
  );

  // Suma dodatkowych odliczeń (brutto)
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
        Podsumowanie rozliczenia
      </h4>

      {/* Przełącznik potrącania czynszu i mediów */}
      <div className="my-6 flex items-center gap-3 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
        <input
          id="deduct-rent-utilities"
          type="checkbox"
          checked={deductRentAndUtilities}
          onChange={() => setDeductRentAndUtilities((v) => !v)}
          className="h-5 w-5 rounded border-green-400 text-green-600 focus:ring-green-500"
        />
        <label
          htmlFor="deduct-rent-utilities"
          className="select-none text-base font-semibold text-green-900"
        >
          Potrąć czynsz i media z wypłaty właściciela
        </label>
      </div>

      {/* Kwota bazowa */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h5 className="mb-2 text-lg font-medium text-gray-800">
          Zysk netto apartamentu (przed wszystkimi potrąceniami)
        </h5>
        <p className="text-2xl font-bold text-gray-900">
          {report.netIncome.toFixed(2)} PLN
        </p>
      </div>

      {/* Prowizja 25% dla administratora */}
      <div className="rounded-lg bg-red-50 p-4">
        <h5 className="mb-2 text-lg font-medium text-red-800">
          Prowizja 25% dla administratora
        </h5>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-md bg-red-100 p-3">
            <p className="text-sm text-red-700">Kwota prowizji:</p>
            <p className="text-xl font-bold text-red-900">
              -{adminCommissionAmount.toFixed(2)} PLN
            </p>
          </div>
          <div className="rounded-md bg-red-100 p-3">
            <p className="text-sm text-red-700">Pozostało:</p>
            <p className="text-xl font-bold text-red-900">
              {netIncomeAfterAdminCommission.toFixed(2)} PLN
            </p>
          </div>
        </div>
      </div>

      {/* Czynsz i media */}
      <div className="rounded-lg bg-yellow-50 p-4">
        <h5 className="mb-2 text-lg font-medium text-yellow-800">
          Czynsz i media za mieszkanie
        </h5>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-md bg-yellow-100 p-3">
            <p className="text-sm text-yellow-700">Czynsz:</p>
            <p className="text-lg font-bold text-yellow-900">
              -{(report.rentAmount ?? 0).toFixed(2)} PLN
            </p>
          </div>
          <div className="rounded-md bg-yellow-100 p-3">
            <p className="text-sm text-yellow-700">Media:</p>
            <p className="text-lg font-bold text-yellow-900">
              -{(report.utilitiesAmount ?? 0).toFixed(2)} PLN
            </p>
          </div>
          <div className="rounded-md bg-yellow-100 p-3">
            <p className="text-sm text-yellow-700">Pozostało:</p>
            <p className="text-xl font-bold text-yellow-900">
              {netIncomeAfterRentAndUtilities.toFixed(2)} PLN
              <span className="block text-xs text-yellow-700">
                (po odliczeniu czynszu: {(report.rentAmount ?? 0).toFixed(2)}{" "}
                PLN + mediów: {(report.utilitiesAmount ?? 0).toFixed(2)} PLN ={" "}
                {(
                  (report.rentAmount ?? 0) + (report.utilitiesAmount ?? 0)
                ).toFixed(2)}{" "}
                PLN)
                <br />
                Ta kwota to wynik odjęcia czynszu i mediów od kwoty po prowizji
                Złote wynajmy.
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Dodatkowe odliczenia */}
      {report.additionalDeductions &&
        report.additionalDeductions.length > 0 && (
          <div className="rounded-lg bg-purple-50 p-4">
            <h5 className="mb-2 text-lg font-medium text-purple-800">
              Dodatkowe odliczenia
            </h5>
            <div className="mb-3 space-y-2">
              {report.additionalDeductions.map((deduction) => {
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
                    <div className="grid grid-cols-5 items-center gap-2 text-center text-sm">
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
                      <div className="flex h-full items-center justify-center gap-2">
                        <button
                          onClick={() => onEditDeduction(deduction)}
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
                          onClick={() => onDeleteDeduction(deduction.id)}
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
                );
              })}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md bg-purple-100 p-3">
                <p className="text-sm text-purple-700">
                  Suma odliczeń (netto):
                </p>
                <p className="text-lg font-bold text-purple-900">
                  -{totalAdditionalDeductions.toFixed(2)} PLN
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
              {/* Usunięto pole 'Pozostało:' */}
            </div>
          </div>
        )}

      {/* Dodatkowe odliczenie */}
      {additionalDeductionData.name && additionalDeductionData.amount > 0 && (
        <div className="rounded-lg bg-purple-50 p-4">
          <h5 className="mb-2 text-lg font-medium text-purple-800">
            Dodatkowe odliczenie: {additionalDeductionData.name}
          </h5>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-md bg-purple-100 p-3">
              <p className="text-sm text-purple-700">Kwota netto:</p>
              <p className="text-lg font-bold text-purple-900">
                -{additionalDeductionData.amount.toFixed(2)} PLN
              </p>
            </div>
            <div className="rounded-md bg-purple-100 p-3">
              <p className="text-sm text-purple-700">VAT:</p>
              <p className="text-lg font-bold text-purple-900">
                {additionalDeductionData.vatOption === "VAT_23"
                  ? `-${(additionalDeductionData.amount * 0.23).toFixed(2)} PLN (23%)`
                  : additionalDeductionData.vatOption === "VAT_8"
                    ? `-${(additionalDeductionData.amount * 0.08).toFixed(2)} PLN (8%)`
                    : "zwolniony"}
              </p>
            </div>
            <div className="rounded-md bg-purple-100 p-3">
              <p className="text-sm text-purple-700">Łącznie do odliczenia:</p>
              <p className="text-xl font-bold text-purple-900">
                -
                {additionalDeductionData.vatOption === "VAT_23"
                  ? (additionalDeductionData.amount * 1.23).toFixed(2)
                  : additionalDeductionData.vatOption === "VAT_8"
                    ? (additionalDeductionData.amount * 1.08).toFixed(2)
                    : additionalDeductionData.amount.toFixed(2)}{" "}
                PLN
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ostateczne rozliczenie z właścicielem (Kwota stała) */}
      {report.owner.paymentType === PaymentType.FIXED_AMOUNT && (
        <>
          <div className="flex flex-col gap-2 rounded-lg bg-green-50 p-4">
            {/* Kwota stała */}
            <div className="mb-2 flex items-center gap-2">
              <input
                type="radio"
                id="final-fixed"
                name="final-payout-type"
                checked={finalPayoutType === LocalPayoutType.FIXED_AMOUNT}
                onChange={() =>
                  handleFinalPayoutTypeChange(LocalPayoutType.FIXED_AMOUNT)
                }
                className="h-4 w-4 border-green-300 text-green-600 focus:ring-green-500"
              />
              <label
                htmlFor="final-fixed"
                className="text-lg font-semibold text-green-800"
              >
                Rozliczenie właściciela: kwota stała
              </label>
              {finalPayoutType === LocalPayoutType.FIXED_AMOUNT && (
                <span className="ml-2 rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-900">
                  Wybrano jako ostateczne
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-md bg-green-100 p-3">
                <p className="text-sm text-green-700">
                  Kwota bazowa{!isVatExempt && " (netto)"}:
                </p>
                <p className="text-lg font-bold text-green-900">
                  {fixedBaseAmountAfterDeductions.toFixed(2)} PLN
                  <span className="block text-xs text-green-600">
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
                </p>
              </div>
              {!isVatExempt && (
                <div className="rounded-md bg-green-100 p-3">
                  <p className="text-sm text-green-700">VAT:</p>
                  <p className="text-lg font-bold text-green-900">
                    {getVatAmount(
                      fixedBaseAmountAfterDeductions,
                      report.owner.vatOption,
                    ).toFixed(2)}{" "}
                    PLN ({report.owner.vatOption === "VAT_8" ? "8" : "23"}%)
                  </p>
                </div>
              )}
              <div className="rounded-md bg-green-100 p-3">
                <p className="text-sm text-green-700">DO WYPŁATY:</p>
                <p className="text-2xl font-bold text-green-900">
                  {isVatExempt
                    ? fixedBaseAmountAfterDeductions.toFixed(2) + " PLN"
                    : getGrossAmount(
                        fixedBaseAmountAfterDeductions,
                        report.owner.vatOption,
                      ).toFixed(2) + " PLN"}
                </p>
              </div>
            </div>
            {/* Kwota stała po odliczeniu mediów */}
            <div className="mb-2 mt-4 flex items-center gap-2">
              <input
                type="radio"
                id="final-fixed-minus-utilities"
                name="final-payout-type"
                checked={
                  finalPayoutType ===
                  LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES
                }
                onChange={() =>
                  handleFinalPayoutTypeChange(
                    LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES,
                  )
                }
                className="h-4 w-4 border-green-300 text-green-600 focus:ring-green-500"
              />
              <label
                htmlFor="final-fixed-minus-utilities"
                className="text-lg font-semibold text-green-800"
              >
                Rozliczenie właściciela: kwota stała po odliczeniu mediów
              </label>
              {finalPayoutType ===
                LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES && (
                <span className="ml-2 rounded bg-green-200 px-2 py-0.5 text-xs font-medium text-green-900">
                  Wybrano jako ostateczne
                </span>
              )}
            </div>
            {finalPayoutType ===
              LocalPayoutType.FIXED_AMOUNT_MINUS_UTILITIES && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-md bg-green-100 p-3">
                  <p className="text-sm text-green-700">
                    Kwota bazowa{!isVatExempt && " (netto)"}:
                  </p>
                  <p className="text-lg font-bold text-green-900">
                    {kwotaBazowaNetto.toFixed(2)} PLN
                    <span className="block text-xs text-green-600">
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
                  </p>
                </div>
                {/* VAT i DO WYPŁATY analogicznie jak w panelu właściciela */}
                {!isVatExempt && (
                  <div className="rounded-md bg-green-100 p-3">
                    <p className="text-sm text-green-700">VAT:</p>
                    <p className="text-lg font-bold text-green-900">
                      {getVatAmount(
                        kwotaBazowaNetto,
                        report.owner.vatOption,
                      ).toFixed(2)}{" "}
                      PLN ({report.owner.vatOption === "VAT_8" ? "8" : "23"}%)
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
            )}
          </div>

          {/* Dodatkowo prezentujemy wariant prowizyjny pod stałą kwotą */}
          <div className="mt-6 flex flex-col gap-2 rounded-lg bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="radio"
                id="final-commission"
                name="final-payout-type"
                checked={finalPayoutType === LocalPayoutType.COMMISSION}
                onChange={() =>
                  handleFinalPayoutTypeChange(LocalPayoutType.COMMISSION)
                }
                className="h-4 w-4 border-blue-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="final-commission"
                className="text-lg font-semibold text-blue-800"
              >
                Rozliczenie właściciela: prowizyjne
              </label>
              {finalPayoutType === LocalPayoutType.COMMISSION && (
                <span className="ml-2 rounded bg-blue-200 px-2 py-0.5 text-xs font-medium text-blue-900">
                  Wybrano jako ostateczne
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-md bg-blue-100 p-3">
                <p className="text-sm text-blue-700">
                  Kwota po prowizji Złote Wynajmy{!isVatExempt && " (netto)"}:
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {netIncomeAfterAdminCommission.toFixed(2)} PLN
                </p>
              </div>
              <div className="rounded-md bg-blue-100 p-3">
                <p className="text-sm text-blue-700">
                  Kwota bazowa{!isVatExempt && " (netto)"}:
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {netIncomeAfterAllDeductions.toFixed(2)} PLN
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
                </p>
              </div>
              {!isVatExempt && (
                <div className="rounded-md bg-blue-100 p-3">
                  <p className="text-sm text-blue-700">VAT:</p>
                  <p className="text-lg font-bold text-blue-900">
                    {getVatAmount(
                      netIncomeAfterAllDeductions,
                      report.owner.vatOption,
                    ).toFixed(2)}{" "}
                    PLN ({report.owner.vatOption === "VAT_8" ? "8" : "23"}%)
                  </p>
                </div>
              )}
              <div className="rounded-md bg-blue-100 p-3">
                <p className="text-sm text-blue-700">DO WYPŁATY:</p>
                <p className="text-2xl font-bold text-blue-900">
                  {isVatExempt
                    ? `${netIncomeAfterAllDeductions.toFixed(2)} PLN`
                    : `${getGrossAmount(netIncomeAfterAllDeductions, report.owner.vatOption).toFixed(2)} PLN`}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
      {/* Ostateczne rozliczenie z właścicielem (Prowizyjne) */}
      {report.owner.paymentType === PaymentType.COMMISSION && (
        <div className="rounded-lg bg-green-50 p-4">
          <h5 className="mb-2 text-lg font-medium text-green-800">
            Ostateczna wypłata dla właściciela (Prowizyjne)
          </h5>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-md bg-green-100 p-3">
              <p className="text-sm text-green-700">
                Kwota po prowizji Złote Wynajmy{!isVatExempt && " (netto)"}:
              </p>
              <p className="text-lg font-bold text-green-900">
                {netIncomeAfterAdminCommission.toFixed(2)} PLN
              </p>
            </div>
            <div className="rounded-md bg-green-100 p-3">
              <p className="text-sm text-green-700">Kwota bazowa (netto):</p>
              <p className="text-lg font-bold text-green-900">
                {netIncomeAfterAllDeductions.toFixed(2)} PLN
                {totalAdditionalDeductionsGross > 0 && (
                  <span className="block text-xs text-green-600">
                    (po odliczeniu {totalAdditionalDeductionsGross.toFixed(2)}{" "}
                    PLN)
                  </span>
                )}
              </p>
            </div>
            {!isVatExempt && (
              <div className="rounded-md bg-green-100 p-3">
                <p className="text-sm text-green-700">VAT:</p>
                <p className="text-lg font-bold text-green-900">
                  {getVatAmount(
                    netIncomeAfterAllDeductions,
                    report.owner.vatOption,
                  ).toFixed(2)}{" "}
                  PLN ({report.owner.vatOption === "VAT_8" ? "8" : "23"}%)
                </p>
              </div>
            )}
            <div className="rounded-md bg-green-100 p-3">
              <p className="text-sm text-green-700">DO WYPŁATY:</p>
              <p className="text-2xl font-bold text-green-900">
                {isVatExempt
                  ? `${netIncomeAfterAllDeductions.toFixed(2)} PLN`
                  : `${getGrossAmount(netIncomeAfterAllDeductions, report.owner.vatOption).toFixed(2)} PLN`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
