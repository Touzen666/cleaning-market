"use client";
import { useRouter } from "next/navigation";

const AdminPage = () => {
  const router = useRouter();

  return (
    <div className="space-y-4 p-4">
      {/* Reports Management - zmieniona nazwa */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center">
          <div className="rounded-lg bg-green-500 p-3">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Edytor Raportów
            </h3>
            <p className="text-sm text-gray-500">
              Twórz i zarządzaj raportami miesięcznymi
            </p>
            <button
              onClick={() => router.push("/admin/reports")}
              className="mt-3 inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Przejdź do edytora
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Apartments Management - nowa sekcja */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center">
          <div className="rounded-lg bg-purple-500 p-3">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m5 0v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5"
              />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-medium text-gray-900">
              Zarządzanie Apartamentami
            </h3>
            <p className="text-sm text-gray-500">
              Dodawaj nowe apartamenty i edytuj istniejące ustawienia
            </p>
            <button
              onClick={() => router.push("/admin/apartments")}
              className="mt-3 inline-flex items-center rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              Zarządzaj apartamentami
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
