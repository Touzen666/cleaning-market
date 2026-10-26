"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { BrushCleaning, LogOut } from "lucide-react";
import { api } from "@/trpc/react";
import { CleaningCandidatesPanel } from "./_components/candidates-panel";
import { WorkforcePanel } from "./_components/workforce-panel";
import {
  clientErrorCode,
  planningError,
  rangeFrom,
  todayInWarsaw,
} from "./_components/view-model";

export default function CleaningHomePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const utils = api.useUtils();
  const [range, setRange] = useState(() => rangeFrom(todayInWarsaw()));
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string>();
  const [leaving, setLeaving] = useState(false);
  const [managerView, setManagerView] = useState<"reservations" | "workforce">(
    "reservations",
  );
  const [refreshDenied, setRefreshDenied] = useState(false);
  const refreshSequence = useRef(0);
  const access = api.cleaning.access.useQuery(undefined, {
    retry: false,
    staleTime: 0,
  });
  const input = { ...range, includeReviews: true };
  const candidates = api.cleaning.listOverview.useQuery(input, {
    enabled: access.data?.canPlan === true && !leaving,
    retry: false,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    refetchInterval: 12 * 60 * 60 * 1000,
  });

  useEffect(() => {
    if (access.error?.data?.code === "UNAUTHORIZED") {
      localStorage.removeItem("cleaningAuthToken");
      queryClient.removeQueries({ queryKey: getQueryKey(api.cleaning) });
      router.replace("/cleaningService/login");
    }
  }, [access.error, queryClient, router]);

  async function refresh() {
    const sequence = ++refreshSequence.current;
    setRefreshing(true);
    setRefreshError(undefined);
    try {
      await utils.cleaning.listOverview.cancel(input);
      const latest = await utils.cleaning.listOverview.fetch(
        { ...input, forceRefresh: true },
        { staleTime: 0 },
      );
      // Keep the explicitly refreshed result under the ordinary query key too.
      if (sequence === refreshSequence.current) {
        utils.cleaning.listOverview.setData(input, latest);
        setRefreshDenied(false);
      }
    } catch (error) {
      const code = clientErrorCode(error);
      if (code === "UNAUTHORIZED" || code === "FORBIDDEN") {
        setRefreshDenied(true);
        queryClient.removeQueries({
          queryKey: getQueryKey(api.cleaning.listOverview),
        });
        void access.refetch();
      }
      if (sequence === refreshSequence.current)
        setRefreshError(planningError(code));
    } finally {
      if (sequence === refreshSequence.current) setRefreshing(false);
    }
  }

  async function logout() {
    refreshSequence.current++;
    setLeaving(true);
    await queryClient.cancelQueries({ queryKey: getQueryKey(api.cleaning) });
    localStorage.removeItem("cleaningAuthToken");
    queryClient.removeQueries({ queryKey: getQueryKey(api.cleaning) });
    queryClient.removeQueries({ queryKey: getQueryKey(api.cleaningAuth) });
    if (access.data?.authSource === "session")
      await signOut({ callbackUrl: "/cleaningService/login" });
    else router.replace("/cleaningService/login");
  }

  if (
    leaving ||
    access.isPending ||
    access.error?.data?.code === "UNAUTHORIZED"
  ) {
    return (
      <div
        role="status"
        className="mx-auto max-w-[1800px] px-5 py-16 text-sm text-slate-500"
      >
        {leaving ? "Wylogowywanie…" : "Sprawdzanie dostępu do panelu…"}
      </div>
    );
  }
  const denied =
    refreshDenied ||
    candidates.error?.data?.code === "UNAUTHORIZED" ||
    candidates.error?.data?.code === "FORBIDDEN";

  return (
    <div className="min-h-screen bg-[#f6f8fa]" lang="pl">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-800 p-2.5 text-white">
              <BrushCleaning className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <span className="block text-base font-bold tracking-tight text-slate-900">
                Bookmarket <span className="font-normal text-slate-400">/</span>{" "}
                cleaning
              </span>
              <span className="block text-xs text-slate-500">
                {access.data?.canPlan
                  ? "Panel koordynatora"
                  : "Panel pracownika"}
              </span>
            </div>
          </div>
          <button
            onClick={() => void logout()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Wyloguj
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-[1800px] px-4 py-4 sm:px-6 sm:py-5">
        {access.error ? (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950"
          >
            Nie udało się potwierdzić dostępu.{" "}
            <button
              onClick={() => void access.refetch()}
              className="ml-1 font-semibold underline"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : !access.data?.canPlan ? (
          <WorkforcePanel manager={false} />
        ) : (
          <>
            <nav
              aria-label="Obszar koordynatora"
              className="mb-5 flex w-full gap-2 rounded-xl bg-slate-100 p-1 sm:w-fit"
            >
              <button
                aria-pressed={managerView === "reservations"}
                onClick={() => setManagerView("reservations")}
                className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${managerView === "reservations" ? "bg-white text-teal-900 shadow-sm" : "text-slate-500"}`}
              >
                Rezerwacje i okna
              </button>
              <button
                aria-pressed={managerView === "workforce"}
                onClick={() => setManagerView("workforce")}
                className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${managerView === "workforce" ? "bg-white text-teal-900 shadow-sm" : "text-slate-500"}`}
              >
                Sprzątania i zespół
              </button>
            </nav>
            {managerView === "workforce" ? (
              <WorkforcePanel manager />
            ) : (
              <CleaningCandidatesPanel
                data={denied ? undefined : candidates.data}
                loading={candidates.isPending}
                refreshing={refreshing || candidates.isFetching}
                error={
                  refreshError ??
                  (candidates.error
                    ? planningError(candidates.error.data?.code)
                    : undefined)
                }
                range={range}
                onRangeChange={(next) => {
                  refreshSequence.current++;
                  setRefreshing(false);
                  setRefreshError(undefined);
                  setRange(next);
                }}
                onRefresh={() => void refresh()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
