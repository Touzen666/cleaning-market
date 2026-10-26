"use client";

/* eslint-disable @next/next/no-img-element */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Camera,
  MapPin,
  Plus,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
  X,
  AlertTriangle,
  Wallet,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { api } from "@/trpc/react";
import { CHECKLIST, PHOTO_GROUPS, REWARDS } from "@/lib/cleaning-workforce";
import type {
  Rules,
  Task,
  TaskStatus,
} from "@/server/cleaning/workforce-domain";
import type { RouterOutputs } from "@/trpc/react";
import { clientErrorCode, todayInWarsaw } from "./view-model";

type TeamUser = RouterOutputs["cleaning"]["workforce"]["team"][number];
const inputClass =
  "mt-1.5 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-base outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const buttonClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-900 disabled:cursor-wait disabled:opacity-50";
const secondaryClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const money = (cents: number) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    cents / 100,
  );
const dateLabel = (s: string) =>
  new Date(s.slice(0, 10) + "T12:00Z").toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    weekday: "long",
  });
const time = (s: string | null) => s?.slice(11, 16) ?? "—";
const addDays = (s: string, n: number) =>
  new Date(Date.parse(s + "T12:00Z") + n * 86400000).toISOString().slice(0, 10);
const statusLabels: Record<TaskStatus, string> = {
  UNASSIGNED: "Bez przydziału",
  OFFERED: "Czeka na akceptację",
  ACCEPTED: "Przyjęte",
  FORCED: "Przydział koordynatora",
  IN_PROGRESS: "W trakcie",
  DONE: "Gotowe",
  REVIEW: "Do sprawdzenia",
  CANCELLED: "Wycofane",
};
const statusColors: Record<TaskStatus, string> = {
  UNASSIGNED: "bg-orange-50 text-orange-800",
  OFFERED: "bg-amber-50 text-amber-800",
  ACCEPTED: "bg-teal-50 text-teal-800",
  FORCED: "bg-violet-50 text-violet-800",
  IN_PROGRESS: "bg-blue-50 text-blue-800",
  DONE: "bg-emerald-50 text-emerald-800",
  REVIEW: "bg-red-50 text-red-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const needsAttention = (task: Task) =>
  (task.status === "UNASSIGNED" && !!task.alert) || task.status === "REVIEW";
const accessFailure = (error: unknown) =>
  ["UNAUTHORIZED", "FORBIDDEN"].includes(clientErrorCode(error) ?? "");

/** A denied workforce read must also remove cached photos, profiles and reservations. */
function useWorkforceAccess(errors: unknown[]) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [blocked, setBlocked] = useState(false);
  const leaving = useRef(false);
  const reject = useCallback(
    (error: unknown) => {
      if (!accessFailure(error)) return false;
      if (!leaving.current) {
        leaving.current = true;
        setBlocked(true);
        localStorage.removeItem("cleaningAuthToken");
        void queryClient
          .cancelQueries({ queryKey: getQueryKey(api.cleaning) })
          .catch(() => undefined)
          .then(() => {
            queryClient.removeQueries({ queryKey: getQueryKey(api.cleaning) });
            queryClient.removeQueries({
              queryKey: getQueryKey(api.cleaningAuth),
            });
            router.replace("/cleaningService/login");
          });
      }
      return true;
    },
    [queryClient, router],
  );
  const denied = errors.find(accessFailure);
  useEffect(() => {
    if (denied) reject(denied);
  }, [denied, reject]);
  return { blocked: blocked || !!denied, reject };
}

function AccessPending() {
  return (
    <div
      role="status"
      className="rounded-2xl bg-white p-8 text-sm text-slate-500"
    >
      Dostęp wygasł. Przechodzenie do logowania…
    </div>
  );
}

