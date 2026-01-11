"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { api } from "@/trpc/react";

const SystemSettingsPage = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { data: settings, isLoading: settingsLoading } =
    api.adminDashboard.getSystemSettings.useQuery(undefined, {
      enabled: session?.user?.type === "ADMIN",
    });

  const updateSettingsMutation =
    api.adminDashboard.updateSystemSettings.useMutation({
      onSuccess: () => {
        alert("Ustawienia zostały zaktualizowane pomyślnie!");
      },
      onError: (error) => {
        alert(`Błąd podczas aktualizacji ustawień: ${error.message}`);
      },
    });

  const sendTestEmailMutation = api.adminDashboard.sendTestEmail.useMutation({
    onSuccess: () => {
      alert("Testowy email został wysłany pomyślnie!");
    },
    onError: (error) => {
      alert(`Błąd podczas wysyłania testowego emaila: ${error.message}`);
    },
  });

  const [formData, setFormData] = useState({
    email: {
      smtpHost: "",
      smtpPort: 587,
      enabled: true,
    },
    notifications: {
      emailNotifications: true,
      systemAlerts: true,
      reportReminders: true,
    },
    security: {
      sessionTimeout: 86400,
      maxLoginAttempts: 5,
      requireTwoFactor: false,
    },
  });

  const [testEmail, setTestEmail] = useState({
    email: "",
    subject: "Test email z systemu",
    message: "To jest testowy email z systemu zarządzania apartamentami.",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (session?.user?.type !== "ADMIN") {
      router.push("/login");
      return;
    }

    setIsLoading(false);
  }, [session, status, router]);

  useEffect(() => {
    if (settings) {
      setFormData({
        email: settings.email,
        notifications: settings.notifications,
        security: settings.security,
      });
    }
  }, [settings]);

  const handleInputChange = (
    section: keyof typeof formData,
    field: string,
    value: string | number | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettingsMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail.email) {
      alert("Proszę podać adres email");
      return;
    }
    await sendTestEmailMutation.mutateAsync(testEmail);
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
                Ustawienia Systemu
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Konfiguracja systemu i jego funkcjonalności
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
            {/* Email Settings */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Ustawienia Email
                </h3>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SMTP Host
                    </label>
                    <input
                      type="text"
                      value={formData.email.smtpHost}
                      onChange={(e) =>
                        handleInputChange("email", "smtpHost", e.target.value)
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SMTP Port
                    </label>
                    <input
                      type="number"
                      value={formData.email.smtpPort}
                      onChange={(e) =>
                        handleInputChange(
                          "email",
                          "smtpPort",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.email.enabled}
                    onChange={(e) =>
                      handleInputChange("email", "enabled", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Włącz wysyłanie emaili
                  </label>
                </div>
              </div>
            </div>

            {/* Notifications Settings */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Ustawienia Powiadomień
                </h3>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.emailNotifications}
                    onChange={(e) =>
                      handleInputChange(
                        "notifications",
                        "emailNotifications",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Powiadomienia email
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.systemAlerts}
                    onChange={(e) =>
                      handleInputChange(
                        "notifications",
                        "systemAlerts",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Alerty systemowe
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.notifications.reportReminders}
                    onChange={(e) =>
                      handleInputChange(
                        "notifications",
                        "reportReminders",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Przypomnienia o raportach
                  </label>
                </div>
              </div>
            </div>

            {/* Security Settings */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Ustawienia Bezpieczeństwa
                </h3>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Timeout sesji (sekundy)
                    </label>
                    <input
                      type="number"
                      value={formData.security.sessionTimeout}
                      onChange={(e) =>
                        handleInputChange(
                          "security",
                          "sessionTimeout",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Maksymalna liczba prób logowania
                    </label>
                    <input
                      type="number"
                      value={formData.security.maxLoginAttempts}
                      onChange={(e) =>
                        handleInputChange(
                          "security",
                          "maxLoginAttempts",
                          parseInt(e.target.value),
                        )
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.security.requireTwoFactor}
                    onChange={(e) =>
                      handleInputChange(
                        "security",
                        "requireTwoFactor",
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Wymagaj uwierzytelniania dwuskładnikowego
                  </label>
                </div>
              </div>
            </div>

            {/* Test Email */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-6 py-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Test Email
                </h3>
              </div>
              <div className="space-y-4 px-6 py-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Adres email
                  </label>
                  <input
                    type="email"
                    value={testEmail.email}
                    onChange={(e) =>
                      setTestEmail((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="test@example.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Temat
                  </label>
                  <input
                    type="text"
                    value={testEmail.subject}
                    onChange={(e) =>
                      setTestEmail((prev) => ({
                        ...prev,
                        subject: e.target.value,
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Wiadomość
                  </label>
                  <textarea
                    value={testEmail.message}
                    onChange={(e) =>
                      setTestEmail((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleSendTestEmail}
                  disabled={sendTestEmailMutation.isPending}
                  className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-green-700"
                >
                  {sendTestEmailMutation.isPending
                    ? "Wysyłanie..."
                    : "Wyślij testowy email"}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-6 py-3 text-base font-medium text-white disabled:opacity-50 hover:bg-blue-700"
              >
                {isSaving ? "Zapisywanie..." : "Zapisz ustawienia"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemSettingsPage;
