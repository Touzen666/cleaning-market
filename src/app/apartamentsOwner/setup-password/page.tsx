"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function SetupPasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  const setPasswordMutation = api.ownerAuth.setPassword.useMutation({
    onSuccess: () => {
      // Clear localStorage data
      localStorage.removeItem("ownerSessionToken");
      localStorage.removeItem("ownerEmail");

      // Redirect to login with success message
      alert("Hasło zostało pomyślnie ustawione! Zaloguj się ponownie.");
      router.push("/apartamentsOwner/login");
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("ownerSessionToken");
    const email = localStorage.getItem("ownerEmail");
    if (!token || !email) {
      router.push("/apartamentsOwner/login");
      return;
    }
    setSessionToken(token);
    setOwnerEmail(email);
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push("Hasło musi mieć minimum 8 znaków");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Hasło musi zawierać przynajmniej jedną wielką literę");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Hasło musi zawierać przynajmniej jedną małą literę");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Hasło musi zawierać przynajmniej jedną cyfrę");
    }
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Validate passwords
    const newErrors: Record<string, string> = {};

    if (formData.password) {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0 && passwordErrors[0]) {
        newErrors.password = passwordErrors[0];
      }
    }

    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "Hasła nie są identyczne";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!sessionToken || !ownerEmail) {
      setErrors({ general: "Błąd sesji. Zaloguj się ponownie." });
      return;
    }

    // Call API to set password
    try {
      await setPasswordMutation.mutateAsync({
        sessionToken,
        newPassword: formData.password,
        email: ownerEmail,
      });
    } catch (error) {
      // Error handled in onError callback
      console.error("Błąd ustawiania hasła:", error);
    }
  };

  if (!sessionToken) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-brand-gold h-32 w-32 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-amber-100 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <div className="bg-brand-gold mx-auto flex h-12 w-12 items-center justify-center rounded-full">
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
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Ustaw nowe hasło
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            To jest Twoje pierwsze logowanie. Ustaw bezpieczne hasło, które
            będziesz używać do kolejnych logowań.
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
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Nowe hasło
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`relative block w-full appearance-none border px-3 py-3 ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  } focus:border-brand-gold focus:ring-brand-gold rounded-lg text-gray-900 placeholder-gray-500 focus:z-10 focus:outline-none sm:text-sm`}
                  placeholder="Wprowadź nowe hasło"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
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
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`relative block w-full appearance-none border px-3 py-3 ${
                    errors.confirmPassword
                      ? "border-red-300"
                      : "border-gray-300"
                  } focus:border-brand-gold focus:ring-brand-gold rounded-lg text-gray-900 placeholder-gray-500 focus:z-10 focus:outline-none sm:text-sm`}
                  placeholder="Powtórz hasło"
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="rounded-lg bg-yellow-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-yellow-900">
                Wymagania dotyczące hasła:
              </h4>
              <ul className="space-y-1 text-sm text-yellow-700">
                <li className="flex items-center">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Minimum 8 znaków
                </li>
                <li className="flex items-center">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Przynajmniej jedna wielka litera
                </li>
                <li className="flex items-center">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Przynajmniej jedna mała litera
                </li>
                <li className="flex items-center">
                  <svg
                    className="mr-2 h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Przynajmniej jedna cyfra
                </li>
              </ul>
            </div>

            <div>
              <button
                type="submit"
                disabled={setPasswordMutation.isPending}
                className="bg-brand-gold focus:ring-brand-gold group relative flex w-full justify-center rounded-lg border border-transparent px-4 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {setPasswordMutation.isPending
                  ? "Ustawianie hasła..."
                  : "Ustaw hasło"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
