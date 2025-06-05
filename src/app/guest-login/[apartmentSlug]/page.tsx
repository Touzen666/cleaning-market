"use client";

import React, { useState, useEffect } from "react";

interface GuestLoginPageProps {
  params: Promise<{
    apartmentSlug: string;
  }>;
}

export default function GuestLoginPage({ params }: GuestLoginPageProps) {
  const actualParams = React.use(params);
  const { apartmentSlug } = actualParams;

  // Zainicjalizuj stan na null, aby wskazać ładowanie
  const [displayApartmentName, setDisplayApartmentName] = useState<
    string | null
  >(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    documentNumber: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apartmentSlug) {
      const fetchApartmentName = async () => {
        try {
          console.log(
            `[GuestLoginPage] Fetching name for slug: ${apartmentSlug}`,
          );
          const response = await fetch(
            `/api/apartments/details/${apartmentSlug}`,
          );
          if (response.ok) {
            const data = (await response.json()) as {
              success: boolean;
              name?: string;
              error?: string;
            };
            if (data.success && data.name) {
              console.log(
                `[GuestLoginPage] Fetched name: ${data.name} for slug: ${apartmentSlug}`,
              );
              setDisplayApartmentName(data.name);
            } else {
              console.warn(
                `[GuestLoginPage] API succeeded but no name returned for ${apartmentSlug}:`,
                data.error,
              );
              setDisplayApartmentName(apartmentSlug); // Fallback to slug
            }
          } else {
            console.warn(
              `[GuestLoginPage] API error fetching name for ${apartmentSlug}:`,
              response.status,
            );
            setDisplayApartmentName(apartmentSlug); // Fallback to slug
          }
        } catch (err) {
          console.error("[GuestLoginPage] Error in fetchApartmentName:", err);
          setDisplayApartmentName(apartmentSlug); // Fallback to slug
        }
      };
      void fetchApartmentName();
    }
  }, [apartmentSlug]); // Zależność od apartmentSlug

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/guest-auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          apartmentSlug,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (response.ok && result.success) {
        // Przekieruj do dashboardu gościa
        window.location.href = `/guest-dashboard/${apartmentSlug}`;
      } else {
        setError(
          result.error ?? "Błąd podczas logowania. Sprawdź wprowadzone dane.",
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Wystąpił błąd połączenia. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Logowanie Gościa
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            <span className="font-mono text-indigo-600">
              {displayApartmentName ?? "Ładuję nazwę..."}
            </span>
          </p>
          <p className="mt-2 text-center text-xs text-gray-500">
            Wprowadź dane z karty meldunkowej aby uzyskać dostęp do panelu
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label htmlFor="firstName" className="sr-only">
                Imię
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Imię"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="sr-only">
                Nazwisko
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Nazwisko"
              />
            </div>
            <div>
              <label htmlFor="documentNumber" className="sr-only">
                Numer dokumentu
              </label>
              <input
                id="documentNumber"
                name="documentNumber"
                type="text"
                required
                value={formData.documentNumber}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Numer dokumentu"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? "Logowanie..." : "Zaloguj się"}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Nie masz dostępu?{" "}
              <a
                href={`/check-in-card/${apartmentSlug}`}
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Wypełnij kartę meldunkową
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
