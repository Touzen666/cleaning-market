"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getQueryKey } from "@trpc/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { BrushCleaning, Eye, EyeOff, ArrowRight } from "lucide-react";
import { api } from "@/trpc/react";

export default function CleaningServiceLoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [showPassword, setShowPassword] = useState(false);
  const [help, setHelp] = useState(false);
  const [helpMessage, setHelpMessage] = useState<string>();
  const passwordHelp = api.cleaning.workforce.requestPasswordHelp.useMutation({
    onSuccess: (d) => setHelpMessage(d.message),
    onError: () =>
      setError(
        "Nie udało się zapisać zgłoszenia. Skontaktuj się z koordynatorem.",
      ),
  });
  const login = api.cleaningAuth.login.useMutation({
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: getQueryKey(api.cleaning) });
      queryClient.removeQueries({ queryKey: getQueryKey(api.cleaning) });
      queryClient.removeQueries({ queryKey: getQueryKey(api.cleaningAuth) });
      localStorage.setItem("cleaningAuthToken", data.token);
      router.replace("/cleaningService");
    },
    onError: (e) =>
      setError(
        e.data?.code === "UNAUTHORIZED"
          ? "Nieprawidłowy e-mail lub hasło."
          : "Nie udało się zalogować. Spróbuj ponownie za chwilę.",
      ),
  });

  async function enterAsAdmin() {
    await queryClient.cancelQueries({ queryKey: getQueryKey(api.cleaning) });
    localStorage.removeItem("cleaningAuthToken");
    queryClient.removeQueries({ queryKey: getQueryKey(api.cleaning) });
    queryClient.removeQueries({ queryKey: getQueryKey(api.cleaningAuth) });
    router.replace("/cleaningService");
  }
  return (
    <div
      lang="pl"
      className="flex min-h-screen items-center justify-center bg-[#f6f8fa] px-4 py-10"
    >
      <div className="w-full max-w-md">
        <div className="mb-7 flex items-center justify-center gap-3">
          <div className="rounded-xl bg-teal-800 p-3 text-white">
            <BrushCleaning className="h-6 w-6" aria-hidden="true" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Bookmarket <span className="font-normal text-slate-400">/</span>{" "}
            cleaning
          </span>
        </div>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            Zaloguj się do cleaning
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Rezerwacje i przygotowanie sprzątań w jednym miejscu.
          </p>
          {session?.user?.type === "ADMIN" && (
            <button
              onClick={() => void enterAsAdmin()}
              className="mt-5 w-full rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900"
            >
              Otwórz panel jako administrator
            </button>
          )}
          {help ? (
            <form
              className="mt-7 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setError(undefined);
                passwordHelp.mutate({ email: email.trim() });
              }}
            >
              <p className="text-sm leading-6 text-slate-500">
                Podaj e-mail konta. Zgłoszenie odzyskania dostępu trafi do
                koordynatora w aplikacji.
              </p>
              <label className="block text-sm font-semibold text-slate-700">
                E-mail
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3"
                />
              </label>
              {helpMessage && (
                <p
                  role="status"
                  className="rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-900"
                >
                  {helpMessage}
                </p>
              )}
              {error && (
                <p role="alert" className="text-sm text-red-800">
                  {error}
                </p>
              )}
              <button
                disabled={passwordHelp.isPending}
                className="min-h-12 w-full rounded-xl bg-teal-800 p-3 text-sm font-semibold text-white"
              >
                Zgłoś problem z hasłem
              </button>
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="min-h-11 w-full text-sm font-semibold text-slate-500"
              >
                Wróć do logowania
              </button>
            </form>
          ) : (
            <form
              className="mt-7 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                setError(undefined);
                login.mutate({ email: email.trim(), password });
              }}
            >
              <label className="block text-sm font-semibold text-slate-700">
                E-mail
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="twoj@email.pl"
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-normal outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
              </label>
              <div>
                <label
                  htmlFor="cleaning-password"
                  className="block text-sm font-semibold text-slate-700"
                >
                  Hasło
                </label>
                <div className="relative mt-2">
                  <input
                    id="cleaning-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-3 pr-12 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                    className="absolute right-1 top-1 rounded-md p-2.5 text-slate-500 hover:bg-slate-100"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={login.isPending}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 hover:bg-teal-900"
              >
                {login.isPending ? "Logowanie…" : "Zaloguj się"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          )}
          {!help && (
            <button
              type="button"
              onClick={() => {
                setHelp(true);
                setError(undefined);
              }}
              className="mt-4 min-h-11 w-full text-sm font-semibold text-teal-800"
            >
              Nie pamiętam hasła
            </button>
          )}
        </section>
        <p className="mt-5 text-center text-xs leading-5 text-slate-500">
          Dostęp do planowania ma koordynator sprzątania.
        </p>
      </div>
    </div>
  );
}
