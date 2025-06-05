"use client";

import React, { useState, useEffect } from "react";
// Removed useSearchParams as apartmentSlug comes from props now

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

// This interface should ideally be generated from your Prisma schema
// or be a subset of the Prisma.CheckInCardCreateInput type.
interface CheckInFormData {
  bookingHolderFirstName: string;
  bookingHolderLastName: string;
  isDifferentGuest: boolean;
  guestFirstName: string;
  guestLastName: string;
  dateOfBirth: string;
  nationality: string;
  documentType: string;
  documentNumber: string;
  addressStreet: string;
  addressCity: string;
  addressZipCode: string;
  addressCountry: string;
  stayStartDate: string;
  stayEndDate: string;
}

// Define props for CheckInCard
interface CheckInCardProps {
  apartmentSlug: string;
}

const CheckInCard: React.FC<CheckInCardProps> = ({ apartmentSlug }) => {
  // Stan dla nazwy apartamentu w nagłówku
  const [headerDisplayApartmentName, setHeaderDisplayApartmentName] =
    useState<string>(apartmentSlug);
  const [isFetchingName, setIsFetchingName] = useState<boolean>(false); // Nowy stan do śledzenia ładowania nazwy

  const [formData, setFormData] = useState<CheckInFormData>({
    bookingHolderFirstName: "",
    bookingHolderLastName: "",
    isDifferentGuest: false,
    guestFirstName: "",
    guestLastName: "",
    dateOfBirth: "",
    nationality: "",
    documentType: "ID Card",
    documentNumber: "",
    addressStreet: "",
    addressCity: "",
    addressZipCode: "",
    addressCountry: "",
    stayStartDate: "",
    stayEndDate: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "error" | null>(
    null,
  );
  const [submitMessage, setSubmitMessage] = useState<string>("");

  // useEffect for searchParams is removed as apartmentSlug comes from props.
  // If you need to react to apartmentSlug changes, you can add a new useEffect:
  useEffect(() => {
    // Reset form or perform actions if apartmentSlug changes, if necessary
    console.log("Check-in for apartment:", apartmentSlug);
    // Clear any previous submission messages if the slug changes
    setSubmitStatus(null);
    setSubmitMessage("");

    // Reset części formularza przy zmianie slugu, zwłaszcza jeśli dane zależą od poprzedniego kontekstu
    setFormData((prev) => ({
      ...prev, // Zachowaj niektóre wartości, np. typ dokumentu jeśli ma być domyślny
      bookingHolderFirstName: "",
      bookingHolderLastName: "",
      isDifferentGuest: false,
      guestFirstName: "",
      guestLastName: "",
      dateOfBirth: "",
      nationality: "",
      // documentType: 'ID Card', // Można zostawić jeśli to globalna domyślna
      documentNumber: "",
      addressStreet: "",
      addressCity: "",
      addressZipCode: "",
      addressCountry: "",
      stayStartDate: prev.stayStartDate, // Można rozważyć czy te też resetować
      stayEndDate: prev.stayEndDate,
    }));

    // Dodatkowo, pobieramy pełną nazwę apartamentu
    if (apartmentSlug) {
      const fetchApartmentName = async () => {
        setIsFetchingName(true); // Ustawiamy ładowanie na true
        try {
          console.log(`[CheckInCard] Fetching name for slug: ${apartmentSlug}`);
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
                `[CheckInCard] Fetched name: ${data.name} for slug: ${apartmentSlug}`,
              );
              setHeaderDisplayApartmentName(data.name);
            } else {
              console.warn(
                `[CheckInCard] API succeeded but no name returned for ${apartmentSlug}:`,
                data.error,
              );
              setHeaderDisplayApartmentName(apartmentSlug); // Fallback na slug
            }
          } else {
            console.warn(
              `[CheckInCard] API error fetching name for ${apartmentSlug}:`,
              response.status,
            );
            setHeaderDisplayApartmentName(apartmentSlug); // Fallback na slug
          }
        } catch (err) {
          console.error("[CheckInCard] Error in fetchApartmentName:", err);
          setHeaderDisplayApartmentName(apartmentSlug); // Fallback na slug
        } finally {
          setIsFetchingName(false); // Kończymy ładowanie
        }
      };
      void fetchApartmentName();
    } else {
      setHeaderDisplayApartmentName("Nieznany apartament"); // Jeśli slug jest pusty
      setIsFetchingName(false); // Upewniamy się, że ładowanie jest false, jeśli nie ma slugu
    }
  }, [apartmentSlug]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prevData) => ({
        ...prevData,
        [name]: checked,
        guestFirstName: checked ? prevData.guestFirstName : "",
        guestLastName: checked ? prevData.guestLastName : "",
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitStatus(null);
    setSubmitMessage("");

    console.log("🔥 Form submitted for apartment:", apartmentSlug);

    const checkInDate = new Date();
    // Set hours, minutes, seconds, and milliseconds to 0 for consistent date comparison
    checkInDate.setHours(0, 0, 0, 0);

    const finalFirstName = formData.isDifferentGuest
      ? formData.guestFirstName
      : formData.bookingHolderFirstName;
    const finalLastName = formData.isDifferentGuest
      ? formData.guestLastName
      : formData.bookingHolderLastName;

    if (!finalFirstName || !finalLastName) {
      setSubmitStatus("error");
      setSubmitMessage("Imię i nazwisko osoby meldowanej są wymagane.");
      setIsLoading(false);
      return;
    }

    const dataToSend = {
      bookingHolderFirstName: formData.bookingHolderFirstName,
      bookingHolderLastName: formData.bookingHolderLastName,
      isDifferentGuest: formData.isDifferentGuest,
      guestFirstName: formData.isDifferentGuest
        ? formData.guestFirstName
        : undefined,
      guestLastName: formData.isDifferentGuest
        ? formData.guestLastName
        : undefined,
      firstName: finalFirstName,
      lastName: finalLastName,
      dateOfBirth: new Date(formData.dateOfBirth).toISOString(),
      nationality: formData.nationality,
      documentType: formData.documentType,
      documentNumber: formData.documentNumber,
      addressStreet: formData.addressStreet,
      addressCity: formData.addressCity,
      addressZipCode: formData.addressZipCode,
      addressCountry: formData.addressCountry,
      submittedApartmentIdentifier: apartmentSlug,
      checkInDate: checkInDate.toISOString().split("T")[0],
      stayStartDate: formData.stayStartDate,
      stayEndDate: formData.stayEndDate,
    };

    console.log("📤 Sending data to API:", dataToSend);

    try {
      const response = await fetch("/api/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      console.log("📥 API Response status:", response.status);
      const result = (await response.json()) as ApiResponse;
      console.log("📥 API Response data:", result);

      if (response.ok && result.success && result.data?.redirectTo) {
        setSubmitStatus("success");
        setSubmitMessage(
          "Karta meldunkowa została pomyślnie przesłana! Przekierowywanie do panelu gościa...",
        );

        // 🔥 NOWE: Przekierowanie do dashboardu gościa po 2 sekundach
        setTimeout(() => {
          window.location.href = result.data!.redirectTo;
        }, 2000);
      } else {
        setSubmitStatus("error");
        setSubmitMessage(
          result.error ??
            "Wystąpił błąd podczas przesyłania karty meldunkowej.",
        );
      }
    } catch (error) {
      console.error("Błąd przesyłania formularza:", error);
      setSubmitStatus("error");
      setSubmitMessage("Wystąpił błąd sieci lub serwera. Spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  // The fields for reservationCity and reservedApartment were removed from the form
  // as they should be derived from the Reservation itself, using reservationId.
  // If you still need to display them, you'd fetch Reservation details using reservationId.

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

      {/* Removed the warning about missing reservationId from URL */}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dane Osoby Rezerwującej */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane osoby która dokonała rezerwującej
          </legend>
          <p className="mb-2 text-sm text-gray-600">
            Podaj imię oraz nazwisko osoby, która dokonała rezerwacji.
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="bookingHolderFirstName"
                className="block text-sm font-medium text-gray-700"
              >
                Imię
              </label>
              <input
                type="text"
                name="bookingHolderFirstName"
                id="bookingHolderFirstName"
                value={formData.bookingHolderFirstName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="bookingHolderLastName"
                className="block text-sm font-medium text-gray-700"
              >
                Nazwisko
              </label>
              <input
                type="text"
                name="bookingHolderLastName"
                id="bookingHolderLastName"
                value={formData.bookingHolderLastName}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Checkbox for different guest */}
        <div className="mt-4 flex items-center">
          <input
            id="isDifferentGuest"
            name="isDifferentGuest"
            type="checkbox"
            checked={formData.isDifferentGuest}
            onChange={handleChange}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label
            htmlFor="isDifferentGuest"
            className="ml-2 block text-sm text-gray-900"
          >
            Czy osoba meldująca się w apartamencie to inna osoba niż ta która
            złożyła rezerwacje?
          </label>
        </div>

        {/* Dane Osoby Meldowanej (szczegóły) */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane osoby meldowanej
          </legend>

          {/* PRZYWRÓCONY WARUNEK: Pola Imię i Nazwisko dla osoby meldowanej, jeśli JEST INNA niż rezerwująca */}
          {formData.isDifferentGuest && (
            <div className="mb-4">
              <p className="mb-3 text-sm text-gray-600">
                Podaj imię i nazwisko osoby, która będzie faktycznie meldowana w
                apartamencie.
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="guestFirstName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Imię osoby meldowanej
                  </label>
                  <input
                    type="text"
                    name="guestFirstName"
                    id="guestFirstName"
                    value={formData.guestFirstName}
                    onChange={handleChange}
                    required={formData.isDifferentGuest}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="guestLastName"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Nazwisko osoby meldowanej
                  </label>
                  <input
                    type="text"
                    name="guestLastName"
                    id="guestLastName"
                    value={formData.guestLastName}
                    onChange={handleChange}
                    required={formData.isDifferentGuest}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tekst wyjaśniający, czyje szczegółowe dane są zbierane poniżej - PRZYWRÓCONY WARUNEK */}
          <p className="mb-3 text-sm text-gray-600">
            {formData.isDifferentGuest
              ? "Poniższe dane (data urodzenia, dokument, adres) dotyczą powyżej wprowadzonej osoby meldowanej."
              : `Poniższe dane (data urodzenia, dokument, adres) dotyczą osoby rezerwującej (${formData.bookingHolderFirstName || "imię"} ${formData.bookingHolderLastName || "nazwisko"}), która będzie również osobą meldowaną.`}
          </p>

          {/* Pola Data urodzenia, Narodowość, Dokument, Adres - zawsze widoczne */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="dateOfBirth"
                className="block text-sm font-medium text-gray-700"
              >
                Data urodzenia
              </label>
              <input
                type="date"
                name="dateOfBirth"
                id="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="nationality"
                className="block text-sm font-medium text-gray-700"
              >
                Narodowość
              </label>
              <input
                type="text"
                name="nationality"
                id="nationality"
                value={formData.nationality}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="documentType"
                className="block text-sm font-medium text-gray-700"
              >
                Rodzaj dokumentu
              </label>
              <select
                name="documentType"
                id="documentType"
                value={formData.documentType}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              >
                <option value="ID Card">Dowód osobisty</option>
                <option value="Passport">Paszport</option>
                <option value="Driving License">Prawo jazdy</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="documentNumber"
                className="block text-sm font-medium text-gray-700"
              >
                Numer dokumentu
              </label>
              <input
                type="text"
                name="documentNumber"
                id="documentNumber"
                value={formData.documentNumber}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Dane Rezerwacji */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane Rezerwacji
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="stayStartDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data zameldowania
              </label>
              <input
                type="date"
                name="stayStartDate"
                id="stayStartDate"
                value={formData.stayStartDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="stayEndDate"
                className="block text-sm font-medium text-gray-700"
              >
                Data wymeldowania
              </label>
              <input
                type="date"
                name="stayEndDate"
                id="stayEndDate"
                value={formData.stayEndDate}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Dane Adresowe */}
        <fieldset className="rounded-md border p-4">
          <legend className="px-2 text-lg font-semibold text-gray-700">
            Dane Adresowe
          </legend>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label
                htmlFor="addressStreet"
                className="block text-sm font-medium text-gray-700"
              >
                Ulica i numer domu/mieszkania
              </label>
              <input
                type="text"
                name="addressStreet"
                id="addressStreet"
                value={formData.addressStreet}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="addressCity"
                className="block text-sm font-medium text-gray-700"
              >
                Miejscowość
              </label>
              <input
                type="text"
                name="addressCity"
                id="addressCity"
                value={formData.addressCity}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="addressZipCode"
                className="block text-sm font-medium text-gray-700"
              >
                Kod pocztowy
              </label>
              <input
                type="text"
                name="addressZipCode"
                id="addressZipCode"
                value={formData.addressZipCode}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="addressCountry"
                className="block text-sm font-medium text-gray-700"
              >
                Kraj
              </label>
              <input
                type="text"
                name="addressCountry"
                id="addressCountry"
                value={formData.addressCountry}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </fieldset>

        {/* Removed Reservation Details section from form - no longer needed here */}

        {submitStatus && (
          <div
            className={`rounded p-4 text-sm ${
              submitStatus === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {submitMessage}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? "Przetwarzanie..." : "Wyślij Kartę Meldunkową"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckInCard;
