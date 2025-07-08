"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/trpc/react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const {
    data: apartmentsData,
    isLoading,
    error,
  } = api.apartments.getAll.useQuery();

  const toggleDropdown = () => setIsDropdownOpen(!isDropdownOpen);

  const apartments = apartmentsData?.apartments ?? [];

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        {/* LOGO NA LEWEJ STRONIE */}
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={360}
            height={96}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* NAWIGACJA NA PRAWEJ STRONIE */}
        <div className="flex items-center space-x-6">
          <Link href="/apartments" className="hover:text-gray-300">
            Lista apartamentów
          </Link>
          <Link href="/check-in-card" className="hover:text-gray-300">
            Karta meldunkowa
          </Link>

          {/* Dropdown for Apartments */}
          {!isLoading && !error && apartments.length > 0 && (
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="hover:text-gray-300 focus:outline-none"
              >
                Apartamenty ({apartments.length})
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 z-10 mt-2 w-64 rounded-md bg-white text-black shadow-lg">
                  <ul className="py-1">
                    {apartments.map((apartment) => (
                      <li key={apartment.slug}>
                        <Link
                          href={`/check-in-card/${apartment.slug}`}
                          className="block px-4 py-2 text-sm hover:bg-gray-100"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {apartment.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {isLoading && (
            <div className="text-sm">Ładowanie apartamentów...</div>
          )}
          {error && (
            <div className="text-sm text-red-400">
              Błąd ładowania apartamentów
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}

export function HeaderAdmin() {
  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        {/* LOGO NA LEWEJ STRONIE */}
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={360}
            height={96}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* NAWIGACJA NA PRAWEJ STRONIE */}
        <div className="flex items-center space-x-6">
          <Link href="/admin" className="hover:text-gray-300">
            Panel admina
          </Link>
          <Link href="/admin/reports" className="hover:text-gray-300">
            Raporty
          </Link>
          <Link href="/admin/owners" className="hover:text-gray-300">
            Właściciele
          </Link>
          <Link href="/admin/apartments" className="hover:text-gray-300">
            Apartamenty
          </Link>
          <Link href="/admin/reservations-list" className="hover:text-gray-300">
            Rezerwacje
          </Link>
          <Link href="/" className="hover:text-gray-300">
            Strona główna
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function HeaderOwner() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // This check runs only on the client-side after mounting
    const token = localStorage.getItem("ownerSessionToken");
    setIsLoggedIn(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    setIsLoggedIn(false); // Update UI immediately
    router.push("/apartamentsOwner/login");
  };

  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        {/* LOGO NA LEWEJ STRONIE */}
        <div className="flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={360}
            height={96}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>

        {/* NAWIGACJA NA PRAWEJ STRONIE */}
        {isLoggedIn && (
          <div className="flex items-center space-x-6">
            <Link
              href="/apartamentsOwner/dashboard"
              className="hover:text-gray-300"
            >
              Panel właściciela
            </Link>
            <Link
              href="/apartamentsOwner/reports"
              className="hover:text-gray-300"
            >
              Moje raporty
            </Link>
            <button
              onClick={handleLogout}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-700"
            >
              Wyloguj
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
