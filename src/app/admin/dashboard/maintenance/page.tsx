"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

const MaintenancePage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  const { data: settings, isLoading: settingsLoading } =
    api.adminDashboard.getSystemSettings.useQuery(undefined, {
      enabled: !!session && session.user.type === "ADMIN",
    });

  const updateSettingsMutation =
    api.adminDashboard.updateSystemSettings.useMutation({
      onSuccess: () => {
        alert("Ustawienia trybu maintenance zostały zaktualizowane pomyślnie!");
      },
      onError: (error) => {
        alert(`Błąd podczas aktualizacji ustawień: ${error.message}`);
      },
    });

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.type !== "ADMIN") {
      router.push("/login");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  useEffect(() => {
    if (settings) {
      setMaintenanceEnabled(settings.maintenance.enabled);
      setMaintenanceMessage(settings.maintenance.message);
    }
  }, [settings]);

  const handleToggleMaintenance = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        maintenance: {
          enabled: !maintenanceEnabled,
          message: maintenanceMessage,
        },
      });
      setMaintenanceEnabled(!maintenanceEnabled);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateMessage = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        maintenance: {
          enabled: maintenanceEnabled,
          message: maintenanceMessage,
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

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
                Zarządzanie Trybem Maintenance
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Włącz lub wyłącz tryb maintenance dla aplikacji
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

        {settingsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6 px-4 sm:px-0">
            {/* Current Status */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Aktualny Status
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className={`mr-3 h-4 w-4 rounded-full ${
                        maintenanceEnabled ? "bg-red-500" : "bg-green-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">
                      Tryb Maintenance: {maintenanceEnabled ? "WŁĄCZONY" : "WYŁĄCZONY"}
                    </span>
                  </div>
                  <button
                    onClick={handleToggleMaintenance}
                    disabled={isSaving}
                    className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                      maintenanceEnabled
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-red-600 hover:bg-red-700"
                    }`}
                  >
                    {isSaving ? (
                      <svg
                        className="mr-2 h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    ) : (
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
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    )}
                    {maintenanceEnabled ? "Wyłącz" : "Włącz"} Tryb Maintenance
                  </button>
                </div>
              </div>
            </div>

            {/* Maintenance Message */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Wiadomość Maintenance
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Wiadomość wyświetlana użytkownikom
                    </label>
                    <textarea
                      value={maintenanceMessage}
                      onChange={(e) => setMaintenanceMessage(e.target.value)}
                      rows={4}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin."
                    />
                  </div>
                  <button
                    onClick={handleUpdateMessage}
                    disabled={isSaving}
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
                  >
                    {isSaving ? "Zapisywanie..." : "Zapisz wiadomość"}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Podgląd Wiadomości
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-8 w-8 text-orange-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        Tryb Maintenance
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {maintenanceMessage || "Aktualnie trwa wgrywanie nowej wersji aplikacji. Może to potrwać parę godzin."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Information */}
            <div className="rounded-lg bg-blue-50 shadow">
              <div className="px-6 py-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Informacje o Trybie Maintenance
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc space-y-1 pl-5">
                        <li>Gdy tryb maintenance jest włączony, właściciele nie będą mogli się zalogować</li>
                        <li>Administratorzy nadal będą mieli dostęp do systemu</li>
                        <li>Wiadomość będzie wyświetlana na ekranie logowania właścicieli</li>
                        <li>Pamiętaj o wyłączeniu trybu maintenance po zakończeniu aktualizacji</li>
                      </ul>
                    </div>
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

export default MaintenancePage;
