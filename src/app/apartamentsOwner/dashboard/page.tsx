"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import Link from "next/link";
import {
  BuildingOffice2Icon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { FaCar, FaCarSide, FaPencilAlt } from "react-icons/fa";

function ExitImpersonationBanner() {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("isImpersonating") === "true") {
      setIsImpersonating(true);
    }
  }, []);

  const handleExitImpersonation = () => {
    localStorage.removeItem("isImpersonating");
    localStorage.removeItem("ownerSessionToken");
    localStorage.removeItem("ownerEmail");
    router.push("/admin/owners");
  };

  if (!isImpersonating) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center bg-yellow-400 p-3 text-center font-semibold text-black shadow-lg">
      <ExclamationTriangleIcon className="mr-3 h-6 w-6" />
      <span>Jesteś w trybie podglądu jako właściciel.</span>
      <button
        onClick={handleExitImpersonation}
        className="ml-4 rounded-md bg-black px-3 py-1 text-sm text-white hover:bg-gray-800"
      >
        Wróć do panelu administratora
      </button>
    </div>
  );
}

export default function OwnerDashboard() {
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

  const {
    data: dashboardData,
    isLoading,
    error,
  } = api.ownerAuth.getDashboardData.useQuery(undefined, {
    enabled: !!ownerEmail,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Ładowanie...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Wystąpił błąd: {error.message}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Brak danych.
      </div>
    );
  }

  const { owner, stats } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-100">
      <ExitImpersonationBanner />
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Panel Właściciela
          </h1>
          <p className="text-gray-600">
            Witaj, {owner.firstName} {owner.lastName}!
          </p>
        </div>
      </header>
      <main className="py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Twoje apartamenty
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {stats.totalApartments}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Aktywne rezerwacje
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {stats.activeReservations}
              </dd>
            </div>
            <div className="overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:p-6">
              <dt className="truncate text-sm font-medium text-gray-500">
                Zysk w tym roku
              </dt>
              <dd className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {(typeof stats.currentYearProfit === "number"
                  ? stats.currentYearProfit
                  : 0
                ).toFixed(2)}{" "}
                PLN
              </dd>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Link
              href="/apartamentsOwner/apartments"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow transition hover:bg-gray-50"
            >
              <div className="relative h-16 w-24">
                <BuildingOffice2Icon className="absolute bottom-0 left-1/2 h-12 w-12 -translate-x-1/2 text-brand-gold" />
                <FaCarSide className="group-hover:animate-drive-in-and-vanish absolute bottom-0 left-4 h-6 w-6 text-brand-gold opacity-0" />
                <FaCar className="absolute bottom-0 left-4 h-6 w-6 text-brand-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:delay-1000" />
              </div>

              <p className="mt-2 font-semibold">Moje Apartamenty</p>
            </Link>
            <Link
              href="/apartamentsOwner/reservations"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow transition hover:bg-gray-50"
            >
              <div className="relative h-12 w-12">
                <DocumentTextIcon className="h-full w-full text-brand-gold" />
                <FaPencilAlt className="group-hover:animate-writing-pencil absolute left-[12px] top-[10px] h-5 w-5 text-brand-gold opacity-0" />
              </div>
              <p className="mt-2 font-semibold">Rezerwacje</p>
            </Link>
            <Link
              href="/apartamentsOwner/reports"
              className="group flex flex-col items-center justify-center rounded-lg bg-white p-6 text-center shadow"
              style={{ perspective: "1000px" }}
            >
              <div className="relative h-12 w-12 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                <CurrencyDollarIcon className="absolute inset-0 h-full w-full text-brand-gold [backface-visibility:hidden]" />
                <CurrencyDollarIcon className="absolute inset-0 h-full w-full text-brand-gold [backface-visibility:hidden] [transform:rotateY(180deg)]" />
              </div>
              <p className="mt-2 font-semibold">Raporty Finansowe</p>
              <p className="text-sm text-gray-500">
                ({dashboardData.stats.totalReports} raporty)
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
