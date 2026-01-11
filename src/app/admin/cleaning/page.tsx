"use client";
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */

import React from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

type Task = {
  id: string;
  text: string;
  area:
    | "Ogólne"
    | "Kuchnia"
    | "Łazienka"
    | "Sypialnia"
    | "Salon"
    | "Korytarz"
    | "Balkon/Inne";
};

export default function AdminCleaningPage() {
  const router = useRouter();
  const [step, setStep] = React.useState<number>(1);

  // Step 1: Zakres
  const [apartmentScope, setApartmentScope] = React.useState<
    "all" | "selected"
  >("all");
  const [applyToRooms, setApplyToRooms] = React.useState<boolean>(true);

  // Step 2: Wyzwalacze
  const [triggerOnCheckout, setTriggerOnCheckout] =
    React.useState<boolean>(true);
  const [weekdayPlan, setWeekdayPlan] = React.useState<Record<string, boolean>>(
    {
      Mon: false,
      Tue: false,
      Wed: false,
      Thu: false,
      Fri: false,
      Sat: false,
      Sun: false,
    },
  );

  // Step 3: Zadania
  const [tasks, setTasks] = React.useState<Task[]>([
    {
      id: crypto.randomUUID(),
      area: "Ogólne",
      text: "Podlać kwiatki jeśli mają sucho.",
    },
    {
      id: crypto.randomUUID(),
      area: "Ogólne",
      text: "Wyprać oraz rozwiesić pościel.",
    },
    {
      id: crypto.randomUUID(),
      area: "Ogólne",
      text: "Odkurzyć a potem umyć podłogę.",
    },
  ]);
  const [newTaskText, setNewTaskText] = React.useState<string>("");
  const [newTaskArea, setNewTaskArea] = React.useState<Task["area"]>("Ogólne");

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setTasks((t) => [
      ...t,
      { id: crypto.randomUUID(), text: newTaskText.trim(), area: newTaskArea },
    ]);
    setNewTaskText("");
  };
  const removeTask = (id: string) =>
    setTasks((t) => t.filter((x) => x.id !== id));

  const areas: Task["area"][] = [
    "Ogólne",
    "Kuchnia",
    "Łazienka",
    "Sypialnia",
    "Salon",
    "Korytarz",
    "Balkon/Inne",
  ];

  // Sekcja przypisań: lista zadań jak u cleanera + lista sprzątaczek
  const [daysAhead, setDaysAhead] = React.useState(7);
  const [search, setSearch] = React.useState("");
  const [view, setView] = React.useState<"assign" | "calendar">("assign");

  // Odczytaj widok z URL (np. ?view=calendar)
  React.useEffect(() => {
    try {
      const params =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : undefined;
      const v = (params?.get("view") ?? "").toLowerCase();
      if (v === "calendar") setView("calendar");
      else if (v === "assign") setView("assign");
    } catch {
      // ignore
    }
  }, []);
  const {
    data: jobsData,
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = api.cleaning.listJobs.useQuery({
    daysAhead,
    query: search || undefined,
  });
  const {
    data: cleanersData,
    isLoading: cleanersLoading,
    error: cleanersError,
    refetch: refetchCleaners,
  } = api.cleaning.listCleaners.useQuery();

  // Calendar data
  const startOfWeek = React.useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7; // make Monday=0
    const monday = new Date(d);
    monday.setDate(d.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }, []);
  const [weekStart, setWeekStart] = React.useState<Date>(startOfWeek);
  const weekEnd = React.useMemo(() => {
    const e = new Date(weekStart);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }, [weekStart]);
  const [calendarApartment, setCalendarApartment] = React.useState<
    number | "ALL"
  >("ALL");
  const apartmentsBasic = api.cleaning.listApartmentsBasic.useQuery(undefined, {
    staleTime: 60_000,
  });
  const calendarQuery = api.cleaning.calendar.useQuery(
    {
      start: weekStart.toISOString(),
      end: weekEnd.toISOString(),
      apartmentId:
        typeof calendarApartment === "number" ? calendarApartment : undefined,
    },
    {
      enabled: view === "calendar",
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
      staleTime: 5_000,
    },
  );
  const assignMutation = api.cleaning.assignCleaner.useMutation({
    onSuccess: () => refetchJobs(),
  });
  const registerCleaner = api.cleaningAuth.register.useMutation({
    onSuccess: () => refetchCleaners(),
  });
  const [newCleanerEmail, setNewCleanerEmail] = React.useState("");
  const [newCleanerPassword, setNewCleanerPassword] = React.useState("");

  // Modal: add cleaning between reservations
  const [cleaningModal, setCleaningModal] = React.useState<{
    open: boolean;
    apartment?: string;
    gapStart?: Date;
    gapEnd?: Date;
  }>({ open: false });
  const openCleaningForGap = (
    apartment: string,
    gapStart: Date,
    gapEnd: Date,
  ) => {
    setCleaningModal({ open: true, apartment, gapStart, gapEnd });
  };
  const closeCleaningModal = () => setCleaningModal({ open: false });

  // ---------- helpers & memos (redukcja redundancji) ----------
  const totalWeekMs = 7 * 86_400_000;

  const getMiddayTs = React.useCallback(
    (dayIndex: number) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + dayIndex);
      d.setHours(12, 30, 0, 0);
      return d.getTime();
    },
    [weekStart],
  );

  const dayLeftPercents = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const ts = getMiddayTs(i);
      return ((ts - weekStart.getTime()) / totalWeekMs) * 100;
    });
  }, [getMiddayTs, weekStart, totalWeekMs]);

  // zaokrąglenie w dół do pełnych wartości procentowych (używane dla linii i plusów)
  const dayLeftPercentsInt = React.useMemo(
    () => dayLeftPercents.map((v) => Math.floor(v)),
    [dayLeftPercents],
  );

  const mergeIntervals = React.useCallback(
    (intervals: Array<{ start: number; end: number }>) => {
      const merged: Array<{ start: number; end: number }> = [];
      intervals
        .slice()
        .sort((a, b) => a.start - b.start)
        .forEach((it) => {
          if (
            merged.length === 0 ||
            it.start > merged[merged.length - 1]!.end
          ) {
            merged.push({ ...it });
          } else {
            merged[merged.length - 1]!.end = Math.max(
              merged[merged.length - 1]!.end,
              it.end,
            );
          }
        });
      return merged;
    },
    [],
  );

  const buildGaps = React.useCallback(
    (
      merged: Array<{ start: number; end: number }>,
      startTs: number,
      endTs: number,
    ) => {
      const gaps: Array<{ start: number; end: number }> = [];
      let cursor = startTs;
      for (const seg of merged) {
        if (seg.start > cursor) gaps.push({ start: cursor, end: seg.start });
        cursor = Math.max(cursor, seg.end);
      }
      if (cursor < endTs) gaps.push({ start: cursor, end: endTs });
      return gaps;
    },
    [],
  );

  // merged intervals per row
  const mergedByRow = React.useMemo(() => {
    const map = new Map<
      string | number,
      Array<{ start: number; end: number }>
    >();
    calendarQuery.data?.events.forEach((e) => {
      const key = e.apartmentId ?? e.apartmentName ?? `no-id-${e.id}`;
      const arr = map.get(key) ?? [];
      arr.push({ start: e.checkIn.getTime(), end: e.checkOut.getTime() });
      map.set(key, arr);
    });
    // merge
    Array.from(map.keys()).forEach((k) => {
      const val = map.get(k)!;
      map.set(k, mergeIntervals(val));
    });
    return map;
  }, [calendarQuery.data, mergeIntervals]);

  // dni, w których jest okno (dla linii highlight + plusów)
  const hasPlusForDay = React.useMemo(() => {
    const flags = Array.from({ length: 7 }, () => false);
    const startTs = weekStart.getTime();
    const endTs = weekEnd.getTime();
    mergedByRow.forEach((merged) => {
      const gaps = buildGaps(merged, startTs, endTs);
      for (let d = 0; d < 7; d++) {
        const m = getMiddayTs(d);
        if (gaps.some((g) => m >= g.start && m <= g.end)) flags[d] = true;
      }
    });
    return flags;
  }, [mergedByRow, buildGaps, getMiddayTs, weekEnd, weekStart]);

  return (
    <React.Suspense fallback={null}>
      <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sprzątanie — kreator harmonogramu
            </h1>
            <p className="text-sm text-gray-600">
              Zdefiniuj zasady i checklisty, które będą widoczne w aplikacji
              sprzątania.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-md border border-gray-200 bg-white p-1 shadow-sm sm:inline-flex">
              <button
                className={`px-3 py-1 text-sm font-medium ${view === "assign" ? "rounded-md bg-gray-900 text-white" : "text-gray-700"}`}
                onClick={() => {
                  setView("assign");
                  router.replace("/admin/cleaning?view=assign");
                }}
              >
                Przypisania
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium ${view === "calendar" ? "rounded-md bg-gray-900 text-white" : "text-gray-700"}`}
                onClick={() => {
                  setView("calendar");
                  router.replace("/admin/cleaning?view=calendar");
                }}
              >
                Kalendarz
              </button>
            </div>
            <button
              onClick={() => router.push("/admin/apartments")}
              className="rounded-md bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600"
            >
              Wróć
            </button>
          </div>
        </div>

        {/* Krokper */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { idx: 1, label: "Zakres" },
            { idx: 2, label: "Wyzwalacze" },
            { idx: 3, label: "Zadania i podgląd" },
          ].map((s) => (
            <button
              key={s.idx}
              onClick={() => setStep(s.idx)}
              className={`rounded-lg border px-4 py-3 text-left text-sm font-semibold ${
                step === s.idx
                  ? "border-sky-300 bg-white text-sky-800 shadow"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {s.idx}. {s.label}
            </button>
          ))}
        </div>

        {/* STEPS */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Zakres
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={apartmentScope === "all"}
                    onChange={() => setApartmentScope("all")}
                  />
                  Zastosuj do wszystkich apartamentów
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={apartmentScope === "selected"}
                    onChange={() => setApartmentScope("selected")}
                  />
                  Wybierz konkretne apartamenty/pokoje
                </label>
                {apartmentScope === "selected" && (
                  <div className="rounded-lg border border-gray-200 p-3 text-sm text-gray-600">
                    TODO: wybór apartamentów/pokoi (multi-select)
                  </div>
                )}
                <label className="mt-2 flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyToRooms}
                    onChange={(e) => setApplyToRooms(e.target.checked)}
                  />
                  Zastosuj także do wszystkich pokoi (jeśli apartament jest
                  wielopokojowy)
                </label>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Opis</h2>
              <p className="text-sm text-gray-600">
                W tym kroku określasz, gdzie harmonogram ma obowiązywać. Możesz
                wybrać cały portfel lub tylko wybrane jednostki. To ustawienie
                możesz później skopiować do innych mieszkań.
              </p>
            </div>
          </div>
        )}

        {/* NAV (mobile fallback) */}
        <div className="mt-4 flex items-center justify-between sm:hidden">
          <div className="inline-flex rounded-md border border-gray-200 bg-white p-1 shadow-sm">
            <button
              className={`px-3 py-1 text-sm font-medium ${view === "assign" ? "rounded-md bg-gray-900 text-white" : "text-gray-700"}`}
              onClick={() => {
                setView("assign");
                router.replace("/admin/cleaning?view=assign");
              }}
            >
              Przypisania
            </button>
            <button
              className={`px-3 py-1 text-sm font-medium ${view === "calendar" ? "rounded-md bg-gray-900 text-white" : "text-gray-700"}`}
              onClick={() => {
                setView("calendar");
                router.replace("/admin/cleaning?view=calendar");
              }}
            >
              Kalendarz
            </button>
          </div>
        </div>

        {/* PRZYPISANIA */}
        {view === "assign" && (
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  Przypisz sprzątanie
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Szukaj po adresie, nazwie, pokoju..."
                    className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                  />
                  <select
                    value={daysAhead}
                    onChange={(e) => setDaysAhead(Number(e.target.value))}
                    className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                  >
                    <option value={3}>3 dni</option>
                    <option value={7}>7 dni</option>
                    <option value={14}>14 dni</option>
                    <option value={30}>30 dni</option>
                  </select>
                  <button
                    onClick={() => refetchJobs()}
                    className="rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    Odśwież
                  </button>
                </div>
              </div>

              {jobsLoading ? (
                <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
                  Ładowanie…
                </div>
              ) : jobsError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  Błąd: {jobsError.message}
                </div>
              ) : (
                <ul className="space-y-3">
                  {jobsData?.jobs.map((j) => (
                    <li
                      key={j.id}
                      className="rounded-md border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {j.displayApartmentName ?? j.apartmentName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {j.address}
                          </div>
                          <div className="text-xs text-gray-500">
                            Check‑in: {j.checkInLabel} • Check‑out:{" "}
                            {j.checkOutLabel}
                            {j.showRoom && (
                              <span className="ml-2 rounded bg-gray-100 px-2 py-0.5">
                                Pokój {j.roomCode}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            defaultValue={j.cleanerUserId ?? ""}
                            onChange={(e) =>
                              assignMutation.mutate({
                                reservationId: j.id,
                                cleanerId: e.target.value
                                  ? Number(e.target.value)
                                  : null,
                              })
                            }
                            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                          >
                            <option value="">— bez przypisania —</option>
                            {cleanersData?.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.email}
                              </option>
                            ))}
                          </select>
                          <span className="text-xs text-gray-500">
                            {assignMutation.isPending
                              ? "Zapisywanie…"
                              : (() => {
                                  const c = cleanersData?.find(
                                    (x) => x.id === j.cleanerUserId,
                                  );
                                  return c
                                    ? `Przypisano: ${c.email}`
                                    : "Nie przypisano";
                                })()}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-lg font-semibold text-gray-900">
                Utwórz konto sprzątaczki
              </h2>
              <div className="space-y-3">
                <input
                  type="email"
                  value={newCleanerEmail}
                  onChange={(e) => setNewCleanerEmail(e.target.value)}
                  placeholder="email@firma.pl"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                />
                <input
                  type="password"
                  value={newCleanerPassword}
                  onChange={(e) => setNewCleanerPassword(e.target.value)}
                  placeholder="hasło"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                />
                <button
                  onClick={() =>
                    registerCleaner.mutate({
                      email: newCleanerEmail,
                      password: newCleanerPassword,
                      role: "CLEANER",
                    })
                  }
                  disabled={registerCleaner.isPending}
                  className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-500"
                >
                  {registerCleaner.isPending
                    ? "Tworzenie…"
                    : "Dodaj użytkownika"}
                </button>
                {registerCleaner.error && (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                    {registerCleaner.error.message}
                  </div>
                )}
              </div>

              <div className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">
                  Dostępni czyściciele
                </h3>
                {cleanersLoading ? (
                  <div className="rounded-md border border-gray-200 p-2 text-xs text-gray-600">
                    Ładowanie listy użytkowników…
                  </div>
                ) : cleanersError ? (
                  <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                    Błąd: {cleanersError.message}
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm text-gray-700">
                    {cleanersData?.map(
                      (c: { id: number; email: string; role: string }) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between rounded-md border border-gray-200 px-2 py-1"
                        >
                          <span>{c.email}</span>
                          <span className="text-xs text-gray-500">
                            {c.role}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* KALENDARZ */}
        {view === "calendar" && (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setWeekStart((d) => {
                      const x = new Date(d);
                      x.setDate(x.getDate() - 7);
                      return x;
                    })
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  ← Poprzedni tydzień
                </button>
                <div className="text-sm text-gray-700">
                  {weekStart.toLocaleDateString("pl-PL")} —{" "}
                  {weekEnd.toLocaleDateString("pl-PL")}
                </div>
                <button
                  onClick={() =>
                    setWeekStart((d) => {
                      const x = new Date(d);
                      x.setDate(x.getDate() + 7);
                      return x;
                    })
                  }
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                >
                  Następny tydzień →
                </button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <label className="text-sm text-gray-600">Apartament:</label>
                <select
                  value={calendarApartment}
                  onChange={(e) => {
                    const v =
                      e.target.value === "ALL" ? "ALL" : Number(e.target.value);
                    setCalendarApartment(v);
                  }}
                  className="rounded-md border border-gray-300 px-2 py-2 text-sm"
                >
                  <option value="ALL">Wszystkie</option>
                  {apartmentsBasic.data?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid tygodniowy */}
            {calendarQuery.isLoading ? (
              <div className="rounded-md border border-gray-200 p-4 text-sm text-gray-600">
                Ładowanie…
              </div>
            ) : calendarQuery.error ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Błąd: {calendarQuery.error.message}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  {/* Nagłówki dni */}
                  <div className="ml-56">
                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const d = new Date(weekStart);
                        d.setDate(weekStart.getDate() + i);
                        const label = d.toLocaleDateString("pl-PL", {
                          weekday: "short",
                          day: "2-digit",
                          month: "2-digit",
                        });
                        return (
                          <div
                            key={i}
                            className="rounded-md border border-gray-200 bg-gray-50 p-2 text-center text-xs font-medium text-gray-700"
                          >
                            {label}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Paski godzin (wskazanie okienka 10:00–15:00) */}
                  <div className="ml-56">
                    <div className="mt-1 grid grid-cols-7 gap-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const leftPct = 100 * (10 / 24); // 41.666..%
                        const widthPct = 100 * ((15 - 10) / 24); // 20.833..%
                        return (
                          <div
                            key={i}
                            className="relative h-8 rounded-md border border-gray-200 bg-white"
                            title="Okienko sprzątania 10:00–15:00"
                          >
                            {/* linia bazowa 0-24 */}
                            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
                            {/* zaznaczone okienko 10:00–15:00 */}
                            <div
                              className="absolute top-1/2 h-3 -translate-y-1/2 rounded bg-amber-100 ring-1 ring-amber-200"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                            />
                            {/* etykiety godzin (lewa/prawa) */}
                            <div className="absolute inset-x-0 top-0 flex justify-between px-1 text-[10px] leading-none text-gray-500">
                              <span>10:00</span>
                              <span>15:00</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Wiersze z wydarzeniami (grupowane po apartamencie) */}
                  <div className="relative mt-2">
                    {/* Global overlay: 7‑kolumnowy grid; jedna pętla – bazowa linia + ewentualny highlight, przesunięte o subtelny offset */}
                    {calendarQuery.data && (
                      <div
                        className="pointer-events-none absolute inset-0 z-0 grid gap-2"
                        style={{
                          gridTemplateColumns: "13.5rem repeat(7, 1fr)",
                        }}
                      >
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div key={`midgrid-${idx}`} className="relative">
                            {/* cienka linia bazowa na środku kolumny */}
                            <div className="absolute bottom-0 left-1/2 top-0 w-0 -translate-x-px border-l border-dashed border-amber-200/60" />
                            {/* highlight tylko dla dni (kolumny 1..7) z realnym oknem */}
                            {idx > 0 && hasPlusForDay[idx - 1] && (
                              <div className="absolute bottom-0 left-1/2 top-0 w-0 -translate-x-px border-l-2 border-dashed border-amber-400/80" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Vertical midday (12:30) dashed lines across all rows (static absolute overlay) */}
                    <div className="relative z-10 space-y-3">
                      {(() => {
                        const groups = new Map<string | number, unknown[]>();
                        calendarQuery.data?.events.forEach((e) => {
                          const key =
                            e.apartmentId ?? e.apartmentName ?? `no-id-${e.id}`;
                          const arr = groups.get(key) ?? [];
                          arr.push(e);
                          groups.set(key, arr);
                        });
                        return Array.from(groups.entries()).map(([k, list]) => {
                          const first = list[0] as {
                            apartmentName: string | null;
                          };
                          return (
                            <div
                              key={String(k)}
                              className="relative flex w-full items-start pb-5"
                            >
                              {/* Lewa kolumna z nazwą apartamentu */}
                              <div className="w-56 shrink-0 pr-3">
                                <div className="rounded-md bg-white px-2 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                                  <div className="whitespace-normal break-words [hyphens:auto]">
                                    {first.apartmentName}
                                  </div>
                                </div>
                              </div>
                              {/* Prawa część: siatka + paski rezerwacji */}
                              <div className="relative m-auto flex-1">
                                {/* tło liniatury 7 kolumn */}
                                <div className="absolute inset-0 z-0 grid grid-cols-7 gap-2 opacity-50">
                                  {Array.from({ length: 7 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className="rounded-md border border-dashed border-gray-200"
                                    />
                                  ))}
                                </div>
                                {/* paski rezerwacji w jednej linii - zmergowane przedziały */}
                                {(() => {
                                  const intervals = (
                                    list as Array<{
                                      checkIn: Date;
                                      checkOut: Date;
                                    }>
                                  ).map((e) => ({
                                    start: e.checkIn.getTime(),
                                    end: e.checkOut.getTime(),
                                  }));
                                  const merged = mergeIntervals(intervals);
                                  return (
                                    <>
                                      {/* rezerwacje */}
                                      <div className="pointer-events-none absolute inset-x-0 top-full z-10 mt-[2px]">
                                        {merged.map((seg, idx) => {
                                          const leftPct =
                                            ((seg.start - weekStart.getTime()) /
                                              totalWeekMs) *
                                            100;
                                          const rightPct =
                                            ((seg.end - weekStart.getTime()) /
                                              totalWeekMs) *
                                            100;
                                          const clampedLeft = Math.max(
                                            0,
                                            Math.min(100, leftPct),
                                          );
                                          const clampedRight = Math.max(
                                            0,
                                            Math.min(100, rightPct),
                                          );
                                          const widthPct = Math.max(
                                            0,
                                            clampedRight - clampedLeft,
                                          );
                                          return (
                                            <div
                                              key={idx}
                                              className="absolute bottom-0 h-2 rounded-full bg-sky-400/70"
                                              style={{
                                                left: `${clampedLeft}%`,
                                                width: `${widthPct}%`,
                                              }}
                                            />
                                          );
                                        })}

                                        {/* '+' buttons tylko w południu w oknie */}
                                        {(() => {
                                          const gaps = buildGaps(
                                            merged,
                                            weekStart.getTime(),
                                            weekEnd.getTime(),
                                          );

                                          const buttons: JSX.Element[] = [];
                                          for (let d = 0; d < 7; d++) {
                                            const m = getMiddayTs(d);
                                            if (
                                              gaps.some(
                                                (g) =>
                                                  m >= g.start && m <= g.end,
                                              )
                                            ) {
                                              const left =
                                                dayLeftPercentsInt[d]!;
                                              buttons.push(
                                                <button
                                                  key={`mid-btn-${String(k)}-${d}`}
                                                  type="button"
                                                  className="pointer-events-auto absolute bottom-0 z-20 flex h-6 w-6 translate-x-[-50%] items-center justify-center rounded-full bg-emerald-500 text-white shadow hover:bg-emerald-600"
                                                  style={{ left: `${left}%` }}
                                                  title="Dodaj sprzątanie w tym oknie (12:30)"
                                                  onClick={() =>
                                                    openCleaningForGap(
                                                      first.apartmentName ?? "",
                                                      new Date(m),
                                                      new Date(m),
                                                    )
                                                  }
                                                >
                                                  +
                                                </button>,
                                              );
                                            }
                                          }
                                          return buttons;
                                        })()}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Wyzwalacze
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={triggerOnCheckout}
                    onChange={(e) => setTriggerOnCheckout(e.target.checked)}
                  />
                  Uruchamiaj po check‑out (domyślnie 10:00 dnia wyjazdu)
                </label>
                <div>
                  <p className="mb-2 text-sm font-medium text-gray-800">
                    Dodatkowo w stałe dni tygodnia:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(weekdayPlan).map((d) => (
                      <label
                        key={d}
                        className="flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={weekdayPlan[d]}
                          onChange={(e) =>
                            setWeekdayPlan((p) => ({
                              ...p,
                              [d]: e.target.checked,
                            }))
                          }
                        />
                        {d}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Opis</h2>
              <p className="text-sm text-gray-600">
                Najczęściej sprzątanie wykonujemy po check‑out. Możesz też dodać
                stałe dni tygodnia (np. deep‑clean w środy).
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Zadania
              </h2>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <input
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Dodaj nowe zadanie..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={newTaskArea}
                    onChange={(e) =>
                      setNewTaskArea(e.target.value as Task["area"])
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-200"
                  >
                    {areas.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addTask}
                    className="rounded-md bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    Dodaj
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {areas.map((a) => {
                  const list = tasks.filter((t) => t.area === a);
                  if (list.length === 0) return null;
                  return (
                    <div key={a}>
                      <h3 className="mb-2 text-sm font-semibold text-gray-800">
                        {a}
                      </h3>
                      <ul className="space-y-1">
                        {list.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2"
                          >
                            <span className="text-sm text-gray-800">
                              {t.text}
                            </span>
                            <button
                              onClick={() => removeTask(t.id)}
                              className="text-xs font-medium text-rose-600 hover:underline"
                            >
                              Usuń
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">
                Podgląd listy sprzątania
              </h2>
              <div className="space-y-6">
                {areas.map((a) => {
                  const list = tasks.filter((t) => t.area === a);
                  if (list.length === 0) return null;
                  return (
                    <div key={a}>
                      <h3 className="mb-1 text-sm font-semibold text-gray-800">
                        {a}
                      </h3>
                      <ul className="ml-4 list-disc space-y-1 text-sm text-gray-800">
                        {list.map((t) => (
                          <li key={t.id}>{t.text}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setStep(2)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Wstecz
                </button>
                <button
                  onClick={() =>
                    alert("Zapis harmonogramu — backend w kolejnym kroku.")
                  }
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Zapisz harmonogram
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {cleaningModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-slate-900">
              Dodaj sprzątanie
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="font-medium">Apartament:</span>{" "}
                {cleaningModal.apartment}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Start okna
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={
                      cleaningModal.gapStart?.toLocaleString("pl-PL") ?? ""
                    }
                    readOnly
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    Koniec okna
                  </label>
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                    value={cleaningModal.gapEnd?.toLocaleString("pl-PL") ?? ""}
                    readOnly
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Właściwy formularz (czas, osoba sprzątająca, notatki) dodamy w
                następnym kroku.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                onClick={closeCleaningModal}
              >
                Anuluj
              </button>
              <button
                className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                onClick={closeCleaningModal}
              >
                Zapisz
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </React.Suspense>
  );
}
