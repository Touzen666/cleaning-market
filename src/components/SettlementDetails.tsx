import { useState, useEffect } from "react";
import { type SettlementType } from "@prisma/client";
import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";
import type { inferRouterOutputs } from "@trpc/server";
import type { appRouter } from "@/server/api/root";

type RouterOutputs = inferRouterOutputs<typeof appRouter>;
type ReportDetails = RouterOutputs["monthlyReports"]["getById"];

interface SettlementDetailsProps {
  report: ReportDetails;
  onUpdate: () => void;
}

export function SettlementDetails({
  report,
  onUpdate,
}: SettlementDetailsProps) {
  const [settlementType, setSettlementType] = useState<SettlementType | null>(
    null,
  );
  const [rentAmount, setRentAmount] = useState<number | null>(null);
  const [utilitiesAmount, setUtilitiesAmount] = useState<number | null>(null);

  useEffect(() => {
    setSettlementType(report.finalSettlementType);
    setRentAmount(report.rentAmount ?? report.suggestedRent);
    setUtilitiesAmount(report.utilitiesAmount ?? report.suggestedUtilities);
  }, [report]);

  const updateSettlementMutation =
    api.monthlyReports.updateSettlementDetails.useMutation({
      onSuccess: () => {
        toast.success("Szczegóły rozliczenia zostały zaktualizowane.");
        onUpdate();
      },
      onError: (error) => {
        toast.error(`Błąd: ${error.message}`);
      },
    });

  const handleSave = () => {
    if (!settlementType) {
      toast.error("Proszę wybrać typ rozliczenia.");
      return;
    }
    updateSettlementMutation.mutate({
      reportId: report.id,
      finalSettlementType: settlementType,
      rentAmount: rentAmount ?? 0,
      utilitiesAmount: utilitiesAmount ?? 0,
    });
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6">
      <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-6">
        <div className="sm:col-span-3">
          <label
            htmlFor="settlementType"
            className="block text-sm font-medium text-gray-700"
          >
            Typ rozliczenia
          </label>
          <select
            id="settlementType"
            name="settlementType"
            value={settlementType ?? ""}
            onChange={(e) =>
              setSettlementType(e.target.value as SettlementType)
            }
            className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
            disabled={report.status === "SENT"}
          >
            <option value="" disabled>
              Wybierz typ...
            </option>
            <option value="COMMISSION">Prowizja od przychodu</option>
            <option value="FIXED">Stała kwota</option>
            <option value="FIXED_MINUS_UTILITIES">Stała kwota - media</option>
          </select>
        </div>

        {(settlementType === "COMMISSION" ||
          settlementType === "FIXED_MINUS_UTILITIES") && (
          <>
            <div className="sm:col-span-3"></div>
            <div className="sm:col-span-3">
              <label
                htmlFor="rentAmount"
                className="block text-sm font-medium text-gray-700"
              >
                Sugerowany czynsz ({report.suggestedRent?.toFixed(2)} PLN)
              </label>
              <input
                type="number"
                name="rentAmount"
                id="rentAmount"
                value={rentAmount ?? ""}
                onChange={(e) => setRentAmount(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={report.suggestedRent?.toString()}
                disabled={report.status === "SENT"}
              />
            </div>

            <div className="sm:col-span-3">
              <label
                htmlFor="utilitiesAmount"
                className="block text-sm font-medium text-gray-700"
              >
                Sugerowane media ({report.suggestedUtilities?.toFixed(2)} PLN)
              </label>
              <input
                type="number"
                name="utilitiesAmount"
                id="utilitiesAmount"
                value={utilitiesAmount ?? ""}
                onChange={(e) => setUtilitiesAmount(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder={report.suggestedUtilities?.toString()}
                disabled={report.status === "SENT"}
              />
            </div>
          </>
        )}
      </div>

      {report.status !== "SENT" && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!settlementType || updateSettlementMutation.isPending}
            className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-indigo-700"
          >
            {updateSettlementMutation.isPending
              ? "Zapisywanie..."
              : "Zapisz zmiany rozliczenia"}
          </button>
        </div>
      )}
    </div>
  );
}
