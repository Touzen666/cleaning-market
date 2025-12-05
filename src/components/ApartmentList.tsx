"use client";

import React from "react";
import Image from "next/image";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { useRouter } from "next/navigation";

type Apartment = RouterOutputs["apartments"]["getAll"]["apartments"][0];
type ApartmentRoom = { code: string; reservations: number };
type ApartmentWithRooms = Apartment & { rooms?: ApartmentRoom[] };

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
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Mutacje muszą być hookami na najwyższym poziomie komponentu
  const createVariantMutation = api.apartments.createVariant.useMutation();
  const handleCreateVariant = async (
    parentApartmentId: string,
    code: string,
  ) => {
    try {
      const res = await createVariantMutation.mutateAsync({
        parentApartmentId,
        code,
      });
      router.push(`/admin/rooms/${res.roomId}`);
    } catch {
      // noop
    }
  };
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

  const renderApartmentCard = (apartment: Apartment, index?: number) => {
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
              priority={index === 0}
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
              <span className="rounded-full bg-brand-gold px-2 py-1 text-xs text-white">
                Balkon
              </span>
            )}
            {apartment.hasParking && (
              <span className="rounded-full bg-brand-gold px-2 py-1 text-xs text-white">
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

          {/* Liczba rezerwacji */}
          <div className="mb-3 text-sm">
            <span className="text-gray-500">Rezerwacje:</span>
            <span className="ml-1 font-medium text-gray-900">
              {apartment.reservations}
            </span>
          </div>

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
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-yellow-500"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edytuj
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(apartment.id)}
                      disabled={deletingApartmentId === apartment.id}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-yellow-500"
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
                        <>
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                          Usuń
                        </>
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
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-yellow-500"
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
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Rezerwacje
                    </button>
                  )}
                  {onViewReports && (
                    <button
                      onClick={() => onViewReports(apartment.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-yellow-500"
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
                  )}
                  {onManage && (
                    <button
                      onClick={() => onManage(apartment.id)}
                      className="inline-flex flex-1 items-center justify-center rounded-md bg-brand-gold px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 hover:bg-yellow-500"
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
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      Zarządzaj
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTableRow = (apartment: Apartment) => {
    const primaryImage = getPrimaryImage(apartment);
    const aptWithRooms = apartment as ApartmentWithRooms;
    const rooms = aptWithRooms.rooms ?? [];
    const hasRooms = rooms.length > 1;

    return (
      <React.Fragment key={apartment.id}>
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 text-sm text-gray-900">
            <div className="flex items-center space-x-3">
              {hasRooms && (
                <button
                  aria-label="toggle-rooms"
                  onClick={() => toggleExpanded(apartment.id)}
                  className="rounded p-1 hover:bg-gray-100"
                >
                  <svg
                    className={`h-4 w-4 transition-transform ${expanded[apartment.id] ? "rotate-90" : ""}`}
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
              )}
              <div className="flex-shrink-0">
                <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100">
                  {primaryImage ? (
                    <Image
                      src={primaryImage.url}
                      alt={primaryImage.alt ?? apartment.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                      quality={100}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="font-medium">{apartment.name}</div>
              </div>
            </div>
          </td>
          <td className="whitespace-nowrap px-6 py-4">
            <div className="text-sm text-gray-500">{apartment.address}</div>
          </td>
          <td className="whitespace-nowrap px-6 py-4">
            <div className="text-sm text-gray-900">{apartment.slug}</div>
          </td>
          <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-500">
            <button className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-1.5 text-sm font-semibold text-blue-800 hover:bg-blue-200">
              {apartment.reservations} Reservation(s)
            </button>
          </td>
          {showActions && (
            <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium">
              <div className="flex justify-end space-x-2">
                {mode === "admin" && (
                  <>
                    {/* Jeśli apartament NIE jest wielowariantowy (brak wielu pokoi) – pozwól edytować główny wpis */}
                    {!hasRooms && onEdit && (
                      <button
                        onClick={() => onEdit(apartment.id)}
                        className="inline-flex items-center rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 hover:bg-yellow-600"
                      >
                        Edytuj
                      </button>
                    )}
                    {/* Jeśli apartament ma wiele pokoi – edycja będzie na poziomie pokoi, tu zostawiamy tylko Usuń */}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(apartment.id)}
                        disabled={deletingApartmentId === apartment.id}
                        className="inline-flex items-center rounded-md bg-red-500 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-red-600"
                      >
                        {deletingApartmentId === apartment.id
                          ? "Usuwanie..."
                          : "Usuń"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </td>
          )}
        </tr>
        {hasRooms &&
          expanded[apartment.id] &&
          rooms.map((room) => (
            <tr key={`${apartment.id}-${room.code}`} className="bg-gray-50">
              <td className="px-6 py-3 text-sm text-gray-700">
                <div className="pl-10">Pokój {room.code}</div>
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">
                {room.address ?? "—"}
              </td>
              <td className="px-6 py-3 text-sm text-gray-500">
                {room.slug ?? "—"}
              </td>
              <td className="px-4 py-3 text-sm text-gray-700">
                {room.reservations} Reservation(s)
              </td>
              {showActions && (
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end space-x-2">
                    {mode === "admin" && room.id && (
                      <>
                        <button
                          onClick={() =>
                            router.push(
                              `/admin/apartments/${apartment.id}?roomId=${room.id}`,
                            )
                          }
                          className="inline-flex items-center rounded-md bg-yellow-500 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 hover:bg-yellow-600"
                        >
                          Edytuj
                        </button>
                      </>
                    )}
                    {mode === "admin" && !room.id && (
                      <button
                        onClick={() =>
                          handleCreateVariant(apartment.id, room.code)
                        }
                        disabled={createVariantMutation.isPending}
                        className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 hover:bg-indigo-500"
                      >
                        {createVariantMutation.isPending
                          ? "Tworzenie..."
                          : "Utwórz pokój"}
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
      </React.Fragment>
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
        {apartments.map((apartment, index) =>
          renderApartmentCard(apartment, index),
        )}
      </div>
    );
  }

  // Renderuj jako tabelę dla trybów admin i owner
  if (mode === "admin") {
    return (
      <div className={`rounded-lg bg-white p-6 shadow ${className}`}>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="w-1/3 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Nazwa
                </th>
                <th
                  scope="col"
                  className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Adres
                </th>
                <th
                  scope="col"
                  className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Slug
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  Rezerwacje
                </th>
                {showActions && (
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
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
      </div>
    );
  }

  return (
    <div
      className={`overflow-x-auto rounded-lg border border-gray-200 scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 ${className}`}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Nazwa apartamentu i adres
            </th>
            <th
              scope="col"
              className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Slug
            </th>
            <th
              scope="col"
              className="w-1/4 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Właściciel
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              ID
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
            >
              Rezerwacje
            </th>
            {showActions && (
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
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
