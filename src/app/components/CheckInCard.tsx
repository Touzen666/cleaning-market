"use client";

import React, { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import {
  checkInFormSchema,
  type CheckInFormData,
} from "@/lib/validations/guest";

// It's good practice to define the expected shape of your API response
interface ApiResponse {
  success: boolean;
  data?: {
    checkInCard: { id: string; [key: string]: unknown };
    reservation: { id: number; [key: string]: unknown };
    redirectTo: string;
  };
  error?: string;
}

// Define props for CheckInCard
interface CheckInCardProps {
  apartmentSlug: string;
}

const CheckInCard: React.FC<CheckInCardProps> = ({ apartmentSlug }) => {
  const [headerDisplayApartmentName, setHeaderDisplayApartmentName] =
    useState<string>(apartmentSlug);

  // Używamy prostego useState zamiast react-hook-form
  const [formData, setFormData] = useState<CheckInFormData>({
    bookingHolderFirstName: "",
    bookingHolderLastName: "",
    isDifferentGuest: false,
    guestFirstName: "",
    guestLastName: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    nationality: "",
    documentType: "ID Card",
    documentNumber: "",
    addressStreet: "",
    addressCity: "",
    addressZipCode: "",
    addressCountry: "",
    submittedApartmentIdentifier: apartmentSlug,
    stayStartDate: "",
    stayEndDate: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // tRPC queries i mutations
  const { data: apartmentDetails, isLoading: isFetchingName } =
    api.apartments.getDetails.useQuery(
      { slug: apartmentSlug },
      { enabled: !!apartmentSlug },
    );

  const checkInMutation = api.checkIn.create.useMutation({
    onSuccess: (data) => {
      if (data.success && data.data?.redirectTo) {
        console.log("✅ Check-in successful");

        // Ustaw cookie po stronie klienta
        if (data.data.sessionToken && data.data.sessionExpiresAt) {
          const expiresDate = new Date(data.data.sessionExpiresAt);
          const maxAge = Math.floor(
            (expiresDate.getTime() - Date.now()) / 1000,
          );

          document.cookie = `guest-session=${data.data.sessionToken}; path=/; max-age=${maxAge}; SameSite=lax`;
          console.log("🍪 Client-side cookie set:", data.data.sessionToken);
          console.log("🕒 Cookie expires:", expiresDate.toISOString());
        }

        // Używamy window.location.href zamiast replace, aby zachować cookie
        setTimeout(() => {
          window.location.href = data.data.redirectTo;
        }, 2000);
      }
    },
  });

  // Update apartment name when data loads
  useEffect(() => {
    if (apartmentDetails?.success && apartmentDetails.name) {
      setHeaderDisplayApartmentName(apartmentDetails.name);
    } else {
      setHeaderDisplayApartmentName(apartmentSlug);
    }
  }, [apartmentDetails, apartmentSlug]);

  // Auto-fill firstName/lastName based on isDifferentGuest
  useEffect(() => {
    if (formData.isDifferentGuest) {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.guestFirstName ?? "",
        lastName: prev.guestLastName ?? "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        firstName: prev.bookingHolderFirstName ?? "",
        lastName: prev.bookingHolderLastName ?? "",
      }));
    }
  }, [
    formData.isDifferentGuest,
    formData.bookingHolderFirstName,
    formData.bookingHolderLastName,
    formData.guestFirstName,
    formData.guestLastName,
  ]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        guestFirstName: checked ? prev.guestFirstName : "",
        guestLastName: checked ? prev.guestLastName : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate with Zod
    const result = checkInFormSchema.safeParse(formData);

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        newErrors[error.path[0] as string] = error.message;
      });
      setErrors(newErrors);
      return;
    }

    setErrors({});
    console.log("🔥 Form submitted for apartment:", apartmentSlug);
    checkInMutation.mutate(result.data);
  };

  return (
    <div className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-md">
      <h1 className="mb-6 text-center text-2xl font-bold text-gray-800">
        Karta Meldunkowa dla:{" "}
        <span className="font-mono text-indigo-600">
          {isFetchingName && headerDisplayApartmentName === apartmentSlug
            ? "Wyszukuje apartament..."
            : headerDisplayApartmentName}
        </span>
      </h1>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Dane Osoby Rezerwującej */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane osoby która dokonała rezerwującej
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Imię
              </label>
              <input
                name="bookingHolderFirstName"
                value={formData.bookingHolderFirstName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.bookingHolderFirstName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bookingHolderFirstName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nazwisko
              </label>
              <input
                name="bookingHolderLastName"
                value={formData.bookingHolderLastName}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.bookingHolderLastName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.bookingHolderLastName}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Checkbox for different guest */}
        <div className="mt-4 flex items-center">
          <input
            name="isDifferentGuest"
            type="checkbox"
            checked={formData.isDifferentGuest}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label className="ml-2 block text-sm text-gray-900">
            Czy osoba meldująca się w apartamencie to inna osoba niż ta która
            złożyła rezerwacje?
          </label>
        </div>

        {/* Guest details when different */}
        {formData.isDifferentGuest && (
          <fieldset className="rounded-md border p-4">
            <legend className="px-2 text-lg font-semibold text-gray-700">
              Dane osoby meldowanej
            </legend>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Imię osoby meldowanej
                </label>
                <input
                  name="guestFirstName"
                  value={formData.guestFirstName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                {errors.guestFirstName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.guestFirstName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nazwisko osoby meldowanej
                </label>
                <input
                  name="guestLastName"
                  value={formData.guestLastName}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                />
                {errors.guestLastName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.guestLastName}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        )}

        {/* Rest of form fields... */}
        {/* Date of Birth, Nationality, Document, Address fields */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Szczegóły osoby meldowanej
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data urodzenia
              </label>
              <input
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.dateOfBirth && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.dateOfBirth}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Narodowość
              </label>
              <input
                name="nationality"
                value={formData.nationality}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.nationality && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.nationality}
                </p>
              )}
            </div>
            {/* Document Type and Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rodzaj dokumentu
              </label>
              <select
                name="documentType"
                value={formData.documentType}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ID Card">Dowód osobisty</option>
                <option value="Passport">Paszport</option>
                <option value="Driving License">Prawo jazdy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Numer dokumentu
              </label>
              <input
                name="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.documentNumber && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.documentNumber}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Stay dates */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane Rezerwacji
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data zameldowania
              </label>
              <input
                name="stayStartDate"
                value={formData.stayStartDate}
                onChange={handleChange}
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.stayStartDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.stayStartDate}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Data wymeldowania
              </label>
              <input
                name="stayEndDate"
                value={formData.stayEndDate}
                onChange={handleChange}
                type="date"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.stayEndDate && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.stayEndDate}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Address fields */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane Adresowe
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Ulica i numer domu/mieszkania
              </label>
              <input
                name="addressStreet"
                value={formData.addressStreet}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.addressStreet && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.addressStreet}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Miejscowość
              </label>
              <input
                name="addressCity"
                value={formData.addressCity}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.addressCity && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.addressCity}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kod pocztowy
              </label>
              <input
                name="addressZipCode"
                value={formData.addressZipCode}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.addressZipCode && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.addressZipCode}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kraj
              </label>
              <input
                name="addressCountry"
                value={formData.addressCountry}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
              {errors.addressCountry && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.addressCountry}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Submit status */}
        {checkInMutation.isError && (
          <div className="rounded bg-red-100 p-4 text-sm text-red-700">
            {checkInMutation.error?.message ??
              "Wystąpił błąd podczas przesyłania karty meldunkowej."}
          </div>
        )}

        {checkInMutation.isSuccess && checkInMutation.data?.success && (
          <div className="rounded bg-green-100 p-4 text-sm text-green-700">
            Karta meldunkowa została pomyślnie przesłana! Przekierowywanie do
            panelu gościa...
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={checkInMutation.isPending}
            className="rounded-md border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {checkInMutation.isPending
              ? "Przetwarzanie..."
              : "Wyślij Kartę Meldunkową"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckInCard;
