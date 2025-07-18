"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerReservationsPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    const email = localStorage.getItem("ownerEmail");
    const token = localStorage.getItem("ownerSessionToken");

    if (!token) {
      router.push("/apartamentsOwner/login");
    } else {
      setOwnerEmail(email);
    }
  }, [router]);

  const { data, isLoading, error } = api.reservation.getForOwner.useQuery(
    undefined,
    {
      enabled: !!ownerEmail,
    },
  );

  if (isLoading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Twoje rezerwacje</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Apartament
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Gość
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Od
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Do
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data?.map(
              (reservation: {
                id: number;
                apartmentName: string;
                guest: string;
                start: Date;
                end: Date;
                status: string;
              }) => (
                <tr key={reservation.id}>
                  <td className="whitespace-nowrap px-6 py-4">
                    {reservation.apartmentName}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {reservation.guest}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {new Date(reservation.start).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {new Date(reservation.end).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {reservation.status}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
