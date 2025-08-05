import { useMemo } from "react";
import { api } from "@/trpc/react";

// Typy danych wykresów
export type BaseChartDataItem = {
    name: string;
    Przychód: number;
    Sprzątanie: number;
    Pranie: number;
    Tekstylia: number;
    Czynsz: number;
    Media: number;
    "Złote Wynajmy Prowizja": number;
    "Prowizje OTA": number;
    "Wypłata Właściciela": number;
    "Koszty stałe": number;
    "Inne wydatki": number;
};

export type PieChartDataItem = {
    name: string;
    value: number;
    fill: string;
};

export type RevenueSourceDataItem = {
    name: string;
    value: number; // Value in PLN for calculations
    percentage: number; // Percentage for labels
    fill: string;
};

export type ChartPercentages = {
    adminCommission: number;
    fixedCosts: number;
    cleaning: number;
    laundry: number;
    textiles: number;
    rent: number;
    utilities: number;
    otaCommissions: number;
    payout: number;
    otherExpenses: number;
};

// Hook do zarządzania danymi wykresów
export function useChartData(
    ownerEmail?: string,
    apartmentId?: number,
    reportId?: string,
    viewType: "yearly" | "monthly" | "single" = "single",
    year?: number,
    month?: number
) {
    // Główne zapytanie o dane wykresów z cache
    const { data: chartDataRaw, isLoading } = api.monthlyReports.getOwnerFilteredReports.useQuery(
        {
            ownerEmail: ownerEmail ?? "",
            apartmentId,
            reportId,
            viewType,
            year,
            month,
        },
        {
            enabled: !!ownerEmail,
            staleTime: 5 * 60 * 1000, // 5 minut cache
        }
    );

    // Przygotowanie podstawowych danych wykresu
    const baseChartData = useMemo((): BaseChartDataItem[] => {
        if (!chartDataRaw?.chartData) return [];
        return chartDataRaw.chartData;
    }, [chartDataRaw]);

    // Kalkulacja procentów na podstawie pierwszego elementu (dla single view)
    const percentages = useMemo((): ChartPercentages | null => {
        if (!baseChartData.length) return null;

        const data = baseChartData[0];
        if (!data) return null;

        const totalRevenue = data.Przychód ?? 0;
        if (totalRevenue === 0) return null;

        return {
            adminCommission: (data["Złote Wynajmy Prowizja"] ?? 0) / totalRevenue * 100,
            fixedCosts: (data["Koszty stałe"] ?? 0) / totalRevenue * 100,
            cleaning: (data.Sprzątanie ?? 0) / totalRevenue * 100,
            laundry: (data.Pranie ?? 0) / totalRevenue * 100,
            textiles: (data.Tekstylia ?? 0) / totalRevenue * 100,
            rent: (data.Czynsz ?? 0) / totalRevenue * 100,
            utilities: (data.Media ?? 0) / totalRevenue * 100,
            otaCommissions: (data["Prowizje OTA"] ?? 0) / totalRevenue * 100,
            payout: (data["Wypłata Właściciela"] ?? 0) / totalRevenue * 100,
            otherExpenses: (data["Inne wydatki"] ?? 0) / totalRevenue * 100,
        };
    }, [baseChartData]);

    // Przygotowanie danych dla wykresu kołowego (używa procentów zamiast wartości PLN)
    const pieChartData = useMemo((): PieChartDataItem[] => {
        if (!baseChartData.length || !percentages) return [];

        const data = baseChartData[0];
        if (!data) return [];

        const totalRevenue = data.Przychód ?? 0;
        if (totalRevenue === 0) return [];

        return [
            {
                name: "Wypłata Właściciela",
                value: percentages.payout,
                fill: "#00C49F",
            },
            {
                name: "Prowizja Złote Wynajmy",
                value: percentages.adminCommission,
                fill: "#ffc658",
            },
            {
                name: "Prowizje OTA",
                value: percentages.otaCommissions,
                fill: "#ff8042",
            },
            {
                name: "Sprzątanie",
                value: percentages.cleaning,
                fill: "#8884d8",
            },
            {
                name: "Pranie",
                value: percentages.laundry,
                fill: "#ff6b6b",
            },
            {
                name: "Tekstylia",
                value: percentages.textiles,
                fill: "#9c27b0",
            },
            {
                name: "Inne wydatki",
                value: percentages.otherExpenses,
                fill: "#95a5a6",
            },
        ].filter(item => item.value > 0); // Usuń zerowe wartości
    }, [baseChartData, percentages]);

    // Funkcja do filtrowania danych wykresu słupkowego na podstawie filtrów
    const getFilteredBarChartData = useMemo(() => {
        return (filters: Record<string, boolean>) => {
            return baseChartData.map(item => {
                const filteredItem: Partial<BaseChartDataItem> = { name: item.name };

                if (filters.Przychód) filteredItem.Przychód = item.Przychód;
                if (filters.Sprzątanie) filteredItem.Sprzątanie = item.Sprzątanie;
                if (filters.Pranie) filteredItem.Pranie = item.Pranie;
                if (filters.Tekstylia) filteredItem.Tekstylia = item.Tekstylia;
                if (filters["Złote Wynajmy Prowizja"]) filteredItem["Złote Wynajmy Prowizja"] = item["Złote Wynajmy Prowizja"];
                if (filters["Prowizje OTA"]) filteredItem["Prowizje OTA"] = item["Prowizje OTA"];
                if (filters["Wypłata Właściciela"]) filteredItem["Wypłata Właściciela"] = item["Wypłata Właściciela"];
                if (filters["Koszty stałe"]) filteredItem["Koszty stałe"] = item["Koszty stałe"];
                if (filters["Inne wydatki"]) filteredItem["Inne wydatki"] = item["Inne wydatki"];

                return filteredItem as BaseChartDataItem;
            });
        };
    }, [baseChartData]);

    // Funkcja do uzyskania danych dla mini wykresu kołowego w trybach specjalnych
    const getMiniPieData = useMemo(() => {
        return (mode: "normal" | "costsVsPayout" | "fixedCosts") => {
            if (!percentages || !baseChartData.length) return [];

            const data = baseChartData[0];
            if (!data) return [];

            switch (mode) {
                case "costsVsPayout":
                    return [
                        {
                            name: "Złote Wynajmy Prowizja",
                            value: percentages.adminCommission,
                            fill: "#ffc658",
                        },
                        {
                            name: "Wypłata Właściciela",
                            value: percentages.payout,
                            fill: "#00C49F",
                        },
                        {
                            name: "Koszty stałe",
                            value: percentages.fixedCosts,
                            fill: "#ff6b6b",
                        },
                        {
                            name: "Przychód",
                            value: 100, // Przychód jako baseline
                            fill: "#82ca9d",
                        },
                    ].filter(item => item.value > 0);

                case "fixedCosts":
                    return [
                        {
                            name: "Sprzątanie",
                            value: percentages.cleaning,
                            fill: "#8884d8",
                        },
                        {
                            name: "Pranie",
                            value: percentages.laundry,
                            fill: "#ff6b6b",
                        },
                        {
                            name: "Tekstylia",
                            value: percentages.textiles,
                            fill: "#9c27b0",
                        },
                        {
                            name: "Prowizje OTA",
                            value: percentages.otaCommissions,
                            fill: "#ff8042",
                        },
                    ].filter(item => item.value > 0);

                case "normal":
                default:
                    return [
                        {
                            name: "Wypłata Właściciela",
                            value: percentages.payout,
                            fill: "#00C49F",
                        },
                        {
                            name: "Prowizja Złote Wynajmy",
                            value: percentages.adminCommission,
                            fill: "#ffc658",
                        },
                        {
                            name: "Prowizje OTA",
                            value: percentages.otaCommissions,
                            fill: "#ff8042",
                        },
                        {
                            name: "Sprzątanie",
                            value: percentages.cleaning,
                            fill: "#8884d8",
                        },
                        {
                            name: "Pranie",
                            value: percentages.laundry,
                            fill: "#ff6b6b",
                        },
                        {
                            name: "Tekstylia",
                            value: percentages.textiles,
                            fill: "#9c27b0",
                        },
                    ].filter(item => item.value > 0);
            }
        };
    }, [percentages, baseChartData]);

    // Przygotowanie danych dla wykresu źródeł przychodów (rzeczywiste platformy: Booking, Airbnb, itp.)
    const revenueSourceData = useMemo((): RevenueSourceDataItem[] => {
        if (!chartDataRaw?.reports) return [];

        // Agregujemy przychody według źródeł (platform)
        const sourceRevenue: Record<string, number> = {};

        chartDataRaw.reports.forEach(report => {
            report.items
                .filter(item => item.type === "REVENUE" && item.reservation)
                .forEach(item => {
                    const source = item.reservation?.source ?? "Booking"; // Default to Booking if no source
                    sourceRevenue[source] = (sourceRevenue[source] ?? 0) + item.amount;
                });
        });

        // Konwertujemy na format wykresu kołowego
        const sourceColors: Record<string, string> = {
            "Booking": "#003580",      // Booking blue
            "Airbnb": "#FF5A5F",       // Airbnb red
            "Złote Wynajmy": "#FFD700", // Gold
            "Inne": "#808080",          // Gray for others
        };

        // Calculate total revenue for percentage calculation
        const totalRevenue = Object.values(sourceRevenue).reduce((sum, value) => sum + value, 0);

        return Object.entries(sourceRevenue)
            .filter(([_, value]) => value > 0)
            .map(([source, value]) => ({
                name: source,
                value,
                percentage: totalRevenue > 0 ? (value / totalRevenue) * 100 : 0,
                fill: sourceColors[source] ?? sourceColors.Inne!,
            }))
            .sort((a, b) => b.value - a.value); // Sort by value descending
    }, [chartDataRaw]);

    return {
        baseChartData,
        pieChartData,
        revenueSourceData,
        percentages,
        isLoading,
        getFilteredBarChartData,
        getMiniPieData,
    };
}