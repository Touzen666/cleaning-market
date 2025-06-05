"use client"; // Musi być komponentem klienckim, aby użyć hooków

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.type === "ADMIN") {
      router.push("/admin");
    }
  }, [session, router]);

  if (session?.user?.type === "UNKNOWN") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center p-4">
        <div
          className="w-full max-w-2xl rounded-md border-l-4 border-red-500 bg-red-100 p-6 text-red-700 shadow-md"
          role="alert"
        >
          <h2 className="mb-2 text-xl font-bold">Błąd Dostępu</h2>
          <p className="text-base">
            Wygląda na to, że link, którego używasz, jest niekompletny lub
            uszkodzony. Aby uzyskać dostęp do karty meldunkowej, prosimy
            skorzystać z pełnego linku przesłanego w szczegółach rezerwacji lub
            drogą mailową.
          </p>
          <p className="mt-4 text-sm">
            Jeśli problem będzie się powtarzał, skontaktuj się z obsługą.
            <br />
            <a href="mailto:biuro@zlote-wynajmy.columns">
              <strong>biuro@zlote-wynajmy.columns</strong>
            </a>
            <br />
            <a href="tel:+48690884961">
              <strong>+48 690 884 961</strong>
            </a>
            <br />
            <a href="tel:+48531392423">
              <strong>+48 531 392 423</strong>
            </a>
          </p>
        </div>
      </div>
    );
  }
}
