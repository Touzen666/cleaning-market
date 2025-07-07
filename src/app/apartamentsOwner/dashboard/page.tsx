"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(
    null,
  );
  const [showReservationsModal, setShowReservationsModal] = useState(false);

  // TRPC queries
  const {
    data: ownerData,
    isLoading: ownerLoading,
    error: ownerError,
  } = api.ownerAuth.getOwnerData.useQuery(
    { email: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  const { data: ownerStats, isLoading: statsLoading } =
    api.ownerAuth.getOwnerStats.useQuery(
      { email: ownerEmail! },
      { enabled: !!ownerEmail },
    );

  const { data: apartmentReservations, isLoading: reservationsLoading } =
    api.reservation.getByApartmentId.useQuery(
      { apartmentId: selectedApartmentId! },
      { enabled: !!selectedApartmentId },
    );

  useEffect(() => {
    const token = localStorage.getItem("ownerSessionToken");
    const email = localStorage.getItem("ownerEmail");

    if (!token || !email) {
      router.push("/apartamentsOwner/login");
      return;
    }

    setOwnerEmail(email);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    router.push("/apartamentsOwner/login");
  };

  const handleViewReservations = (apartmentId: number) => {
    setSelectedApartmentId(apartmentId);
    setShowReservationsModal(true);
  };

  const handleCloseReservationsModal = () => {
    setShowReservationsModal(false);
    setSelectedApartmentId(null);
  };

  const selectedApartment = ownerData?.apartments.find(
    (apt) => apt.id === selectedApartmentId,
  );

  // Handle error state
  if (ownerError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">{ownerError.message}</p>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          >
            Zaloguj się ponownie
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (ownerLoading || statsLoading || !ownerData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  Panel Właściciela
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {ownerData.firstName} {ownerData.lastName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            Witaj, {ownerData.firstName}!
          </h2>
          <p className="text-gray-600">
            Zarządzaj swoimi apartamentami i monitoruj rezerwacje
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-500 p-2">
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
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Twoje apartamenty
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {ownerStats?.totalApartments ?? ownerData.apartments.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-500 p-2">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Aktywne rezerwacje
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {ownerStats?.activeReservations ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-yellow-500 p-2">
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">
                  Przychód ten miesiąc
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {ownerStats?.monthlyRevenue
                    ? `${ownerStats.monthlyRevenue.toFixed(2)} zł`
                    : "0 zł"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-green-500 p-3">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Raporty Finansowe
                </h3>
                <p className="text-sm text-gray-500">
                  Przeglądaj zatwierdzone raporty miesięczne
                </p>
                <button
                  onClick={() => router.push("/apartamentsOwner/reports")}
                  className="mt-3 inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Zobacz raporty
                  <svg
                    className="ml-2 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="rounded-lg bg-blue-500 p-3">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Kalendarz Rezerwacji
                </h3>
                <p className="text-sm text-gray-500">
                  Sprawdź aktywne i nadchodzące rezerwacje
                </p>
                <div className="mt-3">
                  <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {ownerStats?.activeReservations ?? 0} aktywnych
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apartments List */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-6 py-4">
            <h3 className="text-lg font-medium text-gray-900">
              Twoje apartamenty
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {ownerData.apartments.map((apartment) => (
              <div key={apartment.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {apartment.name}
                    </h4>
                    <p className="text-sm text-gray-500">{apartment.address}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleViewReservations(apartment.id)}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Zobacz rezerwacje
                    </button>
                    <button
                      onClick={() => router.push("/apartamentsOwner/reports")}
                      className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    >
                      <svg
                        className="-ml-0.5 mr-1.5 h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Raporty
                    </button>
                    <button className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                      Zarządzaj
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Modal kalendarza rezerwacji */}
      {showReservationsModal && (
        <ReservationCalendarModal
          apartment={selectedApartment}
          reservations={apartmentReservations}
          isLoading={reservationsLoading}
          onClose={handleCloseReservationsModal}
        />
      )}
    </div>
  );
}

// Types inferred from TRPC
type OwnerData = RouterOutputs["ownerAuth"]["getOwnerData"];
type Apartment = OwnerData["apartments"][0];
type Reservation = RouterOutputs["reservation"]["getByApartmentId"][0];

// Komponent kalendarza rezerwacji
function ReservationCalendarModal({
  apartment,
  reservations = [],
  isLoading,
  onClose,
}: {
  apartment: Apartment | undefined;
  reservations: Reservation[] | undefined;
  isLoading: boolean;
  onClose: () => void;
}) {
  // Generuj 30 dni od dzisiaj
  const generateCalendarDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Funkcja do obliczania szerokości bloku rezerwacji
  const getReservationBlockStyle = (
    reservation: Reservation,
    startIndex: number,
  ) => {
    const start = new Date(reservation.start);
    const end = new Date(reservation.end);
    const daysDiff = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    const width = Math.min(daysDiff, 30 - startIndex); // Nie może przekroczyć kalendarza
    return { width: `${width * 40}px`, left: `${startIndex * 40}px` };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="m-4 max-h-screen w-full max-w-7xl overflow-hidden rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Kalendarz rezerwacji
            </h3>
            {apartment && (
              <div className="mt-1">
                <p className="text-sm font-medium text-gray-600">
                  {apartment.name}
                </p>
                <p className="text-sm text-gray-500">{apartment.address}</p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Calendar Content */}
        <div className="overflow-x-auto p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="min-w-max">
              {/* Calendar Header */}
              <div className="mb-4 flex">
                <div className="w-48 flex-shrink-0"></div>
                {calendarDays.map((day, index) => (
                  <div key={index} className="w-10 text-center">
                    <div className="text-xs font-medium text-gray-500">
                      {day.toLocaleDateString("pl-PL", { weekday: "short" })}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {day.getDate()}
                    </div>
                    <div className="text-xs text-gray-400">
                      {day.toLocaleDateString("pl-PL", { month: "short" })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Apartment Row with Reservations */}
              <div className="relative">
                <div className="flex items-center">
                  {/* Apartment Name */}
                  <div className="w-48 flex-shrink-0 pr-4">
                    <div className="text-sm font-medium text-gray-900">
                      {apartment?.name}
                    </div>
                  </div>

                  {/* Calendar Grid */}
                  <div className="relative flex">
                    {calendarDays.map((day, dayIndex) => (
                      <div
                        key={dayIndex}
                        className="relative h-12 w-10 border-r border-gray-100"
                      >
                        {/* Day cell background */}
                        <div className="h-full w-full bg-gray-50 hover:bg-gray-100"></div>
                      </div>
                    ))}

                    {/* Reservation Blocks */}
                    {reservations?.map((reservation) => {
                      const start = new Date(reservation.start);
                      const startIndex = calendarDays.findIndex((day) => {
                        const dayDate = new Date(day);
                        return dayDate.toDateString() === start.toDateString();
                      });

                      if (startIndex === -1) return null;

                      const today = new Date();
                      const reservationStart = new Date(reservation.start);
                      const reservationEnd = new Date(reservation.end);

                      let status = "confirmed";
                      let bgColor = "bg-blue-500";
                      const textColor = "text-white";

                      // Określ status na podstawie dat
                      if (today >= reservationStart && today < reservationEnd) {
                        status = "checked-in";
                        bgColor = "bg-green-500";
                      } else if (today >= reservationEnd) {
                        status = "checked-out";
                        bgColor = "bg-gray-400";
                      } else if (reservation.status === "PENDING") {
                        bgColor = "bg-yellow-500";
                      } else if (reservation.status === "CANCELLED") {
                        bgColor = "bg-red-500";
                      }

                      const style = getReservationBlockStyle(
                        reservation,
                        startIndex,
                      );

                      return (
                        <div
                          key={reservation.id}
                          className={`absolute top-1 h-10 rounded px-1 py-1 text-xs font-medium ${bgColor} ${textColor} flex cursor-pointer items-center justify-between transition-opacity hover:opacity-80`}
                          style={style}
                          title={`${reservation.guest} (${new Date(reservation.start).toLocaleDateString()} - ${new Date(reservation.end).toLocaleDateString()})`}
                        >
                          <span className="truncate">{reservation.guest}</span>
                          <div className="ml-1 flex-shrink-0">
                            {status === "checked-in" && (
                              <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
                            )}
                            {status === "checked-out" && (
                              <svg
                                className="h-3 w-3 text-white"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded bg-blue-500"></div>
                  <span>Potwierdzona</span>
                </div>
                <div className="flex items-center">
                  <div className="relative mr-2 h-4 w-4 rounded bg-green-500">
                    <div className="absolute inset-1 animate-pulse rounded-full bg-white"></div>
                  </div>
                  <span>Zameldowany</span>
                </div>
                <div className="flex items-center">
                  <div className="mr-2 flex h-4 w-4 items-center justify-center rounded bg-gray-400">
                    <svg
                      className="h-2 w-2 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <span>Wymeldowany</span>
                </div>
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded bg-yellow-500"></div>
                  <span>Oczekująca</span>
                </div>
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 rounded bg-red-500"></div>
                  <span>Anulowana</span>
                </div>
              </div>

              {!reservations ||
                (reservations.length === 0 && (
                  <div className="py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      Brak rezerwacji
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Ten apartament nie ma jeszcze żadnych rezerwacji.
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
