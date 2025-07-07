"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/trpc/react";
import Image from "next/image";
import { signOut } from "next-auth/react";

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
        <div className="flex space-x-4">
          <Link href="/apartments" className="hover:text-gray-300">
            Lista apartamentów
          </Link>
          <Link href="/check-in-card" className="hover:text-gray-300">
            Karta meldunkowa
          </Link>
        </div>
        {/* LOGO NA ŚRODKU */}
        <div className="flex flex-1 justify-center">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={180}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
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
        {isLoading && <div className="text-sm">Ładowanie apartamentów...</div>}
        {error && (
          <div className="text-sm text-red-400">
            Błąd ładowania apartamentów
          </div>
        )}
      </nav>
    </header>
  );
}

export function HeaderAdmin() {
  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex space-x-4">
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
        </div>
        <div className="flex flex-1 justify-center">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={180}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <div className="flex space-x-4">
          <Link href="/" className="hover:text-gray-300">
            Strona główna
          </Link>
        </div>
      </nav>
    </header>
  );
}

export function HeaderOwner() {
  return (
    <header className="bg-black p-4 text-white">
      <nav className="container mx-auto flex items-center justify-between">
        <div className="flex space-x-4">
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
        </div>
        <div className="flex flex-1 justify-center">
          <Image
            src="/logo.png"
            alt="Złote Wynajmy logo"
            width={180}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <div className="flex space-x-4">
          <button
            onClick={() => signOut({ callbackUrl: "/apartamentsOwner/login" })}
            className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-700"
          >
            Wyloguj
          </button>
        </div>
      </nav>
    </header>
  );
}
