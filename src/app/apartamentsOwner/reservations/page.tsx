"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ReservationCalendar } from "./ReservationCalendar";

export default function OwnerReservationsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("ownerSessionToken");
    if (!token) {
      router.push("/apartamentsOwner/login");
    }
  }, [router]);

  const {
    data: apartments,
    isLoading,
    error,
  } = api.reservation.getForOwner.useQuery(undefined, { enabled: isClient });

  if (!isClient || isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (error) return <div>Błąd: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Kalendarz rezerwacji</h1>
      {apartments && apartments.length > 0 ? (
        <div className="space-y-8">
          {apartments.map((apartment) => (
            <div key={apartment.id}>
              <h2 className="mb-2 text-xl font-semibold">{apartment.name}</h2>
              <ReservationCalendar apartment={apartment} />
            </div>
          ))}
        </div>
      ) : (
        <p>Nie znaleziono apartamentów lub rezerwacji.</p>
      )}
    </div>
  );
}
