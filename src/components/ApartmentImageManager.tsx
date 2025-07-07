"use client";

import React, { useState, useCallback } from "react";
import { api } from "@/trpc/react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";

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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragOver, setDragOver] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

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

  const reorderImages = api.apartments.reorderImages.useMutation({
    onMutate: () => {
      setIsReordering(true);
    },
    onSuccess: () => {
      onImagesChange();
      setIsReordering(false);
    },
    onError: () => {
      setIsReordering(false);
    },
  });

  // Drag & Drop dla plików
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);
      setUploadProgress(0);

      // Symulacja uploadu - w rzeczywistości tutaj byłby upload do serwera
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        if (!file) continue;

        // Symulacja progress
        setUploadProgress(((i + 1) / acceptedFiles.length) * 100);

        // Konwertuj plik na URL (w rzeczywistości byłby upload)
        const fileUrl = URL.createObjectURL(file);

        // Dodaj zdjęcie pojedynczo
        addImage.mutate({
          apartmentId,
          url: fileUrl,
          alt: file.name.replace(/\.[^/.]+$/, ""), // Usuń rozszerzenie
        });
      }
    },
    [apartmentId, addImage],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    multiple: true,
    onDragEnter: () => setDragOver(true),
    onDragLeave: () => setDragOver(false),
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

  const handleDragStart = (e: React.DragEvent, imageId: string) => {
    e.dataTransfer.setData("imageId", imageId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetImageId: string) => {
    e.preventDefault();
    const draggedImageId = e.dataTransfer.getData("imageId");

    if (draggedImageId === targetImageId) return;

    // Znajdź indeksy zdjęć
    const draggedIndex = images.findIndex((img) => img.id === draggedImageId);
    const targetIndex = images.findIndex((img) => img.id === targetImageId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Utwórz nową kolejność
    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedIndex, 1);
    if (draggedImage) {
      newImages.splice(targetIndex, 0, draggedImage);
    }

    // Zaktualizuj kolejność
    const imageOrders = newImages.map((img, index) => ({
      id: img.id,
      order: index + 1,
    }));

    reorderImages.mutate({
      apartmentId,
      imageOrders,
    });
  };

  return (
    <div className="space-y-6">
      {/* Sekcja uploadu zdjęć */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">
          Dodaj zdjęcia
        </h3>

        {/* Drag & Drop Area */}
        <div
          {...getRootProps()}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragActive || dragOver
              ? "border-indigo-400 bg-indigo-50"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <input {...getInputProps()} />

          {isUploading ? (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Uploadowanie zdjęć...
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {Math.round(uploadProgress)}% ukończono
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isDragActive
                    ? "Upuść zdjęcia tutaj..."
                    : "Przeciągnij i upuść zdjęcia lub kliknij, aby wybrać"}
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF do 10MB każdy
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Alternatywny sposób dodawania przez URL */}
        <div className="mt-4">
          {!isAddingImage ? (
            <button
              onClick={() => setIsAddingImage(true)}
              className="inline-flex items-center rounded-md bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
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
              Dodaj przez URL
            </button>
          ) : (
            <form
              onSubmit={handleAddImage}
              className="space-y-4 rounded-lg border border-gray-200 p-4"
            >
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
      </div>

      {/* Galeria zdjęć */}
      <div className="rounded-lg border border-gray-200 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Galeria zdjęć ({images.length})
          </h3>
          {images.length > 1 && (
            <p className="text-sm text-gray-500">
              💡 Przeciągnij zdjęcia, aby zmienić kolejność
            </p>
          )}
        </div>

        {images.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Brak zdjęć
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Dodaj pierwsze zdjęcie powyżej.
            </p>
          </div>
        ) : isReordering ? (
          <div className="py-12 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Zmienianie kolejności...
            </h3>
            <p className="mt-1 text-sm text-gray-500">Proszę czekać</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={(e) => handleDragStart(e, image.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, image.id)}
                className={`group relative cursor-move overflow-hidden rounded-lg border-2 transition-all duration-200 hover:shadow-lg ${
                  image.isPrimary
                    ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Zdjęcie */}
                <div className="relative aspect-[4/3] bg-gray-100">
                  <Image
                    src={image.url}
                    alt={image.alt ?? "Zdjęcie apartamentu"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='14' fill='%236b7280'%3EBrak zdjęcia%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>

                {/* Overlay z akcjami */}
                <div className="absolute inset-0 bg-black bg-opacity-0 transition-all duration-200 group-hover:bg-opacity-50">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
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
                  <div className="absolute left-2 top-2 rounded-full bg-indigo-600 px-2 py-1 text-xs font-medium text-white shadow-sm">
                    <svg
                      className="mr-1 inline h-3 w-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Główne
                  </div>
                )}

                {/* Numer kolejności */}
                <div className="absolute right-2 top-2 rounded-full bg-black bg-opacity-50 px-2 py-1 text-xs font-medium text-white">
                  #{index + 1}
                </div>

                {/* Opis zdjęcia */}
                {image.alt && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 p-2">
                    <p className="truncate text-xs text-white">{image.alt}</p>
                  </div>
                )}

                {/* Drag handle */}
                <div className="absolute bottom-2 left-2 rounded bg-white bg-opacity-75 p-1 text-gray-500 opacity-0 transition-opacity group-hover:opacity-100">
                  <svg
                    className="h-3 w-3"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zm6-8a2 2 0 1 1-.001-4.001A2 2 0 0 1 13 6zm0 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zm0 6a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 1 && (
          <div className="mt-4 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Zarządzanie galerią
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc space-y-1 pl-5">
                    <li>Przeciągnij zdjęcia, aby zmienić kolejność</li>
                    <li>Kliknij na zdjęcie, aby zobaczyć opcje zarządzania</li>
                    <li>
                      Pierwsze zdjęcie będzie wyświetlane jako główne na listach
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
