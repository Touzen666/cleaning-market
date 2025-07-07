"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";

interface ApartmentImage {
  id: string;
  url: string;
  alt: string | null;
  isPrimary: boolean;
  order: number;
}

interface ApartmentImageManagerProps {
  apartmentId: string;
  images: ApartmentImage[];
  onImagesChange: () => void;
}

export default function ApartmentImageManager({
  apartmentId,
  images,
  onImagesChange,
}: ApartmentImageManagerProps) {
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageAlt, setNewImageAlt] = useState("");
  const [isAddingImage, setIsAddingImage] = useState(false);

  // Mutacje
  const addImage = api.apartments.addImage.useMutation({
    onSuccess: () => {
      setNewImageUrl("");
      setNewImageAlt("");
      setIsAddingImage(false);
      onImagesChange();
    },
  });

  const deleteImage = api.apartments.deleteImage.useMutation({
    onSuccess: () => {
      onImagesChange();
    },
  });

  const setPrimaryImage = api.apartments.setPrimaryImage.useMutation({
    onSuccess: () => {
      onImagesChange();
    },
  });

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImageUrl.trim()) return;

    addImage.mutate({
      apartmentId,
      url: newImageUrl.trim(),
      alt: newImageAlt.trim() || undefined,
    });
  };

  const handleDeleteImage = (imageId: string) => {
    if (confirm("Czy na pewno chcesz usunąć to zdjęcie?")) {
      deleteImage.mutate({ imageId });
    }
  };

  const handleSetPrimary = (imageId: string) => {
    setPrimaryImage.mutate({ imageId });
  };

  return (
    <div className="space-y-6">
      {/* Sekcja dodawania zdjęć */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Dodaj nowe zdjęcie
        </h3>

        {!isAddingImage ? (
          <button
            onClick={() => setIsAddingImage(true)}
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Dodaj zdjęcie
          </button>
        ) : (
          <form onSubmit={handleAddImage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                URL zdjęcia *
              </label>
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Opis zdjęcia (opcjonalnie)
              </label>
              <input
                type="text"
                value={newImageAlt}
                onChange={(e) => setNewImageAlt(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
                placeholder="np. Widok z balkonu"
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={addImage.isPending}
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
              >
                {addImage.isPending ? "Dodawanie..." : "Dodaj zdjęcie"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddingImage(false);
                  setNewImageUrl("");
                  setNewImageAlt("");
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Anuluj
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Galeria zdjęć */}
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Galeria zdjęć ({images.length})
        </h3>

        {images.length === 0 ? (
          <p className="text-gray-500">
            Brak zdjęć. Dodaj pierwsze zdjęcie powyżej.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <div
                key={image.id}
                className={`relative overflow-hidden rounded-lg border-2 ${
                  image.isPrimary
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200"
                }`}
              >
                {/* Zdjęcie */}
                <img
                  src={image.url}
                  alt={image.alt ?? "Zdjęcie apartamentu"}
                  className="h-48 w-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%236b7280'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";
                  }}
                />

                {/* Overlay z akcjami */}
                <div className="absolute inset-0 bg-black bg-opacity-0 transition-all duration-200 hover:bg-opacity-50">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 hover:opacity-100">
                    <div className="flex space-x-2">
                      {!image.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(image.id)}
                          disabled={setPrimaryImage.isPending}
                          className="rounded bg-white p-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                          title="Ustaw jako główne"
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteImage(image.id)}
                        disabled={deleteImage.isPending}
                        className="rounded bg-red-600 p-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                        title="Usuń zdjęcie"
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

                {/* Badge głównego zdjęcia */}
                {image.isPrimary && (
                  <div className="absolute left-2 top-2 rounded-full bg-indigo-600 px-2 py-1 text-xs font-medium text-white">
                    Główne
                  </div>
                )}

                {/* Opis zdjęcia */}
                {image.alt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
                    <p className="text-xs text-white">{image.alt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {images.length > 1 && (
          <p className="mt-4 text-sm text-gray-500">
            💡 Kliknij na zdjęcie, aby zobaczyć opcje zarządzania.
          </p>
        )}
      </div>
    </div>
  );
}
