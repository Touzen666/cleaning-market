import React from "react";
import { type VATOption } from "@prisma/client";

type Deduction = {
  id: string;
  name: string;
  amount: number;
  vatOption: VATOption;
};

type Props = {
  deductions: Deduction[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

const AdditionalDeductionsList: React.FC<Props> = ({
  deductions,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="mb-3 space-y-2">
      {deductions.map((deduction) => {
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
          <div key={deduction.id} className="mb-2 rounded-md bg-purple-100 p-3">
            <div className="mb-2 text-sm font-medium text-purple-900">
              {deduction.name}
            </div>
            <div
              className={`grid ${(onEdit ?? onDelete) ? "grid-cols-5" : "grid-cols-4"} items-center gap-2 text-center text-sm`}
            >
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
                <div className="font-semibold text-purple-700">
                  Kwota brutto
                </div>
                <div className="font-bold text-purple-900">
                  -{grossAmount.toFixed(2)} PLN
                </div>
              </div>
              {((onEdit ?? false) || (onDelete ?? false)) && (
                <div className="flex h-full items-center justify-center gap-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(deduction.id)}
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
                  )}
                  {onDelete && (
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
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AdditionalDeductionsList;
