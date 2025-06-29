"use client";

import { useEffect, useCallback, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/trpc/react";

export default function GuestDashboardPage() {
  const params = useParams<{ apartmentSlug: string }>();
  const apartmentSlug = params.apartmentSlug;

  // Client-only state for guest session token
  const [guestSessionToken, setGuestSessionToken] = useState<
    string | undefined
  >(undefined);
  const [mounted, setMounted] = useState(false);

  // Debug: sprawdź cookie po stronie klienta
  useEffect(() => {
    setMounted(true);

    const allCookies = document.cookie;
    const guestSession = document.cookie
      .split(";")
      .find((cookie) => cookie.trim().startsWith("guest-session="))
      ?.split("=")[1];

    console.log("🔍 Client-side cookie debugging:");
    console.log("📋 All cookies:", allCookies);
    console.log("🍪 Guest session cookie:", guestSession);

    setGuestSessionToken(guestSession);
  }, []);

  // tRPC queries and mutations - only run after mount
  const {
    data: guestData,
    isLoading: loading,
    refetch: checkGuestSession,
    error,
  } = api.guestAuth.verify.useQuery(
    {
      apartmentSlug,
      sessionToken: guestSessionToken,
    },
    {
      enabled: mounted && !!apartmentSlug && !!guestSessionToken,
      retry: false,
    },
  );

  const guestCheckinMutation = api.guestCheckin.checkin.useMutation({
    onSuccess: () => {
      void checkGuestSession();
    },
    onError: (error) => {
      alert(error.message ?? "Błąd podczas meldowania");
    },
  });

  // Handle success/error with useEffect instead
  useEffect(() => {
    if (guestData) {
      console.log("🔍 Guest verification result:", guestData);
    }
    if (error) {
      console.error("❌ Guest verification error:", error);
    }
  }, [guestData, error]);

  const handleCheckIn = useCallback(() => {
    if (!apartmentSlug) return;
    guestCheckinMutation.mutate({ apartmentSlug });
  }, [apartmentSlug, guestCheckinMutation]);

  // Debug info
  console.log("🔍 Dashboard render state:", {
    mounted,
    loading,
    authenticated: guestData?.authenticated,
    apartmentSlug,
    hasError: !!error,
    hasToken: !!guestSessionToken,
  });

  // Show loading until component is mounted (client-side)
  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Inicjalizacja...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    console.log("📱 Showing loading state");
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Sprawdzam autoryzację...</p>
        </div>
      </div>
    );
  }

  if (!guestData?.authenticated) {
    console.log("❌ Not authenticated, rendering null");
    return null; // Will redirect in useEffect
  }

  console.log("✅ Rendering dashboard content");

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  const displayApartmentName =
    guestData.reservation?.apartment?.name ?? apartmentSlug;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-6 text-center">
            <h1 className="text-3xl font-bold text-gray-800">Panel Gościa</h1>
            <p className="mt-2 text-gray-600">
              Apartament:{" "}
              <span className="font-mono text-indigo-600">
                {displayApartmentName}
              </span>
            </p>
            {guestData.checkInCard && (
              <p className="mt-1 text-sm text-gray-500">
                Witaj, {guestData.checkInCard.firstName}{" "}
                {guestData.checkInCard.lastName}
              </p>
            )}
          </div>

          {guestData.shouldShowCheckIn && (
            <div className="mb-6">
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <h3 className="mb-2 text-lg font-semibold text-blue-800">
                  Czas na meldowanie!
                </h3>
                <p className="mb-4 text-sm text-blue-600">
                  Możesz teraz dokonać oficjalnego meldowania w apartamencie
                </p>
                <button
                  onClick={handleCheckIn}
                  disabled={guestCheckinMutation.isPending}
                  className="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {guestCheckinMutation.isPending
                    ? "Meldowanie..."
                    : "Zamelduj się"}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">
                Status Pobytu
              </h3>
              {guestData.checkInCard?.actualCheckInTime ? (
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="ml-2 text-sm font-medium text-green-700">
                    Zameldowany
                  </span>
                </div>
              ) : (
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                  <span className="ml-2 text-sm font-medium text-yellow-700">
                    Utworzona karta <br /> Nie zameldowany
                  </span>
                </div>
              )}
              {guestData.sessionExpiresAt && (
                <p className="mt-2 text-xs text-gray-500">
                  Wymeldowanie do:
                  <br />
                  {formatDate(guestData.sessionExpiresAt)}
                </p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">
                Rezerwacja
              </h3>
              {guestData.reservation ? (
                <>
                  {guestData.canCheckInFrom && (
                    <p className="text-sm text-gray-600">
                      Meldowanie od: {formatDate(guestData.canCheckInFrom)}
                    </p>
                  )}
                  {guestData.sessionExpiresAt && (
                    <p className="text-sm text-gray-600">
                      Wymeldowanie do: {formatDate(guestData.sessionExpiresAt)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Rezerwujący: {guestData.reservation.guest}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Gość: {guestData.checkInCard?.firstName}{" "}
                    {guestData.checkInCard?.lastName}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-600">Brak danych rezerwacji</p>
              )}
            </div>

            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-lg font-semibold text-gray-800">
                Kontakt
              </h3>
              <p className="text-sm text-gray-600">Tel: +48 690 884 961</p>
              <p className="text-sm text-gray-600">Tel: +48 531 392 423</p>
            </div>
          </div>

          <div className="mt-8">
            <div className="rounded-lg bg-indigo-50 p-6">
              <h2 className="mb-4 text-xl font-semibold text-indigo-800">
                Zespół Złote Wynajmy - Apartamenty z Klasą wita w Twoim Panelu
                Gościa!
              </h2>
              <p className="text-indigo-700">
                Twoja karta meldunkowa została pomyślnie zarejestrowana. Ten
                panel będzie dostępny przez cały czas Twojego pobytu.
              </p>
              <br></br>
              <p className="text-indigo-700">
                Dokończyć meldunek można na 30min przed planowanym rozpoczęciem
                rezerwacji. Jeśli przyjeżdżasz wsześniej lub chcesz wymeldować
                się później upewnij się że dokonałeś opłaty za przedłużenie
                doby. Jeśli dokonałeś opłaty a mimo to przycisk &quot;Zamelduj
                się&quot; nie pojawia się u góry Panelu. Skontaktuj się z
                Hostem.
              </p>
              <br></br>
              <p className="text-indigo-700">
                Jeśli wylogujesz się lub zamkniesz przeglądarkę, będziesz mógł
                wrócić tutaj używając linku logowania dla gości. Link wysłaliśmy
                do ciebie na podany wcześniej adres email. Link znajdziesz
                również w wiadomości na Booking, Airbnb lub innym serwisie gdzie
                zarezerwowałeś/aś ten apartament.
              </p>
              <br></br>
              {guestData.canCheckInFrom && (
                <p className="mt-2 text-sm text-indigo-600">
                  Meldowanie możliwe od: {formatDate(guestData.canCheckInFrom)}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                window.location.href = `/guest-login/${apartmentSlug}`;
              }}
              className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Wyloguj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
