"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export default function ApartmentsOwnerLoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  // Sprawdź tryb maintenance
  const { data: maintenanceData } =
    api.adminDashboard.isMaintenanceMode.useQuery(undefined, {
      refetchInterval: 30000, // Sprawdzaj co 30 sekund
    });

  useEffect(() => {
    if (maintenanceData) {
      setShowMaintenance(maintenanceData.enabled);
      setMaintenanceMessage(maintenanceData.message);
    }
  }, [maintenanceData]);

  const loginMutation = api.ownerAuth.login.useMutation({
    onSuccess: (data) => {
      // Store session token and email in localStorage (in production use secure httpOnly cookies)
      localStorage.setItem("ownerSessionToken", data.sessionToken);
      localStorage.setItem("ownerEmail", data.owner.email);

      // Redirect to owner dashboard
      if (data.isFirstLogin) {
        // Redirect to password setup page
        router.push("/apartamentsOwner/setup-password");
      } else {
        // Redirect to owner dashboard
        router.push("/apartamentsOwner/dashboard");
      }
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = "Email jest wymagany";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Nieprawidłowy format email";
    }
    if (!formData.password) {
      newErrors.password = "Hasło jest wymagane";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
      });
    } catch (error) {
      // Error is handled in onError callback
      console.error("Błąd logowania:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Jeśli tryb maintenance jest włączony, pokaż tylko wiadomość maintenance
  if (showMaintenance) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-cover bg-center px-4 py-12 sm:px-6 lg:px-8"
        style={{ backgroundImage: "url('/login_bg.png')" }}
      >
        <div className="w-full max-w-md space-y-8 rounded-xl bg-white/90 p-10 shadow-2xl backdrop-blur-sm">
          <div>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-500">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Tryb Maintenance
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {maintenanceMessage}
            </p>
          </div>

          <div className="rounded-xl border border-orange-200 bg-orange-50 p-8 shadow-lg">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-orange-800">
                Dostęp Tymczasowo Niedostępny
              </h3>
              <p className="mt-2 text-sm text-orange-700">
                Przepraszamy za niedogodności. Pracujemy nad ulepszeniami
                systemu.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center rounded-md border border-transparent bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Sprawdź ponownie
                </button>
              </div>
            </div>
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
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5m14 0v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Panel Właściciela
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Zaloguj się do systemu zarządzania apartamentami
          </p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-lg">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{errors.general}</div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Adres email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`relative block w-full appearance-none border px-3 py-3 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  } rounded-lg text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-gold focus:outline-none focus:ring-brand-gold sm:text-sm`}
                  placeholder="właściciel@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Hasło
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`relative block w-full appearance-none border px-3 py-3 ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  } rounded-lg text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-gold focus:outline-none focus:ring-brand-gold sm:text-sm`}
                  placeholder="Wprowadź hasło"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Zapamiętaj mnie
                </label>
              </div>

              <div className="text-sm">
                <a
                  href="/apartamentsOwner/reset-password"
                  className="font-medium text-brand-gold hover:text-yellow-500"
                >
                  Zapomniałeś hasła?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || loginMutation.isPending}
                className="group relative flex w-full justify-center rounded-lg border border-transparent bg-brand-gold px-4 py-3 text-sm font-medium text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-yellow-500"
              >
                {isLoading || loginMutation.isPending ? (
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
                ) : null}
                {isLoading || loginMutation.isPending
                  ? "Logowanie..."
                  : "Zaloguj się"}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">
                  Potrzebujesz dostępu?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Skontaktuj się z administratorem systemu aby otrzymać dane do
                logowania
              </p>
              <a
                href="mailto:biuro@zlote-wynajmy.com"
                className="mt-2 inline-block font-medium text-brand-gold hover:text-yellow-500"
              >
                biuro@zlote-wynajmy.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
