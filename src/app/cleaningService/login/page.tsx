"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

export default function CleaningServiceLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = api.cleaningAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("cleaningAuthToken", data.token);
      router.push("/cleaningService"); // Docelowy dashboard dodamy w kolejnym kroku
    },
    onError: (e) => {
      setError(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-center text-2xl font-bold">
          Cleaning Service
        </h1>
        <p className="mb-6 text-center text-sm text-gray-600">
          Zaloguj się aby zarządzać sprzątaniem
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              placeholder="email@firma.pl"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Hasło
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
                className="absolute inset-y-0 right-0 mr-2 flex items-center rounded px-2 text-xs text-gray-600 hover:bg-gray-100"
              >
                {showPassword ? "Ukryj" : "Pokaż"}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="mt-2 w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm disabled:opacity-50 hover:bg-indigo-700"
          >
            {loginMutation.isPending ? "Logowanie..." : "Zaloguj"}
          </button>
        </form>
      </div>
    </div>
  );
}
