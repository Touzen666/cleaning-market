"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type RouterOutputs } from "@/trpc/react";
import { CleaningCandidatesPanel } from "../_components/candidates-panel";

type Response = RouterOutputs["cleaning"]["listOverview"];
type Scenario = "full" | "empty" | "error" | "loading";

export function CleaningPreviewClient({
  initialData,
}: {
  initialData: Response;
}) {
  const [scenario, setScenario] = useState<Scenario>("full");
  const [range, setRange] = useState({
    from: initialData.from,
    to: initialData.to,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(initialData.fetchedAt);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(
    () => () => {
      clearTimeout(refreshTimer.current);
    },
    [],
  );

  const data = useMemo(() => {
    const inRange = (day: string) => day >= range.from && day < range.to;
    const candidates =
      scenario === "empty"
        ? []
        : initialData.candidates.filter((candidate) =>
            inRange(candidate.serviceDate),
          );
    const reviews =
      scenario === "empty"
        ? []
        : initialData.reviews.filter((candidate) =>
            inRange(candidate.serviceDate),
          );
    // Inactive reservations have no public checkout date. Show exclusions only for the complete fixture range.
    const excluded =
      scenario === "empty" ||
      range.from !== initialData.from ||
      range.to !== initialData.to
        ? []
        : initialData.excluded;
    return {
      ...initialData,
      ...range,
      candidates,
      reviews,
      excluded,
      fetchedAt,
      overview:
        scenario === "empty"
          ? { ...initialData.overview, reservations: [], locks: [] }
          : initialData.overview,
      counts: {
        acceptedCandidates: candidates.filter(
          (candidate) => candidate.certainty === "accepted",
        ).length,
        provisionalCandidates: candidates.filter(
          (candidate) => candidate.certainty === "provisional",
        ).length,
        reviews: reviews.length,
        excluded: excluded.length,
      },
    };
  }, [initialData, range, scenario, fetchedAt]);

  function refresh() {
    clearTimeout(refreshTimer.current);
    setRefreshing(true);
    refreshTimer.current = setTimeout(() => {
      setFetchedAt(new Date().toISOString());
      setRefreshing(false);
    }, 850);
  }

  return (
    <div
      lang="pl"
      className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-8"
    >
      <div className="mx-auto max-w-[1800px] space-y-5">
        <section
          aria-label="Ustawienia podglądu"
          className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <p className="font-semibold">Podgląd testowy — dane fikcyjne</p>
          <p className="mt-1 text-sm">
            Ten widok działa tylko w trybie development. Pokazuje przykładowe
            sprzątania i nie pobiera ani nie zapisuje danych rezerwacji.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <label
              className="flex flex-col gap-1 text-sm font-medium"
              htmlFor="preview-scenario"
            >
              Scenariusz testowy
              <select
                id="preview-scenario"
                value={scenario}
                onChange={(event) => {
                  setScenario(event.target.value as Scenario);
                  setRefreshing(false);
                  clearTimeout(refreshTimer.current);
                }}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-900"
              >
                <option value="full">Pełny wynik</option>
                <option value="empty">Pusty wynik</option>
                <option value="error">Błąd pobierania</option>
                <option value="loading">Ładowanie danych</option>
              </select>
            </label>
            <p className="pb-2 text-sm">
              Dane przykładowe: {initialData.from} – {initialData.to} (koniec
              zakresu wyłączny).
            </p>
          </div>
        </section>
        <CleaningCandidatesPanel
          data={
            scenario === "error" || scenario === "loading" ? undefined : data
          }
          loading={scenario === "loading"}
          refreshing={refreshing}
          error={
            scenario === "error"
              ? "Nie udało się pobrać kompletnej listy rezerwacji. To symulowany błąd połączenia."
              : undefined
          }
          range={range}
          onRangeChange={setRange}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
