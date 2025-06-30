"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function AdminReservationsPage() {
  const router = useRouter();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(
    null,
  );
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    guest: "",
    start: "",
    end: "",
    adults: 1,
    children: 0,
    paymantValue: 0,
    currency: "PLN",
    payment: "Unknown",
    status: "CONFIRMED",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // TRPC queries
  const ownersQuery = api.apartmentOwners.getAll.useQuery();
  const selectedOwnerQuery = api.apartmentOwners.getById.useQuery(
    { ownerId: selectedOwnerId! },
    { enabled: !!selectedOwnerId },
  );
  const reservationsQuery = api.reservation.getByApartmentId.useQuery(
    { apartmentId: selectedApartmentId! },
    { enabled: !!selectedApartmentId },
  );

  // TRPC mutations
  const createReservationMutation = api.reservation.create.useMutation({
    onSuccess: () => {
      setShowCreateForm(false);
      setFormData({
        guest: "",
        start: "",
        end: "",
        adults: 1,
        children: 0,
        paymantValue: 0,
        currency: "PLN",
        payment: "Unknown",
        status: "CONFIRMED",
      });
      setErrors({});
      // Refetch reservations
      void reservationsQuery.refetch();
    },
    onError: (error) => {
      setErrors({ general: error.message });
    },
  });

  const selectedOwner = selectedOwnerQuery.data;
  const apartments =
    selectedOwner?.ownedApartments?.map((o) => o.apartment) ?? [];
  const selectedApartment = apartments.find(
    (apt) => apt.id === selectedApartmentId,
  );

  const handleOwnerSelect = (ownerId: string) => {
    setSelectedOwnerId(ownerId);
    setSelectedApartmentId(null);
    setShowCreateForm(false);
  };

  const handleApartmentSelect = (apartmentId: number) => {
    setSelectedApartmentId(apartmentId);
    setShowCreateForm(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApartmentId) return;

    const newErrors: Record<string, string> = {};

    if (!formData.guest.trim()) {
      newErrors.guest = "Nazwa gościa jest wymagana";
    }
    if (!formData.start) {
      newErrors.start = "Data rozpoczęcia jest wymagana";
    }
    if (!formData.end) {
      newErrors.end = "Data zakończenia jest wymagana";
    }
    if (
      formData.start &&
      formData.end &&
      new Date(formData.start) >= new Date(formData.end)
    ) {
      newErrors.end =
        "Data zakończenia musi być późniejsza niż data rozpoczęcia";
    }
    if (formData.paymantValue < 0) {
      newErrors.paymantValue = "Wartość płatności nie może być ujemna";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await createReservationMutation.mutateAsync({
        ...formData,
        apartmentId: selectedApartmentId,
        start: new Date(formData.start),
        end: new Date(formData.end),
      });
    } catch (error) {
      console.error("Error creating reservation:", error);
    }
  };

  if (ownersQuery.isLoading) {
    return <div className="p-4">Ładowanie właścicieli...</div>;
  }

  if (ownersQuery.error) {
    return (
      <div className="p-4 text-red-600">Błąd: {ownersQuery.error.message}</div>
    );
  }

  const owners = ownersQuery.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Zarządzanie Rezerwacjami
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Wybierz właściciela, jego apartament i dodaj nową rezerwację
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/admin/owners")}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Właściciele
                </button>
                <button
                  onClick={() => router.push("/admin/reports")}
                  className="inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Fakturownia
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Właściciele */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              1. Wybierz Właściciela
            </h2>
            <div className="space-y-2">
              {owners.map((owner) => (
                <button
                  key={owner.id}
                  onClick={() => handleOwnerSelect(owner.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedOwnerId === owner.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">
                    {owner.firstName} {owner.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{owner.email}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Apartamenty */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              2. Wybierz Apartament
            </h2>
            {!selectedOwnerId ? (
              <p className="text-gray-500">Najpierw wybierz właściciela</p>
            ) : selectedOwnerQuery.isLoading ? (
              <p className="text-gray-500">Ładowanie apartamentów...</p>
            ) : apartments.length === 0 ? (
              <p className="text-gray-500">
                Ten właściciel nie ma apartamentów
              </p>
            ) : (
              <div className="space-y-2">
                {apartments.map((apartment) => (
                  <button
                    key={apartment.id}
                    onClick={() => handleApartmentSelect(apartment.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedApartmentId === apartment.id
                        ? "border-indigo-500 bg-indigo-50 text-indigo-900"
                        : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="font-medium">{apartment.name}</div>
                    <div className="text-sm text-gray-600">
                      {apartment.address}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Akcje */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-medium text-gray-900">
              3. Działania
            </h2>
            {!selectedApartmentId ? (
              <p className="text-gray-500">
                Wybierz apartament aby kontynuować
              </p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="font-medium text-blue-900">
                    Wybrany apartament:
                  </h3>
                  <p className="text-sm text-blue-700">
                    {selectedApartment?.name}
                  </p>
                  <p className="text-sm text-blue-600">
                    {selectedApartment?.address}
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                >
                  Dodaj Rezerwację
                </button>

                {reservationsQuery.data &&
                  reservationsQuery.data.length > 0 && (
                    <div className="mt-6">
                      <h3 className="mb-2 font-medium text-gray-900">
                        Istniejące rezerwacje:
                      </h3>
                      <div className="space-y-2">
                        {reservationsQuery.data.map((reservation) => (
                          <div
                            key={reservation.id}
                            className="rounded border p-2"
                          >
                            <div className="text-sm font-medium">
                              {reservation.guest}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(reservation.start).toLocaleDateString(
                                "pl-PL",
                              )}{" "}
                              -{" "}
                              {new Date(reservation.end).toLocaleDateString(
                                "pl-PL",
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {reservation.paymantValue} {reservation.currency}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Modal dodawania rezerwacji */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="max-h-screen w-full max-w-md overflow-y-auto rounded-lg bg-white p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Dodaj Nową Rezerwację
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                {errors.general && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{errors.general}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nazwa gościa
                  </label>
                  <input
                    type="text"
                    name="guest"
                    value={formData.guest}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                      errors.guest ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.guest && (
                    <p className="mt-1 text-sm text-red-600">{errors.guest}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Data rozpoczęcia
                    </label>
                    <input
                      type="date"
                      name="start"
                      value={formData.start}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                        errors.start ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {errors.start && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.start}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Data zakończenia
                    </label>
                    <input
                      type="date"
                      name="end"
                      value={formData.end}
                      onChange={handleInputChange}
                      className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                        errors.end ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {errors.end && (
                      <p className="mt-1 text-sm text-red-600">{errors.end}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Dorośli
                    </label>
                    <input
                      type="number"
                      name="adults"
                      min="1"
                      value={formData.adults}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Dzieci
                    </label>
                    <input
                      type="number"
                      name="children"
                      min="0"
                      value={formData.children}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Wartość płatności
                  </label>
                  <input
                    type="number"
                    name="paymantValue"
                    min="0"
                    step="0.01"
                    value={formData.paymantValue}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 ${
                      errors.paymantValue ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {errors.paymantValue && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.paymantValue}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Waluta
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="PLN">PLN</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                    >
                      <option value="CONFIRMED">Potwierdzona</option>
                      <option value="PENDING">Oczekująca</option>
                      <option value="CANCELLED">Anulowana</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    disabled={createReservationMutation.isPending}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {createReservationMutation.isPending
                      ? "Dodawanie..."
                      : "Dodaj Rezerwację"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
