import React, { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type Owner = NonNullable<RouterOutputs["apartmentOwners"]["getById"]>;
type Apartment = RouterOutputs["apartments"]["getAll"]["apartments"][0];

interface ManageOwnerApartmentsModalProps {
  owner: Owner;
  allApartments: Apartment[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageOwnerApartmentsModal({
  owner,
  allApartments,
  onClose,
  onSuccess,
}: ManageOwnerApartmentsModalProps) {
  const initiallyOwnedIds = useMemo(
    () =>
      new Set(owner.ownedApartments.map((oa) => oa.apartment.id.toString())),
    [owner.ownedApartments],
  );

  const [selectedApartmentIds, setSelectedApartmentIds] =
    useState<Set<string>>(initiallyOwnedIds);

  const assignApartmentsMutation =
    api.apartmentOwners.assignApartments.useMutation({
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError: (error) => {
        alert(`Błąd: ${error.message}`);
      },
    });

  const handleToggleApartment = (apartmentId: string) => {
    setSelectedApartmentIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(apartmentId)) {
        newSet.delete(apartmentId);
      } else {
        newSet.add(apartmentId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (apartmentsToSelect: Apartment[]) => {
    setSelectedApartmentIds((prev) => {
      const newSet = new Set(prev);
      apartmentsToSelect.forEach((apt) => newSet.add(apt.id));
      return newSet;
    });
  };

  const handleDeselectAll = (apartmentsToDeselect: Apartment[]) => {
    setSelectedApartmentIds((prev) => {
      const newSet = new Set(prev);
      apartmentsToDeselect.forEach((apt) => newSet.delete(apt.id));
      return newSet;
    });
  };

  const handleSubmit = () => {
    assignApartmentsMutation.mutate({
      ownerId: owner.id,
      apartmentIds: Array.from(selectedApartmentIds).map((id) =>
        parseInt(id, 10),
      ),
    });
  };

  const assignedApartments = useMemo(
    () => allApartments.filter((apt) => selectedApartmentIds.has(apt.id)),
    [allApartments, selectedApartmentIds],
  );

  const availableApartments = useMemo(
    () =>
      allApartments.filter(
        (apt) =>
          !selectedApartmentIds.has(apt.id) &&
          (!apt.ownerships ||
            apt.ownerships.length === 0 ||
            (apt.ownerships.length === 1 &&
              apt.ownerships[0]?.ownerId === owner.id)),
      ),
    [allApartments, selectedApartmentIds, owner.id],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-bold">
          Zarządzaj apartamentami dla: {owner.firstName} {owner.lastName}
        </h2>

        <div className="grid flex-grow grid-cols-2 gap-6 overflow-y-auto">
          {/* Available Apartments */}
          <div className="flex flex-col rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">
              Dostępne apartamenty ({availableApartments.length})
            </h3>
            <button
              onClick={() => handleSelectAll(availableApartments)}
              className="mb-2 text-sm text-blue-500"
            >
              Zaznacz wszystkie
            </button>
            <div className="overflow-y-auto">
              {availableApartments.map((apt) => (
                <div key={apt.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`apt-avail-${apt.id}`}
                    checked={selectedApartmentIds.has(apt.id)}
                    onChange={() => handleToggleApartment(apt.id)}
                    className="mr-2"
                  />
                  <label htmlFor={`apt-avail-${apt.id}`}>{apt.name}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Apartments */}
          <div className="flex flex-col rounded-lg border p-4">
            <h3 className="mb-2 font-semibold">
              Przypisane apartamenty ({assignedApartments.length})
            </h3>
            <button
              onClick={() => handleDeselectAll(assignedApartments)}
              className="mb-2 text-sm text-red-500"
            >
              Odznacz wszystkie
            </button>
            <div className="overflow-y-auto">
              {assignedApartments.map((apt) => (
                <div key={apt.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`apt-assign-${apt.id}`}
                    checked={selectedApartmentIds.has(apt.id)}
                    onChange={() => handleToggleApartment(apt.id)}
                    className="mr-2"
                  />
                  <label htmlFor={`apt-assign-${apt.id}`}>{apt.name}</label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-md border px-4 py-2">
            Anuluj
          </button>
          <button
            onClick={handleSubmit}
            disabled={assignApartmentsMutation.isPending}
            className="rounded-md bg-indigo-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {assignApartmentsMutation.isPending
              ? "Zapisywanie..."
              : "Zapisz zmiany"}
          </button>
        </div>
      </div>
    </div>
  );
}
