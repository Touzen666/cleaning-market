"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { skipToken } from "@tanstack/react-query";
import { ReservationCalendar } from "./ReservationCalendar";

export default function OwnerReservationsPage() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem("ownerSessionToken");
    const email = localStorage.getItem("ownerEmail");
    if (!token) {
      router.push("/apartamentsOwner/login");
    } else {
      setOwnerEmail(email);
    }
  }, [router]);

  const {
    data: apartments,
    isLoading,
    error,
  } = api.reservation.getForOwner.useQuery(
    ownerEmail ? { ownerEmail } : skipToken,
    { enabled: isClient && !!ownerEmail },
  );

  if (!isClient || isLoading) {
    return <div>Ładowanie...</div>;
  }

  if (error) return <div>Błąd: {error.message}</div>;

  // Pogrupuj kalendarze po apartamencie nadrzędnym, aby wizualnie pokazać zbiór pokoi
  const grouped = apartments
    ? apartments.reduce<
        Array<{
          groupId: number;
          groupName: string;
          items: typeof apartments;
        }>
      >((acc, item) => {
        const groupId = item.parentApartmentId ?? item.id;
        const groupName = item.parentApartmentName ?? item.name;
        const existing = acc.find((g) => g.groupId === groupId);
        if (existing) {
          existing.items.push(item);
        } else {
          acc.push({ groupId, groupName, items: [item] });
        }
        return acc;
      }, [])
    : [];

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Kalendarz rezerwacji</h1>
      {grouped.length > 0 ? (
        <div className="space-y-10">
          {grouped.map((group) => (
            <div
              key={group.groupId}
              className="rounded-xl border border-gray-200 bg-white/60 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {group.groupName}
                </h2>
              </div>
              <div className="space-y-8">
                {group.items.map((unit) => (
                  <div key={`${group.groupId}-${unit.id}`}>
                    {/* Jeśli to multiroom, tytuł jednostki to nazwa pokoju */}
                    {unit.parentApartmentId && (
                      <h3 className="mb-2 text-lg font-medium text-gray-800">
                        {unit.name}
                      </h3>
                    )}
                    <ReservationCalendar apartment={unit} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Nie znaleziono apartamentów lub rezerwacji.</p>
      )}
    </div>
  );
}
