import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ChartDataItem {
  name: string;
  value: number;
  fill: string;
  description?: string;
}

interface ChartExplanationCardProps {
  title: string;
  description: string;
  data: ChartDataItem[];
  mode: "costsVsPayout" | "fixedCosts" | "normal";
  showPieChart?: boolean;
  className?: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ChartDataItem;
  }>;
}

const ChartTooltip = ({ active, payload }: TooltipProps) => {
  if (active && payload?.length && payload[0]) {
    const data = payload[0];
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          {data.value.toFixed(1)}%{" "}
          {data.payload.description?.includes("zysku netto")
            ? "zysku netto"
            : data.payload.description?.includes("przychodu")
              ? "przychodu"
              : "podziału"}
        </p>
        {data.payload.description && (
          <p className="mt-1 text-xs text-gray-500">
            {data.payload.description}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function ChartExplanationCard({
  title,
  description,
  data,
  mode,
  showPieChart = true,
  className = "",
}: ChartExplanationCardProps) {
  // Przetwarzanie danych na potrzeby wyświetlenia:
  // - costsVsPayout: normalizacja do 100%
  // - normal/fixedCosts: dopełnienie kafelkiem "Pozostałe", aby suma = 100%
  const processedData = React.useMemo(() => {
    const round1 = (v: number) => Number(v.toFixed(1));

    if (mode === "costsVsPayout") {
      const total = data.reduce((sum, item) => sum + item.value, 0);
      return data.map((item) => ({
        ...item,
        value: total > 0 ? round1((item.value / total) * 100) : 0,
      }));
    }

    // Tryby: normal, fixedCosts → procenty już są liczone względem przychodu.
    // Jeżeli suma < 100 (np. brakujące kategorie lub 0%), dodajemy "Pozostałe".
    const total = data.reduce((sum, item) => sum + item.value, 0);
    const remainder = Math.max(0, round1(100 - total));
    if (remainder > 0.0) {
      return [
        ...data,
        {
          name: "Pozostałe",
          value: remainder,
          fill: "#95a5a6",
          description: "Pozostałe koszty i/lub kategorie nieujęte powyżej",
        },
      ];
    }
    return data;
  }, [data, mode]);

  const getModeColors = () => {
    switch (mode) {
      case "costsVsPayout":
        return "bg-orange-50 border-orange-200";
      case "fixedCosts":
        return "bg-red-50 border-red-200";
      case "normal":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getModeTextColors = () => {
    switch (mode) {
      case "costsVsPayout":
        return "text-orange-800";
      case "fixedCosts":
        return "text-red-800";
      case "normal":
        return "text-blue-800";
      default:
        return "text-gray-800";
    }
  };

  const getModeDescriptionColors = () => {
    switch (mode) {
      case "costsVsPayout":
        return "text-orange-700";
      case "fixedCosts":
        return "text-red-700";
      case "normal":
        return "text-blue-700";
      default:
        return "text-gray-700";
    }
  };

  const getModeHeaderColors = () => {
    switch (mode) {
      case "costsVsPayout":
        return "bg-orange-100 text-orange-600";
      case "fixedCosts":
        return "bg-red-100 text-red-600";
      case "normal":
        return "bg-blue-100 text-blue-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  // Removed unused helpers getCategoryColors/getCategoryValueColors in favor of using item.fill

  // Helper: convert HEX color to rgba with opacity
  const hexToRgba = (hex: string, alpha = 1): string => {
    const sanitized = hex.replace("#", "");
    const expanded =
      sanitized.length === 3
        ? sanitized
            .split("")
            .map((c) => c + c)
            .join("")
        : sanitized;
    const bigint = parseInt(expanded, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const totalPercentage = processedData.reduce(
    (sum, item) => sum + item.value,
    0,
  );
  const missingPercentage = Math.max(
    0,
    Number((100 - totalPercentage).toFixed(1)),
  );

  // Kolejność kafelków: 1) Wypłata Właściciela, 2) Prowizja Złote Wynajmy, reszta w oryginalnej kolejności
  const orderedTiles = React.useMemo(() => {
    const priorityNames = [
      "Wypłata Właściciela",
      "Prowizja Złote Wynajmy",
      "Złote Wynajmy Prowizja", // alternatywna etykieta
    ];
    const seen = new Set<string>();
    const result: ChartDataItem[] = [];
    for (const name of priorityNames) {
      const found = processedData.find((i) => i.name === name);
      if (found && !seen.has(found.name)) {
        result.push(found);
        seen.add(found.name);
      }
      if (result.length === 2) break;
    }
    for (const item of processedData) {
      if (!seen.has(item.name)) result.push(item);
    }
    return result;
  }, [processedData]);

  return (
    <div
      className={`rounded-lg border p-3 shadow sm:p-4 lg:p-6 ${getModeColors()} ${className}`}
    >
      <h4 className="mb-3 text-sm font-semibold text-gray-800">
        Wyjaśnienie trybów wykresu
      </h4>

      <div className="space-y-3">
        <div className={`rounded-md p-3 ${getModeColors()}`}>
          <h5 className={`mb-2 font-medium ${getModeTextColors()}`}>
            Tryb: {title}
          </h5>
          <p className={`text-sm ${getModeDescriptionColors()}`}>
            {description}
          </p>

          {/* Header w stylu raportów */}
          <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 px-4 py-3">
              <div className="flex items-center space-x-2">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${getModeHeaderColors()}`}
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
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    Aktualne wyliczenia
                  </h4>
                  <p className="text-sm text-gray-600">
                    {mode === "costsVsPayout"
                      ? "Podział między właścicielem a Złote Wynajmy"
                      : "Pełen udział wszystkich składowych inwestycji w przychodzie"}
                  </p>
                  <p className="text-sm text-gray-600">
                    {mode === "costsVsPayout"
                      ? "Wszystkie wartości wyświetlone jako procent podziału. Najedź na dowolną kategorię aby zobaczyć szczegółowy opis."
                      : "Wszystkie kategorie wyświetlone osobno z własnymi procentami. Najedź na dowolną kategorię aby zobaczyć szczegółowy opis."}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4">
              {processedData.length > 0 ? (
                <div className="space-y-3">
                  {(() => {
                    const row1 = orderedTiles.slice(0, 2);
                    const row2 = orderedTiles.slice(2, 6);
                    const row3 = orderedTiles.slice(6, 10);

                    const renderRow = (
                      items: typeof orderedTiles,
                      startIndex: number,
                      colsClass: string,
                    ) => (
                      <div className={`grid grid-cols-1 ${colsClass} gap-3`}>
                        {items.map((item) => {
                          const fill = item.fill || "#888888";
                          return (
                            <div
                              key={item.name}
                              className={`group relative rounded-lg p-3 text-center`}
                              style={{
                                backgroundColor: hexToRgba(fill, 0.08),
                                border: `1px solid ${hexToRgba(fill, 0.35)}`,
                              }}
                            >
                              <span className="block text-sm font-medium">
                                {item.name}
                              </span>
                              <span
                                className={`mt-1 block text-2xl font-bold`}
                                style={{ color: fill }}
                              >
                                {item.value.toFixed(1)}%
                              </span>
                              {item.description && (
                                <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-gray-900 px-3 py-2 text-xs text-white group-hover:block">
                                  {item.description}
                                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );

                    return (
                      <>
                        {row1.length > 0 &&
                          renderRow(row1, 0, "sm:grid-cols-2")}
                        {row2.length > 0 &&
                          renderRow(
                            row2,
                            row1.length,
                            "sm:grid-cols-2 lg:grid-cols-4",
                          )}
                        {row3.length > 0 &&
                          renderRow(
                            row3,
                            row1.length + row2.length,
                            "sm:grid-cols-2 lg:grid-cols-4",
                          )}
                      </>
                    );
                  })()}

                  <div className="mt-4 rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {mode === "costsVsPayout"
                        ? "Suma podziału"
                        : "Suma kategorii"}
                      : {totalPercentage.toFixed(1)}%
                    </p>
                    {mode !== "costsVsPayout" && missingPercentage > 0 && (
                      <p className="mt-1 text-sm text-gray-600">
                        Pozostałe {missingPercentage.toFixed(1)}% to inne koszty
                      </p>
                    )}
                    {mode === "costsVsPayout" && (
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-gray-600">
                          Przewidziany podział: 75% (Właściciel + Czynsz +
                          Media) + 25% (Prowizja Złote Wynajmy)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 p-6 text-center">
                  <p className="text-gray-500">Brak danych do wyliczenia</p>
                </div>
              )}
            </div>
          </div>

          {/* Mini wykres kołowy */}
          {showPieChart && processedData.length > 0 && (
            <div className="mt-4">
              <h6 className="mb-2 text-sm font-medium text-gray-700">
                Podział procentowy:
              </h6>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={processedData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                  >
                    {processedData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
