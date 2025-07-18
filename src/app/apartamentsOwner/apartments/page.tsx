"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OwnerApartmentsPage() {
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

  const { data, isLoading, error } = api.apartments.getForOwner.useQuery(
    undefined,
    {
      enabled: !!ownerEmail,
    },
  );

  if (isLoading) return <div>Ładowanie...</div>;
  if (error) return <div>Błąd: {error.message}</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Twoje apartamenty</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map(
          (apartment: { id: number; name: string; address: string }) => (
            <div
              key={apartment.id}
              className="rounded-lg border bg-white p-4 shadow"
            >
              <h2 className="text-xl font-semibold">{apartment.name}</h2>
              <p className="text-gray-600">{apartment.address}</p>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
