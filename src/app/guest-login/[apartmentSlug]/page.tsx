"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  guestLoginSchema,
  type GuestLoginData,
  type GuestLoginPageProps,
} from "@/lib/validations/guest";

export default function GuestLoginPage({ params }: GuestLoginPageProps) {
  const actualParams = React.use(params);
  const { apartmentSlug } = actualParams;

  const [displayApartmentName, setDisplayApartmentName] = useState<
    string | null
  >(null);
  const [formData, setFormData] = useState<GuestLoginData>({
    firstName: "",
    lastName: "",
    documentNumber: "",
    apartmentSlug,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // tRPC queries and mutations
  const { data: apartmentDetails } = api.apartments.getDetails.useQuery(
    { slug: apartmentSlug },
    { enabled: !!apartmentSlug },
  );

  const loginMutation = api.guestAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        console.log("✅ Login successful, redirecting in 2 seconds...");
        setTimeout(() => {
          console.log("🔄 Redirecting to dashboard");
          window.location.href = `/guest-dashboard/${apartmentSlug}`;
        }, 2000);
      }
    },
  });

  useEffect(() => {
    if (apartmentDetails?.success && apartmentDetails.name) {
      setDisplayApartmentName(apartmentDetails.name);
    } else {
      setDisplayApartmentName(apartmentSlug);
    }
  }, [apartmentDetails, apartmentSlug]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = guestLoginSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        newErrors[error.path[0] as string] = error.message;
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});
    loginMutation.mutate(result.data);
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
        </div>

        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Imię"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
              )}
            </div>
            <div>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Nazwisko"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
              )}
            </div>
            <div>
              <input
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                className="relative block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                placeholder="Numer dokumentu"
              />
              {errors.documentNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.documentNumber}
                </p>
              )}
            </div>
          </div>

          {loginMutation.isError && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">
                {loginMutation.error?.message ??
                  "Błąd podczas logowania. Sprawdź wprowadzone dane."}
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loginMutation.isPending ? "Logowanie..." : "Zaloguj się"}
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