export async function readCleaningPhoto(file: File) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 15 * 1024 * 1024
  )
    throw new Error("Wybierz JPG, PNG lub WebP do 15 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas"),
      scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Przeglądarka nie obsługuje zdjęć.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const result = canvas.toDataURL("image/jpeg", quality);
      if (result.length <= 260000) return result;
    }
    throw new Error("Zdjęcie jest zbyt duże. Wybierz mniejszy plik.");
  } finally {
    bitmap.close();
  }
}
function Avatar({
  photo,
  name,
  size = "h-10 w-10",
}: {
  photo?: string | null;
  name: string;
  size?: string;
}) {
  return photo ? (
    <img
      src={photo}
      alt={name}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white`}
    />
  ) : (
    <span
      aria-label={name}
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-900`}
    >
      {name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((s) => s[0])
        .join("") || "?"}
    </span>
  );
}
function Status({ task }: { task: Task }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[task.status]}`}
    >
      {statusLabels[task.status]}
    </span>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {children}
    </label>
  );
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <Sparkles className="mx-auto h-9 w-9 text-teal-500" />
      <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {detail}
      </p>
    </div>
  );
}

export function WorkforcePanel({ manager }: { manager: boolean }) {
  const utils = api.useUtils();
  const [tab, setTab] = useState(manager ? "tasks" : "today");
  const [day, setDay] = useState(todayInWarsaw());
  const [from, setFrom] = useState(todayInWarsaw());
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string>();
  const rememberedSelection = useRef<Task>();
  const [editing, setEditing] = useState<TeamUser | "new">();
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [busy, setBusy] = useState(false);
  const input = { from, to: addDays(from, 30) };
  const board = api.cleaning.workforce.board.useQuery(input, {
    retry: false,
    staleTime: 0,
    refetchInterval: 60000,
  });
  const team = api.cleaning.workforce.team.useQuery(undefined, {
    enabled: manager,
    retry: false,
  });
  const profile = api.cleaning.workforce.profile.useQuery(undefined, {
    retry: false,
  });
  const available = api.cleaning.workforce.available.useQuery(undefined, {
    enabled: !manager && tab === "available",
    retry: false,
    refetchInterval: 60000,
  });
  const access = useWorkforceAccess([
    board.error,
    team.error,
    profile.error,
    available.error,
  ]);
  const sync = api.cleaning.workforce.synchronize.useMutation();
  const assign = api.cleaning.workforce.assign.useMutation();
  const respond = api.cleaning.workforce.respond.useMutation();
  const start = api.cleaning.workforce.start.useMutation();
  const complete = api.cleaning.workforce.complete.useMutation();
  const checks = api.cleaning.workforce.saveChecklist.useMutation();
  const photo = api.cleaning.workforce.addPhoto.useMutation();
  const configure = api.cleaning.workforce.configureTask.useMutation();
  const adjust = api.cleaning.workforce.adjustStay.useMutation();
  const confirm = api.cleaning.workforce.confirmEntry.useMutation();
  const claim = api.cleaning.workforce.claim.useMutation();
  const payoutStatus = api.cleaning.workforce.payoutStatus.useMutation();
  const reviewProfile =
    api.cleaning.workforce.reviewProfileChange.useMutation();
  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await action();
      await utils.cleaning.workforce.invalidate();
      await utils.cleaning.listOverview.invalidate();
      if (success) setNotice(success);
    } catch (e) {
      if (access.reject(e)) return;
      setError(
        e instanceof Error
          ? e.message
          : "Nie udało się zapisać. Spróbuj ponownie.",
      );
      await utils.cleaning.workforce.invalidate();
    } finally {
      setBusy(false);
    }
  }
  const allTasks = board.data?.tasks ?? [];
  const tasks = (tab === "available" ? (available.data ?? []) : allTasks)
    .filter(
      (t) =>
        (manager ||
          tab === "calendar" ||
          tab === "available" ||
          t.serviceDate === day) &&
        (status === "all" ||
          (status === "attention" ? needsAttention(t) : t.status === status)) &&
        `${t.name} ${t.address ?? ""} ${t.reservationId}`
          .toLocaleLowerCase("pl")
          .includes(search.toLocaleLowerCase("pl")),
    )
    .sort(
      (a, b) =>
        a.serviceDate.localeCompare(b.serviceDate) ||
        (a.start ?? "z").localeCompare(b.start ?? "z"),
    );
  const currentTask =
    allTasks.find((t) => t.id === selected) ??
    (tab === "available"
      ? available.data?.find((t) => t.id === selected)
      : undefined);
  const selectionLoading =
    board.isFetching || (tab === "available" && available.isFetching);
  const selectionFailed =
    !!board.error || (tab === "available" && !!available.error);
  useEffect(() => {
    if (!selected) {
      rememberedSelection.current = undefined;
    } else if (currentTask) {
      rememberedSelection.current = currentTask;
    } else if (!selectionLoading && !selectionFailed) {
      rememberedSelection.current = undefined;
      setSelected(undefined);
    }
  }, [selected, currentTask, selectionLoading, selectionFailed]);
  // Keep the current sheet during an in-flight read, but never resurrect a
  // removed own assignment from an inactive "available" query's old cache.
  const task =
    currentTask ??
    ((selectionLoading || selectionFailed) &&
    rememberedSelection.current?.id === selected
      ? rememberedSelection.current
      : undefined);
  const employee = profile.data?.cleaningProfile;
  const alerts = allTasks.filter(needsAttention);
  const listQuery = tab === "available" ? available : board;
  const listLoading = listQuery.isPending;
  const listFailed = !!listQuery.error;
  const readError =
    tab === "available"
      ? available.error
      : tab === "team"
        ? team.error
        : board.error;
  const displayedError = error ?? readError?.message ?? profile.error?.message;
  const nav = manager
    ? [
        { id: "tasks", label: "Sprzątania", icon: ClipboardCheck },
        { id: "team", label: "Zespół", icon: UsersRound },
        { id: "payouts", label: "Wnioski", icon: Wallet },
      ]
    : [
        { id: "today", label: "Dziś", icon: ClipboardCheck },
        { id: "calendar", label: "Grafik", icon: CalendarDays },
        { id: "available", label: "Dostępne", icon: Plus },
        { id: "profile", label: "Profil", icon: UserRound },
      ];
  if (access.blocked) return <AccessPending />;
  return (
    <section
      className="mx-auto max-w-6xl pb-24 sm:pb-8"
      aria-label={
        manager ? "Zarządzanie zespołem sprzątania" : "Mój panel sprzątania"
      }
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {!manager && (
            <Avatar
              name={employee?.displayName ?? "Mój profil"}
              photo={employee?.photo}
              size="h-14 w-14"
            />
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              {manager ? "ZESPÓŁ I PRZYDZIAŁY" : "TWÓJ SPOKOJNY DZIEŃ"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {manager
                ? "Dobrze zaplanowana praca."
                : `Cześć${employee?.displayName ? `, ${employee.displayName.split(" ")[0]}` : ""}!`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {manager
                ? "Terminy, ludzie i gotowe mieszkania w jednym miejscu."
                : "Jedno zadanie na raz. Wszystko, czego potrzebujesz, pod ręką."}
            </p>
          </div>
        </div>
        {manager && (
          <button
            className={buttonClass}
            disabled={busy}
            onClick={() =>
              void run(
                () => sync.mutateAsync(input),
                "Rezerwacje i przydziały zostały przeliczone.",
              )
            }
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
            Pobierz i przelicz rezerwacje
          </button>
        )}
      </div>
      <nav
        aria-label="Nawigacja cleaning"
        className={`${manager ? "mb-5 flex rounded-2xl border border-slate-200 bg-white p-1" : "fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:static sm:mb-5 sm:rounded-2xl sm:border sm:p-1"}`}
      >
        {nav.map((n) => (
          <button
            key={n.id}
            aria-pressed={tab === n.id}
            onClick={() => {
              setTab(n.id);
              setSelected(undefined);
              if (n.id === "today") {
                const today = todayInWarsaw();
                setDay(today);
                setFrom(today);
              }
            }}
            className={`flex min-h-14 flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold sm:flex-row sm:gap-2 sm:text-sm ${!manager ? "flex-col" : ""} ${tab === n.id ? "bg-teal-50 text-teal-900" : "text-slate-500 hover:bg-slate-50"}`}
          >
            <n.icon className="h-5 w-5" />
            {n.label}
            {n.id === "tasks" && alerts.length > 0 && (
              <span className="rounded-full bg-orange-100 px-1.5 text-orange-800">
                {alerts.length}
              </span>
            )}
          </button>
        ))}
      </nav>
      {displayedError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {displayedError}
          <button
            onClick={() => {
              setError(undefined);
              void utils.cleaning.workforce.invalidate();
            }}
            className="ml-2 font-semibold underline"
          >
            Odśwież
          </button>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-4 rounded-xl bg-teal-50 p-4 text-sm text-teal-900"
        >
          {notice}
        </div>
      )}
      {tab === "team" ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              Twój zespół{" "}
              <span className="text-slate-400">{team.data?.length ?? "—"}</span>
            </h2>
            <button className={buttonClass} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" />
              Dodaj pracownika
            </button>
          </div>
          {team.isPending && (
            <p role="status" className="mb-4 text-sm text-slate-500">
              Pobieranie zespołu…
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {team.data?.map((u) => (
              <button
                key={u.id}
                onClick={() => setEditing(u)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-teal-300"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    name={u.cleaningProfile?.displayName ?? u.email}
                    photo={u.cleaningProfile?.photo}
                    size="h-14 w-14"
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">
                      {u.cleaningProfile?.displayName ??
                        "Profil do uzupełnienia"}
                    </h3>
                    <p className="truncate text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between text-xs">
                  <span
                    className={
                      u.cleaningProfile?.active
                        ? "text-teal-700"
                        : "text-slate-500"
                    }
                  >
                    {u.cleaningProfile?.active
                      ? "● Aktywna osoba"
                      : "○ Wymaga aktywacji"}
                  </span>
                  <span className="text-slate-500">
                    do {u.cleaningProfile?.dailyLimit ?? 4} mieszkań / dzień
                  </span>
                </div>
              </button>
            ))}
          </div>
          {editing && (
            <EmployeeForm
              key={editing === "new" ? "new" : editing.id}
              user={editing === "new" ? undefined : editing}
              onClose={() => setEditing(undefined)}
              onSaved={async () => {
                setEditing(undefined);
                await utils.cleaning.workforce.invalidate();
              }}
            />
          )}
        </>
      ) : tab === "profile" ? (
        <WorkerProfile />
      ) : tab === "payouts" ? (
        <>
          {board.data?.passwordHelp.map((h) => (
            <div
              key={h.userId}
              className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-5"
            >
              <h3 className="font-bold text-amber-950">
                Zgłoszenie problemu z hasłem · pracownik #{h.userId}
              </h3>
              <p className="mt-2 text-sm text-amber-900">
                Otwórz profil osoby w zakładce Zespół i ustaw nowe hasło po
                potwierdzeniu jej tożsamości.
              </p>
            </div>
          ))}
          {board.data?.profileRequests.map((r) => (
            <article
              key={r.id}
              className="mb-4 space-y-3 rounded-2xl border bg-white p-5"
            >
              <h3 className="font-bold">Zmiana danych · {r.displayName}</h3>
              <p className="text-sm text-slate-600">
                {r.email} · {r.phone ?? "Brak telefonu"}
              </p>
              <p className="text-sm text-slate-500">{r.reason}</p>
              <p className="text-xs text-slate-500">
                {r.status === "REQUESTED"
                  ? "Oczekuje na zatwierdzenie"
                  : r.status === "APPROVED"
                    ? "Zatwierdzony"
                    : "Odrzucony"}
              </p>
              {r.status === "REQUESTED" && (
                <div className="flex gap-2">
                  <button
                    className={buttonClass}
                    disabled={busy}
                    onClick={() =>
                      void run(
                        () =>
                          reviewProfile.mutateAsync({
                            id: r.id,
                            approve: true,
                          }),
                        "Dane pracownika zaktualizowane.",
                      )
                    }
                  >
                    Zatwierdź dane
                  </button>
                  <button
                    className={secondaryClass}
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        reviewProfile.mutateAsync({ id: r.id, approve: false }),
                      )
                    }
                  >
                    Odrzuć wniosek
                  </button>
                </div>
              )}
            </article>
          ))}
          <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
            Obsługa wniosków w aplikacji. Zmiana statusu nie wykonuje przelewu.
          </div>
          <div className="space-y-3">
            {board.data?.ledger
              .filter((l) => l.kind === "PAYOUT")
              .map((l) => {
                const worker = team.data?.find((user) => user.id === l.userId);
                const workerName =
                  worker?.cleaningProfile?.displayName ??
                  `Pracownik #${l.userId}`;
                return (
                  <article
                    key={l.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar
                        name={workerName}
                        photo={worker?.cleaningProfile?.photo}
                      />
                      <div className="min-w-0">
                        <h3 className="break-words font-bold">
                          {workerName} · {money(-l.cents)}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {new Date(l.createdAt).toLocaleString("pl-PL")} ·{" "}
                          {l.status === "REQUESTED"
                            ? "Nowy wniosek"
                            : l.status === "APPROVED"
                              ? "W realizacji"
                              : l.status === "COMPLETED"
                                ? "Zrealizowany"
                                : "Odrzucony"}
                        </p>
                      </div>
                    </div>
                    {["REQUESTED", "APPROVED"].includes(l.status) && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={busy}
                          className={buttonClass}
                          onClick={() =>
                            void run(() =>
                              payoutStatus.mutateAsync({
                                id: l.id,
                                status:
                                  l.status === "REQUESTED"
                                    ? "APPROVED"
                                    : "COMPLETED",
                              }),
                            )
                          }
                        >
                          {l.status === "REQUESTED"
                            ? "Przyjmij do realizacji"
                            : "Oznacz jako wypłacone"}
                        </button>
                        <button
                          disabled={busy}
                          className={secondaryClass}
                          onClick={() =>
                            void run(() =>
                              payoutStatus.mutateAsync({
                                id: l.id,
                                status: "REJECTED",
                              }),
                            )
                          }
                        >
                          Odrzuć i zwolnij saldo
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
          {board.isPending && (
            <p role="status" className="text-sm text-slate-500">
              Pobieranie wniosków…
            </p>
          )}
          {board.data &&
            !board.error &&
            !board.data.ledger.some((l) => l.kind === "PAYOUT") && (
              <Empty
                title="Brak wniosków"
                detail="Tutaj pojawią się prośby pracowników o wypłatę zgromadzonych środków."
              />
            )}
        </>
      ) : (
        <>
          {manager && alerts.length > 0 && (
            <button
              onClick={() => {
                setStatus("attention");
                setSearch("");
              }}
              className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left text-orange-950"
            >
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <b>{alerts.length} zadań wymaga uwagi</b>
                <p className="mt-1 text-xs">
                  Sprawdź brak przydziału lub zmiany w rezerwacjach.
                </p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5" />
            </button>
          )}
          {!manager && (
            <div className="mb-5 grid grid-cols-3 gap-2">
              <Metric
                label="Na dziś"
                value={allTasks
                  .filter(
                    (t) =>
                      t.serviceDate === todayInWarsaw() &&
                      !["CANCELLED", "REVIEW"].includes(t.status),
                  )
                  .length.toString()}
              />
              <Metric
                label="Do przyjęcia"
                value={allTasks
                  .filter((t) => t.status === "OFFERED")
                  .length.toString()}
              />
              <Metric
                label="Gotowe"
                value={allTasks
                  .filter((t) => t.status === "DONE")
                  .length.toString()}
              />
            </div>
          )}
          <FilterContainer manager={manager}>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-[160px] flex-1 text-xs font-semibold text-slate-600">
                  Szukaj apartamentu
                  <div className="relative">
                    <Search className="absolute left-3 top-5 h-4 w-4 text-slate-400" />
                    <input
                      aria-label="Szukaj apartamentu"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className={`${inputClass} pl-9`}
                      placeholder="Nazwa lub adres"
                    />
                  </div>
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Zakres od
                  <input
                    aria-label="Zakres od"
                    className={inputClass}
                    type="date"
                    value={from}
                    onChange={(e) => {
                      if (e.target.value) {
                        setFrom(e.target.value);
                        setDay(e.target.value);
                      }
                    }}
                  />
                </label>
                <label className="min-w-[155px] flex-1 text-xs font-semibold text-slate-600">
                  Status
                  <select
                    aria-label="Status sprzątania"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">Wszystkie</option>
                    {manager && (
                      <option value="attention">Wymagają uwagi</option>
                    )}
                    {Object.entries(statusLabels).map(([s, label]) => (
                      <option key={s} value={s}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>10:00–15:00 · 60 min · maks. 4 mieszkania dziennie</span>
                <span>
                  {board.data?.lastSync
                    ? `Odczyt: ${new Date(board.data.lastSync).toLocaleString("pl-PL")}`
                    : "Koordynator musi pobrać rezerwacje"}
                </span>
              </p>
            </div>
          </FilterContainer>
          {!manager && tab !== "available" && (
            <>
              <div className="mb-2 flex items-center justify-between">
                <button
                  aria-label="Poprzedni dzień"
                  className={secondaryClass}
                  onClick={() => {
                    const d = addDays(day, -1);
                    setDay(d);
                    if (d < from) setFrom(d);
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <h2 className="text-sm font-bold capitalize">
                  {dateLabel(day)}
                </h2>
                <button
                  aria-label="Następny dzień"
                  className={secondaryClass}
                  onClick={() => {
                    const d = addDays(day, 1);
                    setDay(d);
                    if (d >= input.to) setFrom(d);
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              {tab === "calendar" && (
                <div className="mb-5 grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }, (_, i) => addDays(day, i - 3)).map(
                    (d) => (
                      <button
                        key={d}
                        aria-pressed={day === d}
                        onClick={() => {
                          setDay(d);
                          if (d < from || d >= input.to) setFrom(d);
                        }}
                        className={`min-h-16 rounded-xl px-1 py-2 text-center ${day === d ? "bg-teal-800 text-white" : "bg-white text-slate-500"}`}
                      >
                        <span className="block text-[10px]">
                          {new Date(d + "T12:00Z").toLocaleDateString("pl-PL", {
                            weekday: "short",
                          })}
                        </span>
                        <b className="block text-lg">{Number(d.slice(8))}</b>
                        <span className="block text-[10px]">
                          {allTasks.filter(
                            (t) =>
                              t.serviceDate === d &&
                              !["REVIEW", "CANCELLED"].includes(t.status),
                          ).length || "·"}
                        </span>
                      </button>
                    ),
                  )}
                </div>
              )}
            </>
          )}
          {listLoading ? (
            <div
              role="status"
              className="rounded-2xl bg-white p-8 text-sm text-slate-500"
            >
              {tab === "available"
                ? "Sprawdzanie dostępnych sprzątań…"
                : "Pobieranie Twojego grafiku…"}
            </div>
          ) : listFailed && !listQuery.data ? (
            <p className="rounded-2xl border border-red-100 bg-white p-8 text-sm text-slate-600">
              Nie można teraz potwierdzić listy sprzątań. Odśwież dane, aby
              spróbować ponownie.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tasks
                .filter(
                  (t) =>
                    manager || tab === "available" || t.serviceDate === day,
                )
                .map((t) => {
                  const assignee = board.data?.profiles.find(
                    (p) => p.userId === t.userId,
                  );
                  return (
                    <article
                      key={t.id}
                      className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${t.status === "OFFERED" ? "border-amber-200" : "border-slate-200"}`}
                    >
                      <button
                        className="w-full p-5 text-left"
                        onClick={() => setSelected(t.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <Status task={t} />
                          <span className="text-xs font-medium text-slate-500">
                            {t.serviceDate.slice(8)}.{t.serviceDate.slice(5, 7)}
                          </span>
                        </div>
                        <div className="mt-4 flex gap-3">
                          {t.imageUrl ? (
                            <img
                              src={t.imageUrl}
                              alt=""
                              className="h-16 w-16 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-teal-50">
                              <Sparkles className="h-6 w-6 text-teal-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="text-base font-bold leading-6 text-slate-900">
                              {t.name}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                              {t.address ?? "Adres do potwierdzenia"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm">
                          <span className="flex items-center gap-1.5 font-bold text-teal-900">
                            <Clock3 className="h-4 w-4" />
                            {t.start
                              ? `${time(t.start)}–${time(t.end)}`
                              : "Termin do przydziału"}
                          </span>
                          <span className="text-slate-500">60 min</span>
                          <span className="ml-auto text-xs text-slate-500">
                            {t.nextGuests === null
                              ? "Liczba gości: —"
                              : `${t.nextGuests} gości po sprzątaniu`}
                          </span>
                        </div>
                        {t.provisional && (
                          <p className="mt-3 text-xs text-amber-800">
                            Rezerwacja oczekująca ·{" "}
                            {t.entryApproved
                              ? "wejście potwierdzone"
                              : "wejście wymaga potwierdzenia"}
                          </p>
                        )}
                        {assignee && manager && (
                          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                            <Avatar
                              name={assignee.displayName}
                              photo={assignee.photo}
                              size="h-7 w-7"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                              {assignee.displayName}
                            </span>
                          </div>
                        )}
                      </button>
                      {!manager && t.status === "OFFERED" && (
                        <div className="grid grid-cols-2 gap-2 border-t border-amber-100 bg-amber-50/40 p-3">
                          <button
                            className={secondaryClass}
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () =>
                                  respond.mutateAsync({
                                    taskId: t.id,
                                    version: t.version,
                                    accept: false,
                                  }),
                                "Zadanie wróciło do puli i otrzyma je kolejna dostępna osoba.",
                              )
                            }
                          >
                            Odrzuć
                          </button>
                          <button
                            className={buttonClass}
                            disabled={busy}
                            onClick={() =>
                              void run(
                                () =>
                                  respond.mutateAsync({
                                    taskId: t.id,
                                    version: t.version,
                                    accept: true,
                                  }),
                                "Sprzątanie przyjęte. Znajdziesz je w swoim grafiku.",
                              )
                            }
                          >
                            <Check className="h-4 w-4" />
                            Przyjmij
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          )}
          {!listLoading &&
            !listFailed &&
            listQuery.data &&
            !tasks.filter(
              (t) => manager || tab === "available" || t.serviceDate === day,
            ).length && (
              <Empty
                title={
                  search.trim() || status !== "all"
                    ? "Brak pasujących sprzątań"
                    : tab === "available"
                      ? "Wszystkie zadania mają opiekuna"
                      : "Tutaj jest spokojnie"
                }
                detail={
                  search.trim() || status !== "all"
                    ? "Zmień wyszukiwanie lub filtr statusu, aby zobaczyć pozostałe sprzątania."
                    : manager
                      ? "Pobierz rezerwacje, aby przygotować zadania. Przydziały powstaną wyłącznie dla poprawnie zmapowanych lokali."
                      : "Nie masz sprzątań w tym widoku. Zmień dzień lub sprawdź propozycje od koordynatora."
                }
              />
            )}
          {manager && (
            <p className="mt-5 text-xs leading-5 text-slate-500">
              WhatsApp: kolejka przygotowana, wysyłka wyłączona.{" "}
              {board.data?.notifications.length
                ? board.data.notifications
                    .map(
                      (n) =>
                        `${n.status === "MISSING_PHONE" ? "Brak telefonu" : n.status === "QUEUED" ? "W kolejce" : "Nieaktualne"}: ${n._count}`,
                    )
                    .join(" · ")
                : "Brak powiadomień."}
            </p>
          )}
        </>
      )}
      {task && (
        <TaskDetail
          key={task.id}
          task={task}
          manager={manager}
          team={team.data ?? []}
          busy={busy || selectionLoading}
          onClose={() => setSelected(undefined)}
          onAssign={(userId, force, reason, version) =>
            run(
              () =>
                assign.mutateAsync({
                  taskId: task.id,
                  version,
                  userId,
                  force,
                  reason,
                }),
              "Przydział zapisany.",
            )
          }
          onRespond={(accept) =>
            run(() =>
              respond.mutateAsync({
                taskId: task.id,
                version: task.version,
                accept,
              }),
            )
          }
          onStart={() =>
            run(
              () =>
                start.mutateAsync({ taskId: task.id, version: task.version }),
              "Sprzątanie rozpoczęte.",
            )
          }
          onComplete={() =>
            run(
              () =>
                complete.mutateAsync({
                  taskId: task.id,
                  version: task.version,
                }),
              "Dziękujemy! Sprzątanie zakończone, nagroda została zapisana.",
            )
          }
          onChecks={(keys) =>
            run(() =>
              checks.mutateAsync({
                taskId: task.id,
                version: task.version,
                checks: keys,
              }),
            )
          }
          onPhoto={(category, data) =>
            run(() =>
              photo.mutateAsync({
                taskId: task.id,
                version: task.version,
                category,
                photo: data,
              }),
            )
          }
          onConfigure={(rewardCents, rewardPoints, extraItems, version) =>
            run(
              () =>
                configure.mutateAsync({
                  taskId: task.id,
                  version,
                  rewardCents,
                  rewardPoints,
                  extraItems,
                }),
              "Zapisano instrukcje i wynagrodzenie.",
            )
          }
          onAdjust={(
            reservationId,
            earlyMinutes,
            lateMinutes,
            expectedAdjustment,
          ) =>
            run(
              () =>
                adjust.mutateAsync({
                  ...input,
                  reservationId,
                  unitId: task.unitId,
                  earlyMinutes,
                  lateMinutes,
                  expectedAdjustment,
                }),
              "Godziny zmienione lokalnie. Grafik został przeliczony.",
            )
          }
          onConfirm={() =>
            run(
              () =>
                confirm.mutateAsync({ taskId: task.id, version: task.version }),
              "Wejście potwierdzone.",
            )
          }
          onClaim={() =>
            run(
              () =>
                claim.mutateAsync({ taskId: task.id, version: task.version }),
              "Sprzątanie zarezerwowane w Twoim grafiku.",
            )
          }
          adjustments={board.data?.adjustments ?? []}
          onError={setError}
          error={error}
        />
      )}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <b className="block text-2xl tracking-tight text-slate-900">{value}</b>
      <span className="mt-1 block text-xs text-slate-500">{label}</span>
    </div>
  );
}
function FilterContainer({
  manager,
  children,
}: {
  manager: boolean;
  children: ReactNode;
}) {
  return manager ? (
    <>{children}</>
  ) : (
    <details className="mb-4 rounded-2xl border border-slate-200 bg-white">
      <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold text-slate-600">
        Szukaj, filtry i zakres
      </summary>
      {children}
    </details>
  );
}
function Sheet({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-5"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) onClose();
        }}
        className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#f7f9fa] shadow-xl sm:rounded-3xl"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button
            autoFocus
            onClick={onClose}
            disabled={busy}
            aria-label="Zamknij okno"
            className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="space-y-5 p-5 pb-10">{children}</div>
      </section>
    </div>
  );
}
type DetailProps = {
  task: Task;
  manager: boolean;
  team: TeamUser[];
  busy: boolean;
  error?: string;
  onClose: () => void;
  onAssign: (
    userId: number | undefined,
    force: boolean,
    reason: string,
    version: number,
  ) => Promise<void>;
  onRespond: (accept: boolean) => Promise<void>;
  onStart: () => Promise<void>;
  onComplete: () => Promise<void>;
  onChecks: (keys: string[]) => Promise<void>;
  onPhoto: (
    category: "kitchen" | "room" | "bathroom" | "extra",
    data: string,
  ) => Promise<void>;
  onConfigure: (
    cents: number,
    points: number,
    items: string[],
    version: number,
  ) => Promise<void>;
  onAdjust: (
    reservationId: number,
    early: number,
    late: number,
    expectedAdjustment: { earlyMinutes: number; lateMinutes: number },
  ) => Promise<void>;
  onConfirm: () => Promise<void>;
  onClaim: () => Promise<void>;
  adjustments: {
    reservationId: number;
    unitId: number;
    earlyMinutes: number;
    lateMinutes: number;
  }[];
  onError: (message: string) => void;
};
function TaskDetail(p: DetailProps) {
  const { task: t } = p;
  const [draftVersion, setDraftVersion] = useState(t.version);
  const [draftNotice, setDraftNotice] = useState<string>();
  const [compressing, setCompressing] = useState(false);
  const compressionLock = useRef(false);
  const busy = p.busy || compressing;
  const [person, setPerson] = useState(t.userId?.toString() ?? "");
  const [force, setForce] = useState(false),
    [reason, setReason] = useState("");
  const [rate, setRate] = useState(String(t.rewardCents / 100)),
    [points, setPoints] = useState(String(t.rewardPoints)),
    [extra, setExtra] = useState(t.extraItems.join("\n"));
  const [photoGroup, setPhotoGroup] = useState<
    "kitchen" | "room" | "bathroom" | "extra"
  >("kitchen");
  const adjustment = p.adjustments.find(
    (a) => a.reservationId === t.reservationId && a.unitId === t.unitId,
  );
  const [early, setEarly] = useState(adjustment?.earlyMinutes ?? 0),
    [late, setLate] = useState(adjustment?.lateMinutes ?? 0);
  const [expectedAdjustment, setExpectedAdjustment] = useState({
    earlyMinutes: adjustment?.earlyMinutes ?? 0,
    lateMinutes: adjustment?.lateMinutes ?? 0,
  });
  const [adjustedReservation, setAdjustedReservation] = useState(
    t.reservationId,
  );
  const selectedReservationValid =
    adjustedReservation === t.reservationId ||
    adjustedReservation === t.nextReservationId;
  const currentAdjustment = p.adjustments.find(
    (a) =>
      a.reservationId ===
        (selectedReservationValid ? adjustedReservation : t.reservationId) &&
      a.unitId === t.unitId,
  );
  const currentEarly = currentAdjustment?.earlyMinutes ?? 0;
  const currentLate = currentAdjustment?.lateMinutes ?? 0;
  const currentExtra = t.extraItems.join("\n");
  useEffect(() => {
    if (!p.manager) return;
    if (t.version !== draftVersion) {
      // Refresh the form values without remounting the sheet or the worker checklist.
      setPerson(t.userId?.toString() ?? "");
      setForce(false);
      setReason("");
      setRate(String(t.rewardCents / 100));
      setPoints(String(t.rewardPoints));
      setExtra(currentExtra);
      setDraftVersion(t.version);
      setDraftNotice(
        "Zadanie zostało zaktualizowane. Formularze pokazują najnowszy zapis; sprawdź wartości przed kolejną zmianą.",
      );
    }
    if (
      t.version !== draftVersion ||
      !selectedReservationValid ||
      currentEarly !== expectedAdjustment.earlyMinutes ||
      currentLate !== expectedAdjustment.lateMinutes
    ) {
      if (!selectedReservationValid) setAdjustedReservation(t.reservationId);
      setEarly(currentEarly);
      setLate(currentLate);
      setExpectedAdjustment({
        earlyMinutes: currentEarly,
        lateMinutes: currentLate,
      });
      if (t.version === draftVersion)
        setDraftNotice(
          "Korekta pobytu została zmieniona. Wczytano najnowsze wartości.",
        );
    }
  }, [
    p.manager,
    t.version,
    t.userId,
    t.rewardCents,
    t.rewardPoints,
    t.reservationId,
    draftVersion,
    currentExtra,
    selectedReservationValid,
    currentEarly,
    currentLate,
    expectedAdjustment.earlyMinutes,
    expectedAdjustment.lateMinutes,
  ]);
  const allChecks = [
    ...CHECKLIST.flatMap((g) => g.items.map((_, i) => `${g.id}:${i}`)),
    ...t.extraItems.map((_, i) => `extra:${i}`),
  ];
  const ready =
    allChecks.every((k) => t.checks.includes(k)) &&
    PHOTO_GROUPS.every((c) => t.photos.some((photo) => photo.category === c));
  return (
    <Sheet title="Szczegóły sprzątania" onClose={p.onClose} busy={compressing}>
      {draftNotice && p.manager && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900"
        >
          {draftNotice}
        </p>
      )}
      {compressing && (
        <p
          role="status"
          className="sticky top-0 z-20 rounded-xl bg-teal-50 p-4 text-sm text-teal-900"
        >
          Przygotowywanie i zapisywanie zdjęcia…
        </p>
      )}
      {p.error && (
        <p
          role="alert"
          className="sticky top-0 z-20 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          {p.error}
        </p>
      )}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Status task={t} />
          <span className="text-xs text-slate-500">{t.serviceDate}</span>
        </div>
        <h3 className="text-2xl font-bold leading-8 text-slate-950">
          {t.name}
        </h3>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-500">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          {t.address ?? "Adres wymaga potwierdzenia"}
        </p>
        <div className="mt-4 rounded-2xl bg-teal-900 p-5 text-white">
          <p className="text-xs text-teal-100">Twój termin · 60 minut</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">
            {t.start ? `${time(t.start)}–${time(t.end)}` : "Do przydzielenia"}
          </p>
          <p className="mt-2 text-xs text-teal-100">
            {t.rewardCents ? money(t.rewardCents) : "Stawka do ustalenia"} ·{" "}
            {t.rewardPoints} pkt
          </p>
        </div>
      </div>
      {t.alert && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900">
          {t.alert}
        </div>
      )}
      {t.forcedReason && (
        <p className="rounded-xl bg-violet-50 p-4 text-sm text-violet-900">
          Przydział koordynatora: {t.forcedReason}
        </p>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h4 className="mb-4 font-bold">Pomiędzy pobytami</h4>
        <div className="space-y-4 border-l-2 border-teal-100 pl-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Kończący się pobyt
            </p>
            <p className="mt-1 text-sm font-semibold">
              {t.stayFrom.slice(0, 10)} {time(t.stayFrom)} →{" "}
              {t.stayTo.slice(0, 10)} {time(t.stayTo)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Liczba gości: {t.guests ?? "brak danych"}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              Następny pobyt
            </p>
            <p className="mt-1 text-sm font-semibold">
              {t.nextFrom
                ? `${t.nextFrom.slice(0, 10)} ${time(t.nextFrom)} → ${t.nextTo?.slice(0, 10)} ${time(t.nextTo)}`
                : "Brak w odczytanym zakresie"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Liczba gości: {t.nextGuests ?? "brak danych"}
            </p>
          </div>
        </div>
        {t.provisional && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            Rezerwacja oczekująca.{" "}
            {t.entryApproved
              ? "Koordynator potwierdził możliwość wejścia."
              : "Nie wchodź bez potwierdzenia koordynatora."}
          </p>
        )}
      </div>
      {p.manager ? (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              void p.onAssign(
                person ? Number(person) : undefined,
                force,
                reason,
                draftVersion,
              );
            }}
            className="space-y-4 rounded-2xl border bg-white p-5"
          >
            <h4 className="font-bold">Przydział pracownika</h4>
            <Field label="Osoba">
              <select
                className={inputClass}
                value={person}
                onChange={(e) => setPerson(e.target.value)}
              >
                <option value="">Wybierz automatycznie</option>
                {p.team
                  .filter((u) => u.cleaningProfile?.active)
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.cleaningProfile?.displayName} · do{" "}
                      {u.cleaningProfile?.dailyLimit}/dzień
                    </option>
                  ))}
              </select>
            </Field>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
              />
              Przydział przymusowy, także po odmowie
            </label>
            {force && (
              <Field label="Uzasadnienie przydziału">
                <textarea
                  required
                  minLength={5}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={inputClass}
                />
              </Field>
            )}
            <p className="text-xs leading-5 text-slate-500">
              Limit 4, dostępność i brak kolizji obowiązują również przy
              przydziale przymusowym.
            </p>
            <button
              disabled={
                busy ||
                ["REVIEW", "CANCELLED", "IN_PROGRESS", "DONE"].includes(
                  t.status,
                )
              }
              className={`${buttonClass} w-full`}
            >
              Zapisz przydział
            </button>
            {t.provisional && !t.entryApproved && (
              <button
                type="button"
                disabled={busy}
                className={`${secondaryClass} w-full`}
                onClick={() => void p.onConfirm()}
              >
                Potwierdź możliwość wejścia do lokalu
              </button>
            )}
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              void p.onAdjust(
                adjustedReservation,
                early,
                late,
                expectedAdjustment,
              );
            }}
            className="space-y-4 rounded-2xl border bg-white p-5"
          >
            <h4 className="font-bold">Lokalna korekta godzin pobytu</h4>
            <Field label="Korygowany pobyt">
              <select
                className={inputClass}
                value={adjustedReservation}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setAdjustedReservation(id);
                  const a = p.adjustments.find(
                    (a) => a.reservationId === id && a.unitId === t.unitId,
                  );
                  setEarly(a?.earlyMinutes ?? 0);
                  setLate(a?.lateMinutes ?? 0);
                  setExpectedAdjustment({
                    earlyMinutes: a?.earlyMinutes ?? 0,
                    lateMinutes: a?.lateMinutes ?? 0,
                  });
                }}
              >
                <option value={t.reservationId}>Kończący się pobyt</option>
                {t.nextReservationId && (
                  <option value={t.nextReservationId}>Następny pobyt</option>
                )}
              </select>
            </Field>
            <p className="text-xs leading-5 text-slate-500">
              Nie zmienia iDoBooking ani panelu admina. Korekty są liczone od
              godzin źródłowych, a okno sprzątania zostanie ponownie sprawdzone.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Wcześniejsze zameldowanie">
                <MinuteSelect value={early} onChange={setEarly} />
              </Field>
              <Field label="Późniejsze wymeldowanie">
                <MinuteSelect value={late} onChange={setLate} />
              </Field>
            </div>
            <button
              disabled={busy || t.status === "DONE"}
              className={`${secondaryClass} w-full`}
            >
              Zapisz i przelicz okno
            </button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              void p.onConfigure(
                Math.round(Number(rate) * 100),
                Number(points),
                extra
                  .split("\n")
                  .map((s) => s.trim())
                  .filter(Boolean),
                draftVersion,
              );
            }}
            className="space-y-4 rounded-2xl border bg-white p-5"
          >
            <h4 className="font-bold">Instrukcje i nagroda</h4>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Stawka (zł)">
                <input
                  required
                  min={0}
                  max={1000}
                  step="0.01"
                  type="number"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Punkty">
                <input
                  required
                  min={0}
                  max={10000}
                  type="number"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Dodatkowe zadania — każde w nowym wierszu">
              <textarea
                className={inputClass}
                rows={4}
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </Field>
            <button
              disabled={busy || ["IN_PROGRESS", "DONE"].includes(t.status)}
              className={`${secondaryClass} w-full`}
            >
              Zapisz instrukcje
            </button>
          </form>
        </>
      ) : (
        <>
          {t.status === "UNASSIGNED" && (
            <button
              disabled={busy}
              className={`${buttonClass} w-full`}
              onClick={() => void p.onClaim()}
            >
              Zarezerwuj sprzątanie
            </button>
          )}
          {t.status === "OFFERED" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={busy}
                className={secondaryClass}
                onClick={() => void p.onRespond(false)}
              >
                Odrzuć
              </button>
              <button
                disabled={busy}
                className={buttonClass}
                onClick={() => void p.onRespond(true)}
              >
                Przyjmij sprzątanie
              </button>
            </div>
          )}
          {["ACCEPTED", "FORCED"].includes(t.status) && (
            <div className="space-y-3">
              <button
                disabled={busy}
                className={`${buttonClass} w-full`}
                onClick={() => void p.onStart()}
              >
                <Sparkles className="h-5 w-5" />
                Rozpocznij sprzątanie
              </button>
              <p className="text-center text-xs text-slate-500">
                Rozpoczęcie jest dostępne w przydzielonym terminie.
              </p>
              {t.status === "ACCEPTED" && (
                <button
                  disabled={busy}
                  className={`${secondaryClass} w-full`}
                  onClick={() => void p.onRespond(false)}
                >
                  Nie mogę wykonać — oddaj zadanie
                </button>
              )}
            </div>
          )}
        </>
      )}
      <div className="space-y-5 rounded-2xl border bg-white p-5">
        <div className="flex items-center justify-between">
          <h4 className="font-bold">Plan sprzątania</h4>
          <span className="text-xs text-teal-700">
            {t.checks.length}/{allChecks.length}
          </span>
        </div>
        {[
          ...CHECKLIST,
          ...(t.extraItems.length
            ? [{ id: "extra", title: "Dodatkowe zadania", items: t.extraItems }]
            : []),
        ].map((group) => (
          <div key={group.id}>
            <h5 className="mb-2 text-sm font-bold text-slate-700">
              {group.title}
            </h5>
            {group.items.map((label, i) => {
              const key = `${group.id}:${i}`;
              return (
                <label
                  key={key}
                  className="flex min-h-12 items-center gap-3 border-b border-slate-100 py-2 text-sm leading-5"
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-teal-700"
                    disabled={p.manager || busy || t.status !== "IN_PROGRESS"}
                    checked={t.checks.includes(key)}
                    onChange={(e) => {
                      if (compressionLock.current || p.busy) return;
                      void p.onChecks(
                        e.target.checked
                          ? [...t.checks, key]
                          : t.checks.filter((k) => k !== key),
                      );
                    }}
                  />
                  <span
                    className={
                      t.checks.includes(key)
                        ? "text-slate-400 line-through"
                        : "text-slate-700"
                    }
                  >
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h4 className="font-bold">Zdjęcia po sprzątaniu</h4>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Minimum jedno zdjęcie kuchni, pokoju i łazienki. Zdjęcia powinny
          przedstawiać lokal, bez osób i dokumentów gości.
        </p>
        <div className="my-4 grid grid-cols-3 gap-2">
          {PHOTO_GROUPS.map((group) => (
            <span
              key={group}
              className={`rounded-xl p-3 text-center text-xs font-semibold ${t.photos.some((ph) => ph.category === group) ? "bg-teal-50 text-teal-800" : "bg-slate-50 text-slate-500"}`}
            >
              {group === "kitchen"
                ? "Kuchnia"
                : group === "room"
                  ? "Pokój"
                  : "Łazienka"}
              <span className="mt-1 block">
                {t.photos.filter((ph) => ph.category === group).length} zdjęć
              </span>
            </span>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {t.photos.map((ph) => (
            <TaskPhoto key={ph.id} id={ph.id} />
          ))}
        </div>
        {!p.manager && t.status === "IN_PROGRESS" && (
          <div className="mt-4 space-y-3">
            <Field label="Co fotografujesz?">
              <select
                value={photoGroup}
                disabled={busy}
                onChange={(e) =>
                  setPhotoGroup(e.target.value as typeof photoGroup)
                }
                className={inputClass}
              >
                <option value="kitchen">Kuchnia</option>
                <option value="room">Pokój</option>
                <option value="bathroom">Łazienka</option>
                <option value="extra">Dodatkowe zadania</option>
              </select>
            </Field>
            <label className={`${secondaryClass} w-full cursor-pointer`}>
              <Camera className="h-5 w-5" />
              Dodaj zdjęcie
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label="Dodaj zdjęcie sprzątania"
                disabled={busy}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f && !p.busy && !compressionLock.current) {
                    compressionLock.current = true;
                    setCompressing(true);
                    void readCleaningPhoto(f)
                      .then((data) => p.onPhoto(photoGroup, data))
                      .catch((err) =>
                        p.onError(
                          err instanceof Error
                            ? err.message
                            : "Nie udało się wczytać zdjęcia",
                        ),
                      )
                      .finally(() => {
                        compressionLock.current = false;
                        setCompressing(false);
                      });
                  }
                }}
              />
            </label>
          </div>
        )}
      </div>
      {!p.manager && t.status === "IN_PROGRESS" && (
        <div className="sticky bottom-0 rounded-2xl border border-teal-100 bg-white p-4 shadow-lg">
          <button
            disabled={busy || !ready}
            onClick={() => {
              if (!compressionLock.current) void p.onComplete();
            }}
            className={`${buttonClass} w-full`}
          >
            <ClipboardCheck className="h-5 w-5" />
            Zakończ sprzątanie
          </button>
          {!ready && (
            <p className="mt-2 text-center text-xs text-slate-500">
              Dokończ checklistę i dodaj zdjęcia wszystkich trzech pomieszczeń.
            </p>
          )}
        </div>
      )}
      {t.status === "DONE" && (
        <div className="rounded-2xl bg-teal-900 p-6 text-center text-white">
          <Sparkles className="mx-auto h-8 w-8 text-teal-200" />
          <h4 className="mt-3 text-xl font-bold">
            Mieszkanie gotowe. Dziękujemy!
          </h4>
          <p className="mt-2 text-teal-100">
            {money(t.rewardCents)} i {t.rewardPoints} pkt zapisano w Twoim
            profilu.
          </p>
        </div>
      )}
    </Sheet>
  );
}
function MinuteSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {Array.from({ length: 8 }, (_, i) => i * 30).map((n) => (
        <option key={n} value={n}>
          {n
            ? `${Math.floor(n / 60)} h ${n % 60 ? "30 min" : ""}`
            : "Bez korekty"}
        </option>
      ))}
    </select>
  );
}
function TaskPhoto({ id }: { id: string }) {
  const photo = api.cleaning.workforce.photo.useQuery(
    { id },
    { retry: false, staleTime: 60000 },
  );
  const [open, setOpen] = useState(false);
  const access = useWorkforceAccess([photo.error]);
  if (access.blocked) return null;
  return (
    <>
      {photo.data ? (
        <button onClick={() => setOpen(true)} aria-label="Powiększ zdjęcie">
          <img
            src={photo.data.data}
            alt="Dokumentacja sprzątania"
            className="aspect-square w-full rounded-xl object-cover"
          />
        </button>
      ) : (
        <div className="aspect-square rounded-xl bg-slate-100 p-2 text-xs">
          {photo.error ? "Brak dostępu" : "Ładowanie…"}
        </div>
      )}
      {open && (
        <Sheet title="Zdjęcie sprzątania" onClose={() => setOpen(false)}>
          <img
            src={photo.data?.data}
            alt="Dokumentacja sprzątania w powiększeniu"
            className="w-full rounded-xl"
          />
        </Sheet>
      )}
    </>
  );
}

function EmployeeForm({
  user,
  onClose,
  onSaved,
}: {
  user?: TeamUser;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const profile = user?.cleaningProfile;
  const [name, setName] = useState(profile?.displayName ?? ""),
    [email, setEmail] = useState(user?.email ?? ""),
    [password, setPassword] = useState("");
  const [phone, setPhone] = useState(profile?.phone ?? ""),
    [photo, setPhoto] = useState<string | null>(profile?.photo ?? null);
  const [active, setActive] = useState(profile?.active ?? true),
    [limit, setLimit] = useState(profile?.dailyLimit ?? 4);
  const savedRules = profile?.rules as Rules | undefined;
  const [dates, setDates] = useState(
      savedRules?.unavailableDates.join("\n") ?? "",
    ),
    [weekdays, setWeekdays] = useState<number[]>(
      savedRules?.unavailableWeekdays ?? [],
    );
  const [units, setUnits] = useState(
      savedRules?.excludedUnitIds.join(", ") ?? "",
    ),
    [note, setNote] = useState(savedRules?.note ?? "");
  const [error, setError] = useState<string>(),
    [uploading, setUploading] = useState(false);
  const create = api.cleaning.workforce.createEmployee.useMutation(),
    update = api.cleaning.workforce.updateEmployee.useMutation();
  const resetPassword =
    api.cleaning.workforce.resetEmployeePassword.useMutation();
  const access = useWorkforceAccess([
    create.error,
    update.error,
    resetPassword.error,
  ]);
  const [newPassword, setNewPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState<string>();
  const busy = create.isPending || update.isPending || uploading;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    const rules: Rules = {
      version: 1,
      unavailableDates: dates
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
      unavailableWeekdays: weekdays,
      excludedUnitIds: units
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number),
      note,
    };
    const data = {
      displayName: name,
      phone: phone.replace(/[\s()-]/g, "") || null,
      photo,
      dailyLimit: limit,
      rules,
    };
    try {
      if (user) await update.mutateAsync({ ...data, userId: user.id, active });
      else await create.mutateAsync({ ...data, email, password });
      await onSaved();
    } catch (err) {
      if (access.reject(err)) return;
      setError(
        err instanceof Error ? err.message : "Nie udało się zapisać profilu",
      );
    }
  }
  if (access.blocked) return <AccessPending />;
  return (
    <Sheet
      title={user ? "Profil i dostępność pracownika" : "Nowa osoba w zespole"}
      onClose={onClose}
    >
      <form className="space-y-5" onSubmit={(e) => void submit(e)}>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-4 text-sm text-red-900"
          >
            {error}
          </p>
        )}
        <div className="flex items-center gap-4">
          <Avatar name={name || "Nowa osoba"} photo={photo} size="h-20 w-20" />
          <div>
            <label className={`${secondaryClass} cursor-pointer`}>
              <Camera className="h-4 w-4" />
              Zdjęcie profilowe
              <input
                aria-label="Zdjęcie profilowe pracownika"
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) {
                    setUploading(true);
                    void readCleaningPhoto(f)
                      .then(setPhoto)
                      .catch((err) =>
                        setError(
                          err instanceof Error
                            ? err.message
                            : "Nie udało się wczytać zdjęcia",
                        ),
                      )
                      .finally(() => setUploading(false));
                  }
                }}
              />
            </label>
            {photo && (
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="mt-2 block text-xs text-slate-500 underline"
              >
                Usuń zdjęcie z profilu
              </button>
            )}
          </div>
        </div>
        <Field label="Imię i nazwisko">
          <input
            required
            maxLength={100}
            minLength={2}
            autoComplete="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="E-mail do logowania">
          <input
            type="email"
            required
            readOnly={!!user}
            autoComplete="off"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        {!user && (
          <Field label="Hasło początkowe (minimum 10 znaków)">
            <input
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
        )}
        <Field label="Telefon WhatsApp">
          <input
            type="tel"
            autoComplete="tel"
            placeholder="+48 123 456 789"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="text-xs leading-5 text-slate-500">
          Numer posłuży do powiadomień o nowych przydziałach w najbliższych 5
          dniach. Obecnie zapisujemy je w kolejce, bez wysyłki.
        </p>
        <Field label="Maksymalnie mieszkań dziennie">
          <select
            className={inputClass}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "mieszkanie" : "mieszkania"}
              </option>
            ))}
          </select>
        </Field>
        {user && (
          <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-teal-700"
            />
            Aktywna osoba — może otrzymywać przydziały
          </label>
        )}
        <fieldset className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          <legend className="px-1 text-sm font-bold">Zasady dostępności</legend>
          <p className="text-xs leading-5 text-slate-500">
            Puste pola oznaczają brak wykluczeń. Można je uzupełniać w
            przyszłości. Notatka jest informacją dla koordynatora; automatyczny
            przydział sprawdza pola poniżej.
          </p>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-700">
              Dni tygodnia bez sprzątań
            </p>
            <div className="flex flex-wrap gap-2">
              {["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"].map((d, i) => (
                <label
                  key={d}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm ${weekdays.includes(i) ? "border-teal-200 bg-teal-50" : "border-slate-200"}`}
                >
                  <input
                    type="checkbox"
                    checked={weekdays.includes(i)}
                    onChange={(e) =>
                      setWeekdays(
                        e.target.checked
                          ? [...weekdays, i]
                          : weekdays.filter((n) => n !== i),
                      )
                    }
                  />
                  {d}
                </label>
              ))}
            </div>
          </div>
          <Field label="Niedostępne daty — RRRR-MM-DD, każda w nowym wierszu">
            <textarea
              rows={3}
              className={inputClass}
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="2026-11-01"
            />
          </Field>
          <Field label="Wykluczone ID lokali iDoBooking — oddziel przecinkami">
            <input
              className={inputClass}
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="np. 20, 50"
            />
          </Field>
          <Field label="Uwagi do planowania">
            <textarea
              rows={3}
              className={inputClass}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
          </Field>
        </fieldset>
        <button disabled={busy} className={`${buttonClass} w-full`}>
          {busy
            ? "Zapisywanie…"
            : user
              ? "Zapisz profil i zasady"
              : "Utwórz konto pracownika"}
        </button>
      </form>
      {user && (
        <form
          className="space-y-4 rounded-2xl border bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            setError(undefined);
            void resetPassword
              .mutateAsync({ userId: user.id, password: newPassword })
              .then(() => {
                setNewPassword("");
                setPasswordNotice(
                  "Nowe hasło zapisane. Poprzednie sesje pracownika zostały unieważnione.",
                );
              })
              .catch((err) =>
                setError(
                  err instanceof Error
                    ? err.message
                    : "Nie udało się zmienić hasła",
                ),
              );
          }}
        >
          <h3 className="font-bold">Odzyskanie dostępu</h3>
          <p className="text-xs leading-5 text-slate-500">
            Ustaw nowe hasło po potwierdzeniu tożsamości pracownika i przekaż je
            bezpiecznym kanałem.
          </p>
          <Field label="Nowe hasło pracownika">
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={10}
              maxLength={128}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <button
            disabled={resetPassword.isPending}
            className={`${secondaryClass} w-full`}
          >
            Zapisz nowe hasło
          </button>
          {passwordNotice && (
            <p role="status" className="text-sm text-teal-800">
              {passwordNotice}
            </p>
          )}
        </form>
      )}
    </Sheet>
  );
}
function WorkerProfile() {
  const utils = api.useUtils();
  const profile = api.cleaning.workforce.profile.useQuery();
  const from = todayInWarsaw();
  const board = api.cleaning.workforce.board.useQuery({
    from,
    to: addDays(from, 30),
  });
  const save = api.cleaning.workforce.saveProfile.useMutation(),
    payout = api.cleaning.workforce.requestPayout.useMutation(),
    redeem = api.cleaning.workforce.redeem.useMutation();
  const requestChange =
    api.cleaning.workforce.requestProfileChange.useMutation();
  const changePassword = api.cleaning.workforce.changePassword.useMutation();
  const [newEmail, setNewEmail] = useState(""),
    [changeReason, setChangeReason] = useState("");
  const [oldPassword, setOldPassword] = useState(""),
    [nextPassword, setNextPassword] = useState(""),
    [repeatPassword, setRepeatPassword] = useState("");
  const [editing, setEditing] = useState(false),
    [error, setError] = useState<string>(),
    [notice, setNotice] = useState<string>();
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [photo, setPhoto] = useState<string | null>(null),
    [amount, setAmount] = useState("");
  const [uploading, setUploading] = useState(false);
  const [acting, setActing] = useState(false);
  const actionLock = useRef(false);
  const access = useWorkforceAccess([profile.error, board.error]);
  const p = profile.data?.cleaningProfile,
    b = board.data?.balance;
  const usedRewards = new Set(
    REWARDS.filter((reward) =>
      board.data?.ledger.some(
        (entry) =>
          entry.userId === profile.data?.id &&
          entry.kind === "REDEEM" &&
          entry.option === reward.id &&
          entry.status !== "REJECTED" &&
          todayInWarsaw(new Date(entry.createdAt)).slice(
            0,
            reward.period === "year" ? 4 : 7,
          ) === from.slice(0, reward.period === "year" ? 4 : 7),
      ),
    ).map((reward) => reward.id),
  );
  async function action(fn: () => Promise<unknown>, message: string) {
    if (actionLock.current) return;
    actionLock.current = true;
    setActing(true);
    setError(undefined);
    setNotice(undefined);
    try {
      await fn();
      await utils.cleaning.workforce.invalidate();
      setNotice(message);
    } catch (e) {
      if (access.reject(e)) return;
      setError(e instanceof Error ? e.message : "Nie udało się zapisać");
      await utils.cleaning.workforce.invalidate();
    } finally {
      actionLock.current = false;
      setActing(false);
    }
  }
  const busy =
    save.isPending ||
    payout.isPending ||
    redeem.isPending ||
    requestChange.isPending ||
    changePassword.isPending ||
    uploading ||
    acting;
  if (access.blocked) return <AccessPending />;
  if (profile.isPending || board.isPending)
    return (
      <p
        role="status"
        className="rounded-2xl bg-white p-8 text-sm text-slate-500"
      >
        Pobieranie profilu i salda…
      </p>
    );
  if ((profile.error && !profile.data) || (board.error && !board.data))
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900"
      >
        Nie można teraz pobrać profilu i salda.
        <button
          onClick={() => void utils.cleaning.workforce.invalidate()}
          className="ml-2 min-h-11 font-semibold underline"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  const displayedError =
    error ?? profile.error?.message ?? board.error?.message;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {displayedError && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-900"
        >
          {displayedError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-teal-50 p-4 text-sm text-teal-900"
        >
          {notice}
        </p>
      )}
      <div className="rounded-3xl bg-teal-900 p-6 text-white">
        <div className="flex items-center gap-4">
          <Avatar
            name={p?.displayName ?? "Mój profil"}
            photo={p?.photo}
            size="h-20 w-20"
          />
          <div className="min-w-0">
            <h2 className="text-xl font-bold">
              {p?.displayName ?? "Uzupełnij swój profil"}
            </h2>
            <p className="mt-1 break-all text-xs text-teal-100">
              {profile.data?.email}
            </p>
            <p className="mt-1 text-xs text-teal-100">
              {p?.phone ?? "Dodaj numer telefonu"}
            </p>
          </div>
        </div>
        <button
          className="mt-5 min-h-11 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
          onClick={() => {
            setName(p?.displayName ?? "");
            setPhone(p?.phone ?? "");
            setPhoto(p?.photo ?? null);
            setNewEmail(profile.data?.email ?? "");
            setChangeReason("");
            setEditing(!editing);
          }}
        >
          Edytuj profil i zdjęcie
        </button>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
          <div>
            <b className="block text-xl">{money(b?.cents ?? 0)}</b>
            <span className="text-xs text-teal-100">do wypłaty</span>
          </div>
          <div>
            <b className="block text-xl">{b?.points ?? 0}</b>
            <span className="text-xs text-teal-100">punktów</span>
          </div>
          <div>
            <b className="block text-xl">{b?.stars ?? 0} ★</b>
            <span className="text-xs text-teal-100">wyróżnień</span>
          </div>
        </div>
      </div>
      {editing && (
        <form
          className="space-y-4 rounded-2xl border bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void action(async () => {
              const normalizedPhone = phone.replace(/[\s()-]/g, "") || null;
              const normalizedName = name.trim();
              const normalizedEmail = newEmail.trim().toLowerCase();
              if (
                normalizedName !== p?.displayName ||
                normalizedPhone !== p?.phone ||
                normalizedEmail !== profile.data?.email.toLowerCase()
              ) {
                await requestChange.mutateAsync({
                  displayName: normalizedName,
                  phone: normalizedPhone,
                  email: normalizedEmail,
                  reason: changeReason,
                  photo,
                });
              } else {
                await save.mutateAsync({
                  displayName: p?.displayName ?? normalizedName,
                  phone: p?.phone ?? null,
                  photo,
                });
              }
              setEditing(false);
            }, "Zdjęcie zapisane. Jeśli zmieniono dane kontaktowe, wniosek czeka na zatwierdzenie koordynatora.");
          }}
        >
          <Field label="Imię i nazwisko">
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              placeholder="+48 123 456 789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="E-mail do logowania">
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Powód zmiany danych">
            <textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className={inputClass}
              maxLength={500}
              placeholder="Wymagany przy zmianie imienia, telefonu lub e-maila"
            />
          </Field>
          <label className={`${secondaryClass} cursor-pointer`}>
            <Camera className="h-5 w-5" />
            {photo ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              aria-label="Moje zdjęcie profilowe"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setUploading(true);
                  void readCleaningPhoto(f)
                    .then(setPhoto)
                    .catch((err) =>
                      setError(
                        err instanceof Error
                          ? err.message
                          : "Nie udało się wczytać zdjęcia",
                      ),
                    )
                    .finally(() => setUploading(false));
                }
              }}
            />
          </label>
          {photo && <Avatar photo={photo} name={name} size="h-20 w-20" />}
          <button disabled={busy} className={`${buttonClass} w-full`}>
            Zapisz profil
          </button>
        </form>
      )}
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="font-bold">Twoja dostępność</h3>
        <p className="mt-2 text-sm text-slate-500">
          Maksymalnie {p?.dailyLimit ?? 4} mieszkania dziennie, pomiędzy 10:00 a
          15:00.
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Zasady i wykluczenia ustala koordynator. Zgłoś mu zmianę dostępności
          przed kolejnym planowaniem.
        </p>
      </div>
      <form
        className="space-y-4 rounded-2xl border bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void action(
            () =>
              payout.mutateAsync({ cents: Math.round(Number(amount) * 100) }),
            "Wniosek wysłany do koordynatora. Kwota jest zarezerwowana do rozliczenia.",
          );
        }}
      >
        <h3 className="font-bold">Wniosek o wypłatę</h3>
        <p className="text-xs leading-5 text-slate-500">
          Wniosek trafia do koordynatora. Aplikacja nie wykonuje przelewów.
        </p>
        <Field label="Kwota (zł)">
          <input
            type="number"
            min="0.01"
            max={(b?.cents ?? 0) / 100}
            step="0.01"
            required
            className={inputClass}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <button
          disabled={busy || !b?.cents}
          className={`${buttonClass} w-full`}
        >
          <Wallet className="h-4 w-4" />
          Zleć wypłatę
        </button>
      </form>
      <div className="space-y-4 rounded-2xl border bg-white p-5">
        <h3 className="font-bold">Wymień swoje punkty</h3>
        <p className="text-xs leading-5 text-slate-500">
          Każdy wariant gotówkowy raz w miesiącu, pół gwiazdki raz w roku.
        </p>
        {REWARDS.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3"
          >
            <div>
              <p className="text-sm font-semibold text-slate-700">{r.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {usedRewards.has(r.id)
                  ? r.period === "year"
                    ? "Wykorzystano w tym roku"
                    : "Wykorzystano w tym miesiącu"
                  : r.period === "year"
                    ? "Raz w roku"
                    : "Raz w miesiącu"}
              </p>
            </div>
            <button
              className={secondaryClass}
              disabled={
                busy || usedRewards.has(r.id) || (b?.points ?? 0) < r.cost
              }
              onClick={() =>
                void action(
                  () => redeem.mutateAsync({ option: r.id }),
                  "Punkty wymienione. Saldo zostało zaktualizowane.",
                )
              }
            >
              {usedRewards.has(r.id) ? "Wykorzystano" : "Wymień"}
            </button>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-white p-5">
        <h3 className="font-bold">Historia i wnioski</h3>
        {board.data?.profileRequests.map((r) => (
          <p
            key={r.id}
            className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600"
          >
            Zmiana danych:{" "}
            {r.status === "REQUESTED"
              ? "oczekuje na koordynatora"
              : r.status === "APPROVED"
                ? "zatwierdzona"
                : "odrzucona"}{" "}
            · {new Date(r.createdAt).toLocaleDateString("pl-PL")}
          </p>
        ))}
        {board.data?.ledger.length ? (
          <div className="mt-3 divide-y divide-slate-100">
            {[...board.data.ledger].reverse().map((l) => (
              <div key={l.id} className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {l.kind === "EARN"
                        ? "Ukończone sprzątanie"
                        : l.kind === "REDEEM"
                          ? "Wymiana punktów"
                          : "Wniosek o wypłatę"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(l.createdAt).toLocaleDateString("pl-PL")} ·{" "}
                      {l.status === "REQUESTED"
                        ? "Oczekuje"
                        : l.status === "APPROVED"
                          ? "W realizacji"
                          : l.status === "REJECTED"
                            ? "Odrzucony"
                            : "Zrealizowany"}
                    </p>
                  </div>
                  <b className="text-sm text-teal-800">
                    {money(l.cents)}
                    <span className="mt-1 block text-right text-xs text-slate-500">
                      {l.points} pkt
                    </span>
                  </b>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Pierwsze ukończone sprzątanie rozpocznie Twoją historię.
          </p>
        )}
      </div>
      <form
        className="space-y-4 rounded-2xl border bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (nextPassword !== repeatPassword) {
            setError("Nowe hasła muszą być takie same.");
            return;
          }
          void action(async () => {
            const result = await changePassword.mutateAsync({
              oldPassword,
              newPassword: nextPassword,
            });
            localStorage.setItem("cleaningAuthToken", result.token);
            setOldPassword("");
            setNextPassword("");
            setRepeatPassword("");
          }, "Hasło zmienione. Poprzednie sesje zostały wylogowane.");
        }}
      >
        <h3 className="font-bold">Zmień hasło</h3>
        <Field label="Obecne hasło">
          <input
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </Field>
        <Field label="Nowe hasło">
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            maxLength={128}
            required
            className={inputClass}
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
          />
        </Field>
        <Field label="Powtórz nowe hasło">
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
            className={inputClass}
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
          />
        </Field>
        <button
          disabled={changePassword.isPending}
          className={`${secondaryClass} w-full`}
        >
          Zmień hasło
        </button>
      </form>
    </div>
  );
}
