"use client";

import { api } from "@/trpc/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaMapMarkerAlt, FaStar } from "react-icons/fa";
import FallingStars from "@/app/_components/shared/FallingStars";

type OwnerApartment = {
  id: number;
  name: string;
  address: string;
  images: { url: string; alt: string | null }[] | undefined;
  averageRating: number | null;
  roomsCount?: number;
};

function ApartmentCard({
  apartment,
  index,
}: {
  apartment: OwnerApartment;
  index: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isSingle = (apartment.roomsCount ?? 0) <= 1;
  const roomsQuery = api.rooms.listByApartmentId.useQuery(
    { apartmentId: apartment.id },
    // Dla pojedynczego pokoju pobieramy od razu, aby móc natychmiast przejść do szczegółów
    { enabled: expanded || isSingle },
  );

  const handleClick = () => {
    if (isSingle) {
      // Bez chipów – od razu przenosimy do jedynego pokoju
      if (roomsQuery.data && roomsQuery.data.length === 1) {
        router.push(`/apartamentsOwner/rooms/${roomsQuery.data[0]!.id}`);
      } else {
        void roomsQuery.refetch().then((res) => {
          const list = res.data ?? [];
          if (list.length === 1) {
            router.push(`/apartamentsOwner/rooms/${list[0]!.id}`);
          }
        });
      }
      return;
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="relative">
      <div
        className="group transform-gpu cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={handleClick}
      >
        <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={apartment.images?.[0]?.url ?? "/placeholder.jpg"}
          alt={apartment.images?.[0]?.alt ?? apartment.name}
          fill
          quality={100}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          priority={index === 0}
        />
        {typeof apartment.roomsCount === "number" && apartment.roomsCount > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-yellow-400 px-2 py-1 text-xs font-semibold text-gray-900 shadow-md">
            {apartment.roomsCount === 1
              ? "1 pokój"
              : apartment.roomsCount >= 2 && apartment.roomsCount <= 4
                ? `${apartment.roomsCount} pokoje`
                : `${apartment.roomsCount} pokoi`}
          </span>
        )}
        {hovered && apartment.averageRating && (
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
              <span className="truncate">
                {apartment.address.length > 26
                  ? `${apartment.address.substring(0, 26)}...`
                  : apartment.address}
              </span>
            </div>
            <div className="flex items-center gap-3">
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
      </div>
      {/* Chipsy w pozycji absolutnej - nie zmieniają szerokości karty */}
      {!isSingle && expanded && (
        <div
          className="absolute right-2 top-2 z-20 max-w-[calc(100vw-24px)] md:right-0 md:translate-x-full md:max-w-[16rem]"
          style={{ transform: "translateX(0)" }}
        >
          <div className="flex flex-col items-start gap-2">
            {roomsQuery.isLoading && (
              <div className="rounded-md bg-white/90 px-2 py-1 text-xs text-gray-500 shadow">
                Ładowanie pokoi...
              </div>
            )}
            {roomsQuery.data &&
              roomsQuery.data.length > 0 &&
              roomsQuery.data.map((room) => (
                <button
                  key={room.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/apartamentsOwner/rooms/${room.id}`);
                  }}
                  className="whitespace-nowrap rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-black shadow-sm hover:bg-gray-50"
                  title={`Pokój ${room.code}`}
                >
                  {`Pokój ${room.code}`}
                </button>
              ))}
            {roomsQuery.data && roomsQuery.data.length === 0 && (
              <div className="rounded-md bg-white/90 px-2 py-1 text-xs text-gray-500 shadow">
                Brak zdefiniowanych pokoi.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
    { ownerEmail: ownerEmail ?? "" },
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
          {data.map((apartment: OwnerApartment, index) => (
            <ApartmentCard key={apartment.id} apartment={apartment} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
