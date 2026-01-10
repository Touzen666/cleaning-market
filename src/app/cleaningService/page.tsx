"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function CleaningHomePage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [daysAhead, setDaysAhead] = useState(7);
  const [tokenReady, setTokenReady] = React.useState<boolean>(false);

  React.useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("cleaningAuthToken")
        : null;
    if (!token) {
      router.replace("/cleaningService/login");
      return;
    }
    setTokenReady(true);
  }, [router]);

  const { data, isLoading, error, refetch, isRefetching } =
    api.cleaning.listJobs.useQuery(
      { daysAhead, query: search || undefined },
      { staleTime: 30_000, enabled: tokenReady },
    );

  const jobs = data?.jobs ?? [];

  const empty = !isLoading && jobs.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white px-4 py-6">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Zadania sprzątania
            </h1>
            <p className="text-sm text-slate-500">
              Nadchodzące wizyty • następne {daysAhead} dni
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-slate-800"
              disabled={isRefetching}
            >
              {isRefetching ? "Odświeżam..." : "Odśwież"}
            </button>
            <SyncNowButton onDone={() => refetch()} />
          </div>
        </header>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj po adresie, nazwie, pokoju..."
                className="w-full rounded-xl border border-slate-200 bg-white/90 px-4 py-2.5 text-sm shadow-sm outline-none ring-2 ring-transparent transition focus:border-slate-300 focus:ring-sky-200"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600">Zakres:</label>
            <select
              value={daysAhead}
              onChange={(e) => setDaysAhead(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-sm shadow-sm outline-none ring-2 ring-transparent transition focus:border-slate-300 focus:ring-sky-200"
            >
              <option value={3}>3 dni</option>
              <option value={7}>7 dni</option>
              <option value={14}>14 dni</option>
              <option value={30}>30 dni</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
            Ładowanie zadań...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
            Błąd: {error.message}
          </div>
        ) : empty ? (
          <div className="rounded-xl border border-slate-100 bg-white p-8 text-center text-slate-500 shadow-sm">
            Brak zadań w wybranym zakresie.
          </div>
        ) : (
          <ul className="space-y-4">
            {jobs.map((job) => (
              <li key={job.id}>
                <div className="group overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md">
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-4">
                      {job.imageUrl && (
                        <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <Image
                            src={job.imageUrl}
                            alt={
                              job.displayApartmentName ??
                              job.apartmentName ??
                              "Apartament"
                            }
                            fill
                            sizes="80px"
                            className="object-cover"
                            quality={80}
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <span className="rounded-xl bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
                          Check‑in: {job.checkInLabel}
                        </span>
                        <span className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Check‑out: {job.checkOutLabel}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="truncate text-base font-semibold text-slate-900">
                            {job.displayApartmentName ?? job.apartmentName}
                          </span>
                        </div>
                        <div className="text-sm text-slate-600">
                          {job.address}
                        </div>
                        {job.showRoom && (
                          <div className="mt-1">
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                              Pokój {job.roomCode}
                            </span>
                          </div>
                        )}
                        {job.guest && (
                          <div className="mt-1 text-sm text-slate-700">
                            Gość:{" "}
                            <span className="font-medium">{job.guest}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() =>
                          router.push(`/cleaningService/job/${job.id}`)
                        }
                        className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-500"
                      >
                        Szczegóły
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SyncNowButton({ onDone }: { onDone: () => void }) {
  const syncMutation = api.cleaning.syncNow.useMutation({
    onSuccess: () => onDone(),
  });
  return (
    <button
      onClick={() => syncMutation.mutate({})}
      disabled={syncMutation.isPending}
      className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-50 hover:bg-sky-600"
      title="Synchronizuj rezerwacje i odśwież listę"
    >
      {syncMutation.isPending ? "Synchronizuję..." : "Synchronizuj + odśwież"}
    </button>
  );
}
