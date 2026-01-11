"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

const ApiPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);

  const { data: apiInfo, isLoading: apiInfoLoading } =
    api.adminDashboard.getApiInfo.useQuery(undefined, {
      enabled: session?.user?.type === "ADMIN",
    });

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user?.type !== "ADMIN") {
      router.push("/login");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  if (isLoading || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="px-4 py-6 sm:px-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Zarządzanie API
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Informacje o endpointach API i kluczach dostępu
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Powrót do dashboard
            </button>
          </div>
        </div>

        {apiInfoLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6 px-4 sm:px-0">
            {/* API Endpoints */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Endpointy API
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {apiInfo?.endpoints.map((endpoint, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {endpoint.name}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            {endpoint.url}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Wersja: {endpoint.version}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              endpoint.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {endpoint.status === "active"
                              ? "Aktywny"
                              : "Nieaktywny"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rate Limits */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Limity Zapytań
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-blue-500">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-blue-900">
                          {apiInfo?.rateLimits.requestsPerMinute ?? 100}
                        </div>
                        <div className="text-sm text-blue-700">
                          Zapytań na minutę
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-center">
                      <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-md bg-green-500">
                        <svg
                          className="h-5 w-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-900">
                          {apiInfo?.rateLimits.requestsPerHour ?? 1000}
                        </div>
                        <div className="text-sm text-green-700">
                          Zapytań na godzinę
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Klucze API
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  {apiInfo?.apiKeys.map((key, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900">
                            {key.name}
                          </h4>
                          <p className="mt-1 text-sm text-gray-500">
                            Ostatnie użycie:{" "}
                            {new Date(key.lastUsed).toLocaleString("pl-PL")}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              key.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {key.status === "active" ? "Aktywny" : "Nieaktywny"}
                          </span>
                          <button
                            onClick={() =>
                              alert("Funkcja w trakcie implementacji")
                            }
                            className="text-sm text-blue-600 hover:text-blue-800"
                          >
                            Regeneruj
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* API Documentation */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Dokumentacja API
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-gray-900">
                      TRPC API
                    </h4>
                    <p className="mb-3 text-sm text-gray-600">
                      Główny endpoint API wykorzystujący TRPC do komunikacji
                      między klientem a serwerem.
                    </p>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">URL:</span>
                        <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                          /api/trpc
                        </code>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Metoda:</span>
                        <span className="ml-2">POST</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Format:</span>
                        <span className="ml-2">JSON</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-gray-900">
                      Auth API
                    </h4>
                    <p className="mb-3 text-sm text-gray-600">
                      Endpoint do uwierzytelniania użytkowników wykorzystujący
                      NextAuth.js.
                    </p>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">URL:</span>
                        <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                          /api/auth
                        </code>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Metoda:</span>
                        <span className="ml-2">GET/POST</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Dostawca:</span>
                        <span className="ml-2">Discord</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="mb-2 text-lg font-medium text-gray-900">
                      Upload API
                    </h4>
                    <p className="mb-3 text-sm text-gray-600">
                      Endpoint do przesyłania plików (obrazy apartamentów,
                      profile użytkowników).
                    </p>
                    <div className="space-y-2">
                      <div className="text-sm">
                        <span className="font-medium">URL:</span>
                        <code className="ml-2 rounded bg-gray-100 px-2 py-1">
                          /api/upload
                        </code>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Metoda:</span>
                        <span className="ml-2">POST</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Format:</span>
                        <span className="ml-2">multipart/form-data</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* API Health */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Stan API
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        TRPC API
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Działające</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Auth API
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Działające</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Upload API
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Działające</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="mr-3 h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-gray-900">
                        Rate Limiting
                      </span>
                    </div>
                    <span className="text-sm text-green-600">Aktywne</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiPage;
