"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Odczytaj callbackUrl z URL parametrów
  const requestedCallbackUrl = searchParams.get("callbackUrl");

  useEffect(() => {
    // Jeśli już zalogowany, przekieruj zgodnie z typem użytkownika
    if (status === "authenticated" && session?.user) {
      let redirectUrl: string;

      // Jeśli jest callbackUrl w parametrach, użyj go
      if (requestedCallbackUrl && requestedCallbackUrl !== "/") {
        redirectUrl = requestedCallbackUrl;
      }
      // Jeśli użytkownik to ADMIN, przekieruj do panelu administracyjnego
      else if (session.user.type === "ADMIN") {
        redirectUrl = "/admin/owners";
      }
      // Dla innych typów użytkowników przekieruj do apartamentów
      else {
        redirectUrl = "/apartments";
      }

      console.log(
        `🔄 Redirecting ${session.user.type} user to: ${redirectUrl}`,
      );
      router.push(redirectUrl);
    }
  }, [status, session, router, requestedCallbackUrl]);

  if (status === "loading" || status === "authenticated") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <p>Ładowanie...</p>
      </div>
    );
  }

  // Dla przycisku logowania również uwzględnij typ użytkownika
  const getCallbackUrl = () => {
    if (requestedCallbackUrl && requestedCallbackUrl !== "/") {
      return requestedCallbackUrl;
    }
    // Nie możemy tutaj sprawdzić typu użytkownika przed logowaniem,
    // więc użyjemy domyślnej strony, a logika przekierowania zadziała w useEffect
    return "/apartments";
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
        padding: "20px",
      }}
    >
      <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Zaloguj się</h1>
      <p style={{ marginBottom: "2rem", textAlign: "center" }}>
        Aby uzyskać dostęp do aplikacji, zaloguj się używając swojego konta
        Discord.
      </p>
      <button
        onClick={() => signIn("discord", { callbackUrl: getCallbackUrl() })}
        style={{
          padding: "12px 24px",
          fontSize: "1rem",
          cursor: "pointer",
          backgroundColor: "#5865F2",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontWeight: "bold",
        }}
      >
        Zaloguj się przez Discord
      </button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <p>Ładowanie...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
