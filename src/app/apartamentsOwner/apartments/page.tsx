"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
import FallingStars from "@/app/_components/shared/FallingStars";

export default function OwnerApartmentsPage() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [hoveredApartmentId, setHoveredApartmentId] = useState<number | null>(
    null,
  );

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

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-solid border-blue-500"></div>
      </div>
    );
  }
  if (error)
    return (
      <div className="p-4 text-center text-red-500">Błąd: {error.message}</div>
    );
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        Nie znaleziono apartamentów.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto">
        <h1 className="mb-6 text-3xl font-bold tracking-tight text-gray-900">
          Twoje apartamenty
        </h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data.map(
            (apartment: {
              id: number;
              name: string;
              address: string;
              images: { url: string; alt: string | null }[] | undefined;
              averageRating: number | null;
            }) => (
              <div
                key={apartment.id}
                className="group transform-gpu cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
                onMouseEnter={() => setHoveredApartmentId(apartment.id)}
                onMouseLeave={() => setHoveredApartmentId(null)}
              >
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={apartment.images?.[0]?.url ?? "/placeholder.jpg"}
                    alt={apartment.images?.[0]?.alt ?? apartment.name}
                    fill
                    quality={100}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {hoveredApartmentId === apartment.id &&
                    apartment.averageRating && (
                      <>
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
                          <span className="text-6xl font-bold text-yellow-400">
                            {apartment.averageRating.toFixed(2)}
                          </span>
                        </div>
                        <FallingStars />
                      </>
                    )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                </div>
                <div className="p-4">
                  <h2 className="truncate text-lg font-semibold text-gray-800">
                    {apartment.name}
                  </h2>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaMapMarkerAlt className="mr-2 h-4 w-4 flex-shrink-0 text-gray-400" />
                      <span className="truncate">{apartment.address}</span>
                    </div>
                    {apartment.averageRating && (
                      <div className="flex items-center">
                        <FaStar className="mr-1 h-4 w-4 text-yellow-400" />
                        <span className="font-bold text-gray-700">
                          {apartment.averageRating.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
