"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Odczytaj callbackUrl, ale jeśli go nie ma lub jest to strona główna,
  // ustaw domyślny callback na /apartments po zalogowaniu.
  const requestedCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl =
    requestedCallbackUrl && requestedCallbackUrl !== "/"
      ? requestedCallbackUrl
      : "/apartments";

  useEffect(() => {
    // Jeśli już zalogowany, przekieruj od razu (respektując callbackUrl lub domyślny)
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, router, callbackUrl]);

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
        onClick={() => signIn("discord", { callbackUrl: callbackUrl })} // Przekaż finalny callbackUrl
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
