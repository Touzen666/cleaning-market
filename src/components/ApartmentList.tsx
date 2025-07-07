"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { RouterOutputs } from "@/trpc/react";

type Apartment = RouterOutputs["apartments"]["getAll"]["apartments"][0];

interface ApartmentListProps {
  apartments: Apartment[];
  mode: "admin" | "owner" | "public";
  onEdit?: (apartmentId: string) => void;
  onDelete?: (apartmentId: string) => void;
  onViewReservations?: (apartmentId: string) => void;
  onViewReports?: (apartmentId: string) => void;
  onManage?: (apartmentId: string) => void;
  showActions?: boolean;
  className?: string;
  deletingApartmentId?: string | null;
}

export default function ApartmentList({
  apartments,
  mode,
  onEdit,
  onDelete,
  onViewReservations,
  onViewReports,
  onManage,
  showActions = true,
  className = "",
  deletingApartmentId = null,
}: ApartmentListProps) {
  const router = useRouter();

  const getPrimaryImage = (apartment: Apartment) => {
    if (!apartment.images || apartment.images.length === 0) {
      return null;
    }

    // Znajdź główne zdjęcie lub pierwsze w kolejności
    const primaryImage =
      apartment.images.find((img) => img.isPrimary) ??
      apartment.images.sort((a, b) => a.order - b.order)[0];

    return primaryImage;
  };

  const renderApartmentCard = (apartment: Apartment) => {
    const primaryImage = getPrimaryImage(apartment);

    return (
      <div
        key={apartment.id}
        className="overflow-hidden rounded-lg bg-white shadow-md transition-shadow hover:shadow-lg"
      >
        {/* Zdjęcie */}
        <div className="relative h-48 bg-gray-200">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.alt ?? apartment.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <svg
                className="h-16 w-16 text-gray-400"
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
          )}

          {/* Badges dla udogodnień */}
          <div className="absolute left-2 top-2 flex gap-1">
            {apartment.hasBalcony && (
              <span className="rounded-full bg-blue-500 px-2 py-1 text-xs text-white">
                Balkon
              </span>
            )}
            {apartment.hasParking && (
              <span className="rounded-full bg-green-500 px-2 py-1 text-xs text-white">
                Parking
              </span>
            )}
          </div>

          {/* Maksymalna liczba gości */}
          {apartment.maxGuests && (
            <div className="absolute right-2 top-2 rounded-full bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
              Max {apartment.maxGuests} osób
            </div>
          )}
        </div>

        {/* Informacje o apartamencie */}
        <div className="p-4">
          <h3 className="mb-1 text-lg font-semibold text-gray-900">
            {apartment.name}
          </h3>
          <p className="mb-3 text-sm text-gray-600">{apartment.address}</p>

          {/* Ceny */}
          {(apartment.defaultRentAmount ??
            apartment.defaultUtilitiesAmount) && (
            <div className="mb-3 space-y-1">
              {apartment.defaultRentAmount && (
                <div className="text-sm">
                  <span className="text-gray-500">Czynsz:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {apartment.defaultRentAmount.toFixed(2)} PLN
                  </span>
                </div>
              )}
              {apartment.defaultUtilitiesAmount && (
                <div className="text-sm">
                  <span className="text-gray-500">Media:</span>
                  <span className="ml-1 font-medium text-gray-900">
                    {apartment.defaultUtilitiesAmount.toFixed(2)} PLN
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Akcje */}
          {showActions && (
            <div className="flex flex-wrap gap-2">
              {mode === "admin" && (
                <>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(apartment.id)}
                      className="flex-1 rounded-md bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700"
                    >
                      Edytuj
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(apartment.id)}
                      disabled={deletingApartmentId === apartment.id}
                      className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingApartmentId === apartment.id ? (
                        <>
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
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
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Usuwanie...
                        </>
                      ) : (
                        "Usuń"
                      )}
                    </button>
                  )}
                </>
              )}

              {mode === "owner" && (
                <>
                  {onViewReservations && (
                    <button
                      onClick={() => onViewReservations(apartment.id)}
                      className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      Rezerwacje
                    </button>
                  )}
                  {onViewReports && (
                    <button
                      onClick={() => onViewReports(apartment.id)}
                      className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700"
                    >
                      Raporty
                    </button>
                  )}
                  {onManage && (
                    <button
                      onClick={() => onManage(apartment.id)}
                      className="flex-1 rounded-md bg-gray-600 px-3 py-2 text-sm text-white transition-colors hover:bg-gray-700"
                    >
                      Zarządzaj
                    </button>
                  )}
                </>
              )}

              {mode === "public" && (
                <button
                  onClick={() => router.push(`/apartments/${apartment.slug}`)}
                  className="w-full rounded-md bg-indigo-600 px-3 py-2 text-sm text-white transition-colors hover:bg-indigo-700"
                >
                  Zobacz szczegóły
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTableRow = (apartment: Apartment) => {
    const primaryImage = getPrimaryImage(apartment);

    return (
      <tr key={apartment.id} className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <div className="flex items-center">
            {/* Miniaturka zdjęcia */}
            <div className="mr-4 h-12 w-16 flex-shrink-0">
              {primaryImage ? (
                <Image
                  src={primaryImage.url}
                  alt={primaryImage.alt ?? apartment.name}
                  width={64}
                  height={48}
                  className="rounded object-cover"
                />
              ) : (
                <div className="flex h-12 w-16 items-center justify-center rounded bg-gray-200">
                  <svg
                    className="h-6 w-6 text-gray-400"
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
              )}
            </div>

            <div>
              <div className="text-sm font-medium text-gray-900">
                {apartment.name}
              </div>
              <div className="text-sm text-gray-500">{apartment.address}</div>
            </div>
          </div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm text-gray-900">{apartment.slug}</div>
        </td>
        <td className="whitespace-nowrap px-6 py-4">
          <div className="text-sm text-gray-500">{apartment.id}</div>
        </td>
        {showActions && (
          <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
            <div className="flex space-x-2">
              {mode === "admin" && (
                <>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(apartment.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edytuj
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(apartment.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Usuń
                    </button>
                  )}
                </>
              )}

              {mode === "owner" && (
                <>
                  {onViewReservations && (
                    <button
                      onClick={() => onViewReservations(apartment.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Rezerwacje
                    </button>
                  )}
                  {onViewReports && (
                    <button
                      onClick={() => onViewReports(apartment.id)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Raporty
                    </button>
                  )}
                </>
              )}
            </div>
          </td>
        )}
      </tr>
    );
  };

  if (apartments.length === 0) {
    return (
      <div className={`py-8 text-center ${className}`}>
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
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Brak apartamentów
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {mode === "admin" &&
            "Dodaj pierwszy apartament używając formularza powyżej"}
          {mode === "owner" && "Nie masz jeszcze żadnych apartamentów"}
          {mode === "public" && "Nie ma dostępnych apartamentów"}
        </p>
      </div>
    );
  }

  // Renderuj jako karty dla trybu publicznego lub gdy nie ma akcji
  if (mode === "public" || !showActions) {
    return (
      <div
        className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 ${className}`}
      >
        {apartments.map(renderApartmentCard)}
      </div>
    );
  }

  // Renderuj jako tabelę dla trybów admin i owner
  return (
    <div
      className={`overflow-hidden rounded-lg border border-gray-200 ${className}`}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Apartament
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Slug
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              ID
            </th>
            {showActions && (
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Akcje
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {apartments.map(renderTableRow)}
        </tbody>
      </table>
    </div>
  );
}
