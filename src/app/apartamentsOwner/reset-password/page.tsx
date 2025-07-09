"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/trpc/react";
import toast from "react-hot-toast";
import { type AppRouter } from "@/server/api/root";
import { type TRPCClientErrorLike } from "@trpc/client";
import { useState, useEffect } from "react";

const RequestResetSchema = z.object({
  email: z.string().email({ message: "Nieprawidłowy adres email" }),
});
type RequestResetForm = z.infer<typeof RequestResetSchema>;

const ResetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, { message: "Hasło musi mieć co najmniej 8 znaków" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hasła nie są zgodne",
    path: ["confirmPassword"],
  });
type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;

function ResetPasswordComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [view, setView] = useState<"form" | "sending" | "success">("form");
  const [countdown, setCountdown] = useState(8);

  const {
    register: registerRequest,
    handleSubmit: handleSubmitRequest,
    formState: { errors: errorsRequest },
  } = useForm<RequestResetForm>({
    resolver: zodResolver(RequestResetSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: errorsReset },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const requestMutation = api.ownerAuth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setView("success");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
      setView("form");
    },
  });

  const resetMutation = api.ownerAuth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("Hasło zostało pomyślnie zmienione!");
      router.push("/apartamentsOwner/login");
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      toast.error(error.message);
    },
  });

  const handleRequestReset: SubmitHandler<RequestResetForm> = (data) => {
    setView("sending");
    requestMutation.mutate(data);
  };

  const handleResetPassword: SubmitHandler<ResetPasswordForm> = (data) => {
    if (!token) return;
    resetMutation.mutate({ token, newPassword: data.newPassword });
  };

  useEffect(() => {
    if (view === "success") {
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      const redirectTimeout = setTimeout(() => {
        router.push("/apartamentsOwner/login");
      }, 8000);

      return () => {
        clearInterval(timer);
        clearTimeout(redirectTimeout);
      };
    }
  }, [view, router]);

  if (token) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-12 sm:px-6 lg:px-8"
        style={{ backgroundImage: "url('/login_bg.png')" }}
      >
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white/90 p-10 shadow-2xl backdrop-blur-sm">
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Ustaw nowe hasło
          </h2>
          <div className="rounded-xl bg-white p-8 shadow-lg">
            <form
              onSubmit={handleSubmitReset(handleResetPassword)}
              className="space-y-6"
            >
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Nowe hasło
                </label>
                <div className="mt-1">
                  <input
                    id="newPassword"
                    type="password"
                    {...registerReset("newPassword")}
                    className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-amber-500 focus:outline-none focus:ring-amber-500 sm:text-sm"
                  />
                  {errorsReset.newPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errorsReset.newPassword.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Potwierdź hasło
                </label>
                <div className="mt-1">
                  <input
                    id="confirmPassword"
                    type="password"
                    {...registerReset("confirmPassword")}
                    className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-amber-500 focus:outline-none focus:ring-amber-500 sm:text-sm"
                  />
                  {errorsReset.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">
                      {errorsReset.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="submit"
                disabled={resetMutation.isPending}
                className="group relative flex w-full justify-center rounded-lg border border-transparent bg-amber-500 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resetMutation.isPending
                  ? "Zapisywanie..."
                  : "Zapisz nowe hasło"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-12 sm:px-6 lg:px-8"
      style={{ backgroundImage: "url('/login_bg.png')" }}
    >
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white/90 p-10 shadow-2xl backdrop-blur-sm">
        {view === "form" && (
          <>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Zresetuj hasło
            </h2>
            <div className="rounded-xl bg-white p-8 shadow-lg">
              <form
                onSubmit={handleSubmitRequest(handleRequestReset)}
                className="space-y-6"
              >
                <p className="text-center text-sm text-gray-600">
                  Podaj swój adres e-mail, aby otrzymać link do zresetowania
                  hasła.
                </p>
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Adres e-mail
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      type="email"
                      {...registerRequest("email")}
                      className="relative block w-full appearance-none rounded-lg border border-gray-300 px-3 py-3 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-amber-500 focus:outline-none focus:ring-amber-500 sm:text-sm"
                    />
                    {errorsRequest.email && (
                      <p className="mt-1 text-sm text-red-600">
                        {errorsRequest.email.message}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="group relative flex w-full justify-center rounded-lg border border-transparent bg-amber-500 px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {"Wyślij link"}
                </button>
              </form>
            </div>
          </>
        )}

        {view === "sending" && (
          <div className="flex flex-col items-center justify-center text-center">
            <svg
              className="h-24 w-24 animate-pulse text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 8.5L12 15L21 8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 5.5H3V18.5H21V5.5Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">
              Wysyłanie linku...
            </h2>
            <p className="mt-2 text-gray-600">Proszę czekać.</p>
          </div>
        )}

        {view === "success" && (
          <div className="flex flex-col items-center justify-center text-center">
            <svg
              className="h-24 w-24 text-green-500"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-gray-800">
              Link został wysłany!
            </h2>
            <p className="mt-2 text-gray-600">
              Sprawdź swoją skrzynkę mailową i postępuj zgodnie z instrukcjami.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Przekierowanie do strony logowania za {countdown}s...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <ResetPasswordComponent />
    </Suspense>
  );
}
