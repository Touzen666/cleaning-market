"use client";

import { api } from "@/trpc/react";
import { toast } from "react-hot-toast";

export function IdobookingSync({ refetch }: { refetch: () => void }) {
  const syncMutation = api.idobooking.syncReservations.useMutation();

  const handleSync = async () => {
    const toastId = toast.loading("Rozpoczynam synchronizację z IdoBooking...");

    try {
      await syncMutation.mutateAsync();
      toast.success("Synchronizacja zakończona pomyślnie!", { id: toastId });
      refetch(); // Odśwież listę rezerwacji
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Nieznany błąd";
      toast.error(`Błąd synchronizacji: ${errorMessage}`, { id: toastId });
      console.error("Błąd podczas synchronizacji z IdoBooking:", error);
    }
  };

  return (
    <button
      onClick={handleSync}
      disabled={syncMutation.isPending}
      className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {syncMutation.isPending ? (
        <>
          <svg
            className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
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
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Synchronizowanie...
        </>
      ) : (
        "Synchronizuj z IdoBooking"
      )}
    </button>
  );
}
