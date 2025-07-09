"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { PaymentType, VATOption } from "@/lib/types";
import { NoteType } from "@prisma/client";
import ApartmentList from "@/components/ApartmentList";
import ManageOwnerApartmentsModal from "@/app/_components/ManageOwnerApartmentsModal";

export default function OwnerDetailsPage({
  params,
}: {
  params: Promise<{ ownerId: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const actualParams = React.use(params);
  const { ownerId } = actualParams;

  // Stan dla notatek
  const [noteForm, setNoteForm] = useState<{
    type: NoteType;
    title: string;
    content: string;
    isImportant: boolean;
  }>({
    type: NoteType.GENERAL,
    title: "",
    content: "",
    isImportant: false,
  });
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  // tRPC queries
  const ownerQuery = api.apartmentOwners.getById.useQuery({ ownerId });
  const ownerApartmentsQuery = api.apartmentOwners.getOwnerApartments.useQuery({
    ownerId,
  });
  const ownerNotesQuery = api.ownerNotes.getByOwnerId.useQuery({ ownerId });
  const allApartmentsQuery = api.apartments.getAll.useQuery();

  // Sprawdź czy wróciliśmy z tworzenia apartamentu
  useEffect(() => {
    const fromApartmentCreation = searchParams.get("fromApartmentCreation");
    if (fromApartmentCreation === "true") {
      // Odśwież listę apartamentów
      void ownerApartmentsQuery.refetch();
      void ownerQuery.refetch();
      // Usuń parametr z URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("fromApartmentCreation");
      router.replace(newUrl.pathname + newUrl.search);
    }
  }, [searchParams, ownerApartmentsQuery, router, ownerQuery]);

  // Mutacje
  const deleteApartmentMutation = api.apartments.delete.useMutation({
    onSuccess: () => {
      void ownerApartmentsQuery.refetch();
      void ownerQuery.refetch();
    },
  });

  // Mutacje dla notatek
  const createNoteMutation = api.ownerNotes.create.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  const updateNoteMutation = api.ownerNotes.update.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  const deleteNoteMutation = api.ownerNotes.delete.useMutation({
    onSuccess: () => {
      void ownerNotesQuery.refetch();
    },
  });

  if (ownerQuery.isLoading || allApartmentsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2 text-gray-600">Ładowanie właściciela...</p>
        </div>
      </div>
    );
  }

  if (ownerQuery.isError || !ownerQuery.data || allApartmentsQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="mb-2 text-xl font-bold text-red-600">Błąd</h2>
          <p className="mb-4 text-gray-600">
            {ownerQuery.error?.message ??
              allApartmentsQuery.error?.message ??
              "Właściciel nie został znaleziony"}
          </p>
          <button
            onClick={() => router.push("/admin/owners")}
            className="rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-gray-700"
          >
            Powrót do listy
          </button>
        </div>
      </div>
    );
  }

  const owner = ownerQuery.data;
  const ownerApartments = ownerApartmentsQuery.data ?? [];
  const allApartments = allApartmentsQuery.data?.apartments ?? [];

  const handleDeleteApartment = (apartmentId: string) => {
    if (confirm("Czy na pewno chcesz usunąć ten apartament?")) {
      deleteApartmentMutation.mutate({ id: apartmentId });
    }
  };

  // Funkcje obsługi notatek
  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    createNoteMutation.mutate({
      ownerId,
      ...noteForm,
    });
    setNoteForm({
      type: NoteType.GENERAL,
      title: "",
      content: "",
      isImportant: false,
    });
    setShowNoteForm(false);
  };

  const handleUpdateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNoteId) {
      updateNoteMutation.mutate({
        noteId: editingNoteId,
        ...noteForm,
      });
      setEditingNoteId(null);
      setNoteForm({
        type: NoteType.GENERAL,
        title: "",
        content: "",
        isImportant: false,
      });
    }
  };

  const handleDeleteNote = (noteId: string) => {
    if (confirm("Czy na pewno chcesz usunąć tę notatkę?")) {
      deleteNoteMutation.mutate({ noteId });
    }
  };

  const handleEditNote = (note: {
    id: string;
    type: NoteType;
    title: string;
    content: string;
    isImportant: boolean;
  }) => {
    setEditingNoteId(note.id);
    setNoteForm({
      type: note.type,
      title: note.title,
      content: note.content,
      isImportant: note.isImportant,
    });
    setShowNoteForm(true);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setNoteForm({
      type: NoteType.GENERAL,
      title: "",
      content: "",
      isImportant: false,
    });
    setShowNoteForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Szczegóły właściciela
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {owner.firstName} {owner.lastName} - {owner.email}
              </p>
            </div>
            <div className="mt-4 flex gap-3 sm:mt-0">
              <button
                onClick={() => router.push("/admin/owners")}
                className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-500"
              >
                <svg
                  className="-ml-0.5 mr-1.5 h-5 w-5"
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
                Powrót do listy
              </button>
              <button
                onClick={() => router.push(`/admin/owners/${ownerId}/edit`)}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
              >
                <svg
                  className="-ml-0.5 mr-1.5 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                Edytuj właściciela
              </button>
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="inline-flex items-center rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
              >
                <svg
                  className="-ml-0.5 mr-1.5 h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                  />
                </svg>
                Zarządzaj apartamentami
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Informacje o właścicielu */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Informacje o właścicielu
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imię i nazwisko
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.firstName} {owner.lastName}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900">{owner.email}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <div className="mt-1">
                    {owner.isActive ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Aktywny
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Nieaktywny
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Typ płatności
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.paymentType === PaymentType.COMMISSION
                      ? "Prowizja od przychodów"
                      : `Kwota stała: ${Number(owner.fixedPaymentAmount).toFixed(2)} PLN`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Opcja VAT
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {owner.vatOption === VATOption.NO_VAT && "Bez VAT"}
                    {owner.vatOption === VATOption.VAT_8 && "VAT 8%"}
                    {owner.vatOption === VATOption.VAT_23 && "VAT 23%"}
                  </p>
                </div>

                {owner.isFirstLogin && owner.temporaryPassword && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Hasło tymczasowe
                    </label>
                    <div className="mt-1 flex items-center space-x-2">
                      <code className="rounded bg-yellow-50 px-2 py-1 font-mono text-sm text-yellow-800">
                        {owner.temporaryPassword}
                      </code>
                      <button
                        onClick={() => {
                          void navigator.clipboard.writeText(
                            owner.temporaryPassword!,
                          );
                        }}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Kopiuj hasło"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sekcja notatek */}
            <div className="mt-8 rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Notatki ({ownerNotesQuery.data?.length ?? 0})
                </h3>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Dodaj notatkę
                </button>
              </div>

              {/* Formularz dodawania/edycji notatki */}
              {showNoteForm && (
                <div className="mb-6 rounded-lg border border-gray-200 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">
                    {editingNoteId ? "Edytuj notatkę" : "Dodaj nową notatkę"}
                  </h4>
                  <form
                    onSubmit={
                      editingNoteId ? handleUpdateNote : handleCreateNote
                    }
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Typ notatki
                      </label>
                      <select
                        value={noteForm.type}
                        onChange={(e) =>
                          setNoteForm((prev) => ({
                            ...prev,
                            type: e.target.value as NoteType,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                      >
                        <option value={NoteType.GENERAL}>Ogólne</option>
                        <option value={NoteType.PAYMENT}>Płatności</option>
                        <option value={NoteType.COMMUNICATION}>
                          Komunikacja
                        </option>
                        <option value={NoteType.ISSUE}>Problem</option>
                        <option value={NoteType.REMINDER}>Przypomnienie</option>
                        <option value={NoteType.IMPORTANT}>Ważne</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Tytuł
                      </label>
                      <input
                        type="text"
                        value={noteForm.title}
                        onChange={(e) =>
                          setNoteForm((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        placeholder="Krótki tytuł notatki"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Treść
                      </label>
                      <textarea
                        value={noteForm.content}
                        onChange={(e) =>
                          setNoteForm((prev) => ({
                            ...prev,
                            content: e.target.value,
                          }))
                        }
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                        placeholder="Szczegółowa treść notatki"
                        required
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={noteForm.isImportant}
                        onChange={(e) =>
                          setNoteForm((prev) => ({
                            ...prev,
                            isImportant: e.target.checked,
                          }))
                        }
                        id="isImportant"
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <label
                        htmlFor="isImportant"
                        className="ml-2 text-sm text-gray-700"
                      >
                        Ważna notatka
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={
                          createNoteMutation.isPending ||
                          updateNoteMutation.isPending
                        }
                        className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {createNoteMutation.isPending ||
                        updateNoteMutation.isPending
                          ? "Zapisywanie..."
                          : "Zapisz"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Anuluj
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Lista notatek */}
              <div className="space-y-3">
                {ownerNotesQuery.isLoading && (
                  <div className="py-4 text-center">
                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                    <p className="mt-2 text-sm text-gray-500">
                      Ładowanie notatek...
                    </p>
                  </div>
                )}

                {ownerNotesQuery.data?.length === 0 && (
                  <div className="py-4 text-center">
                    <p className="text-sm text-gray-500">Brak notatek</p>
                    <p className="text-xs text-gray-400">
                      Dodaj pierwszą notatkę dla tego właściciela
                    </p>
                  </div>
                )}

                {ownerNotesQuery.data?.map((note) => (
                  <div
                    key={note.id}
                    className={`rounded-lg border p-3 ${
                      note.isImportant
                        ? "border-red-200 bg-red-50"
                        : "border-gray-200 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              note.type === NoteType.GENERAL
                                ? "bg-gray-100 text-gray-800"
                                : note.type === NoteType.PAYMENT
                                  ? "bg-green-100 text-green-800"
                                  : note.type === NoteType.COMMUNICATION
                                    ? "bg-blue-100 text-blue-800"
                                    : note.type === NoteType.ISSUE
                                      ? "bg-red-100 text-red-800"
                                      : note.type === NoteType.REMINDER
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-purple-100 text-purple-800"
                            }`}
                          >
                            {note.type === NoteType.GENERAL
                              ? "Ogólne"
                              : note.type === NoteType.PAYMENT
                                ? "Płatności"
                                : note.type === NoteType.COMMUNICATION
                                  ? "Komunikacja"
                                  : note.type === NoteType.ISSUE
                                    ? "Problem"
                                    : note.type === NoteType.REMINDER
                                      ? "Przypomnienie"
                                      : "Ważne"}
                          </span>
                          {note.isImportant && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                              Ważne
                            </span>
                          )}
                        </div>
                        <h4 className="font-medium text-gray-900">
                          {note.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {note.content}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Dodane:{" "}
                            {new Date(note.createdAt).toLocaleDateString(
                              "pl-PL",
                            )}
                          </span>
                          {note.createdByAdmin?.name && (
                            <span>przez: {note.createdByAdmin.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditNote(note)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Edytuj"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Usuń"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Lista apartamentów */}
          <div className="lg:col-span-3">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Apartamenty właściciela ({ownerApartments.length})
                </h3>
                <button
                  onClick={() =>
                    router.push(`/admin/apartments/new?ownerId=${ownerId}`)
                  }
                  className="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <svg
                    className="-ml-0.5 mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Dodaj apartament
                </button>
              </div>

              {/* Loader podczas refetch */}
              {ownerApartmentsQuery.isRefetching && (
                <div className="mb-4 rounded-md bg-blue-50 p-4">
                  <div className="flex items-center">
                    <div className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="text-sm text-blue-700">
                      Odświeżanie listy apartamentów...
                    </p>
                  </div>
                </div>
              )}

              {ownerApartments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-gray-500">Brak apartamentów</p>
                  <p className="mt-1 text-sm text-gray-400">
                    Dodaj pierwszy apartament dla tego właściciela
                  </p>
                </div>
              ) : (
                <ApartmentList
                  apartments={ownerApartments}
                  mode="admin"
                  onEdit={(apartmentId) =>
                    router.push(`/admin/apartments/${apartmentId}`)
                  }
                  onDelete={handleDeleteApartment}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {isManageModalOpen && (
        <ManageOwnerApartmentsModal
          owner={owner}
          allApartments={allApartments}
          onClose={() => setIsManageModalOpen(false)}
          onSuccess={() => {
            void ownerQuery.refetch();
            void ownerApartmentsQuery.refetch();
            void allApartmentsQuery.refetch();
          }}
        />
      )}
    </div>
  );
}
