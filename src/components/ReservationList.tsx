"use client";

import { api } from "@/trpc/react";

export default function ReservationList() {
  const { data, isLoading, error } = api.reservation.getAll.useQuery();

  if (isLoading) return <div>Loading reservations...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Reservations ({data?.count ?? 0})</h2>
      {/* Tutaj możesz dodać listę rezerwacji gdy będzie potrzeba */}
    </div>
  );
}
