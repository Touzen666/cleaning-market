"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";

interface ImportSummary {
  apartmentsCreated: number;
  apartmentsSkipped: number;
  reservationsCreated: number;
  reservationsSkipped: number;
  totalRows: number;
  errors: number;
}

export default function CsvImport() {
  const [csvData, setCsvData] = useState<string>("");
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(
    null,
  );
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [importBatchId, setImportBatchId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    processed: number;
    total: number;
    done: boolean;
    errors: number;
  } | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const importMutation = api.csvImport.importReservations.useMutation({
    onSuccess: (data) => {
      setImportSummary(data.summary);
      setImportBatchId(data.importBatchId);
      setIsImporting(false);
      toast.success("Import zakończony pomyślnie!");
    },
    onError: (error) => {
      toast.error(`Błąd importu: ${error.message}`);
      setIsImporting(false);
    },
  });

  // Polling progresu importu CSV
  useEffect(() => {
    if (!importBatchId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        // Użyj fetch do pobrania progresu z tRPC endpointu
        const url = `/api/trpc/csvImport.getCsvImportProgress?input=${encodeURIComponent(JSON.stringify({ importBatchId }))}`;
        const res = await fetch(url);
        type ProgressResponse = {
          result?: {
            data?: {
              processed: number;
              total: number;
              done: boolean;
              errors: number;
            };
          };
        };
        const json = (await res.json()) as ProgressResponse;
        const data = json.result?.data;
        if (!cancelled && data) {
          setProgress(data);
          if (!data.done) {
            pollingRef.current = setTimeout(() => {
              void poll();
            }, 1000);
          }
        }
      } catch {
        setProgress(null);
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [importBatchId]);

  const statsQuery = api.csvImport.getImportStats.useQuery();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);

      // Przygotuj podgląd danych
      const lines = content.split("\n").slice(0, 6); // Pierwsze 5 wierszy + nagłówek
      const preview = lines.map((line) =>
        line.split(";").map((cell) => cell.trim().replace(/"/g, "")),
      );
      setPreviewData(preview);

      setImportSummary(null);
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".csv"],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!csvData) {
      toast.error("Najpierw wybierz plik CSV");
      return;
    }

    setIsImporting(true);
    setImportBatchId(null);
    setProgress(null);
    importMutation.mutate({ csvData });
  };

  const clearData = () => {
    setCsvData("");
    setPreviewData([]);
    setImportSummary(null);
    setImportBatchId(null);
    setProgress(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold text-gray-900">
          Import rezerwacji z CSV
        </h2>
        <p className="mb-6 text-gray-600">
          Wybierz plik CSV z rezerwacjami. System automatycznie utworzy
          apartamenty i rezerwacje, sprawdzając unikalność na podstawie nazwy
          apartamentu oraz kombinacji pól rezerwacji.
        </p>
      </div>

      {/* Statystyki systemu */}
      {statsQuery.data && (
        <div className="border-brand-gold rounded-lg border bg-yellow-50 p-4">
          <h3 className="mb-2 text-lg font-semibold text-yellow-900">
            Statystyki systemu
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-yellow-600">Apartamenty:</span>
              <span className="ml-2 font-medium">
                {statsQuery.data.totalApartments}
              </span>
            </div>
            <div>
              <span className="text-yellow-600">Rezerwacje:</span>
              <span className="ml-2 font-medium">
                {statsQuery.data.totalReservations}
              </span>
            </div>
            <div>
              <span className="text-yellow-600">Statusy:</span>
              <span className="ml-2 font-medium">
                {statsQuery.data.uniqueStatuses.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload pliku */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragActive
            ? "border-brand-gold bg-yellow-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive
                ? "Upuść plik tutaj"
                : "Kliknij lub przeciągnij plik CSV"}
            </p>
            <p className="text-sm text-gray-500">Obsługiwane formaty: .csv</p>
          </div>
        </div>
      </div>

      {/* Podgląd danych */}
      {previewData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Podgląd danych
            </h3>
            <p className="text-sm text-gray-500">
              Pierwsze 5 wierszy z pliku CSV
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {previewData[0]?.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {previewData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="whitespace-nowrap px-6 py-4 text-sm text-gray-900"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Przyciski akcji */}
      {csvData && (
        <div className="flex space-x-4">
          <button
            onClick={handleImport}
            disabled={isImporting}
            className="bg-brand-gold focus:ring-brand-gold inline-flex items-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <svg
                  className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
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
                Importowanie...
              </>
            ) : (
              "Rozpocznij import"
            )}
          </button>
          <button
            onClick={clearData}
            disabled={isImporting}
            className="focus:ring-brand-gold inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Wyczyść
          </button>
        </div>
      )}

      {/* Podsumowanie importu */}
      {importSummary && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-green-900">
            Import zakończony pomyślnie!
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {importSummary.apartmentsCreated}
              </div>
              <div className="text-sm text-green-700">Nowe apartamenty</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {importSummary.reservationsCreated}
              </div>
              <div className="text-sm text-yellow-700">Nowe rezerwacje</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {importSummary.apartmentsSkipped}
              </div>
              <div className="text-sm text-gray-700">Apartamenty pominięte</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {importSummary.reservationsSkipped}
              </div>
              <div className="text-sm text-gray-700">Rezerwacje pominięte</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-green-700">
            Przetworzono {importSummary.totalRows} wierszy z pliku CSV.
            {importSummary.errors > 0 && (
              <span className="ml-2 text-orange-600">
                {importSummary.errors} błędów podczas importu.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Informacje o funkcjonalności */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">
          Jak działa import?
        </h3>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>
              System automatycznie naprawia polskie znaki (np.
              &quot;Podwisi_c_Przyja_ta&quot; → &quot;Podwisłą Przyjaźń&quot;)
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>
              Apartamenty są tworzone na podstawie kolumny &quot;Miejsca
              noclegowe&quot; - duplikaty są pomijane
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>
              Rezerwacje są sprawdzane pod kątem unikalności (ID + apartament +
              daty + gość)
            </span>
          </li>
          <li className="flex items-start">
            <span className="mr-2 text-green-500">✓</span>
            <span>
              Możesz importować kolejne pliki CSV - system nie utworzy
              duplikatów
            </span>
          </li>
        </ul>
      </div>

      {/* Pasek postępu importu CSV */}
      {isImporting && progress && (
        <div className="my-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>
              Postęp importu: {progress.processed} / {progress.total}
            </span>
            <span>{progress.done ? "Zakończono" : "Trwa..."}</span>
          </div>
          <div className="relative h-4 w-full rounded bg-gray-200">
            <div
              className="absolute left-0 top-0 h-4 rounded bg-green-500 transition-all"
              style={{
                width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`,
              }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-red-500">
            Błędy: {progress.errors}
          </div>
        </div>
      )}
    </div>
  );
}
