"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  UserCircleIcon,
  CameraIcon,
  DocumentTextIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function OwnerProfile() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Predefined avatars
  const avatars = [
    { url: "/uploads/profiles/avatar1.svg", label: "Kobieta 1" },
    { url: "/uploads/profiles/avatar2.svg", label: "Kobieta 2" },
    { url: "/uploads/profiles/avatar3.svg", label: "Mężczyzna 1" },
    { url: "/uploads/profiles/avatar4.svg", label: "Mężczyzna 2" },
    { url: "/uploads/profiles/avatar5.svg", label: "Rodzina 1" },
    { url: "/uploads/profiles/avatar6.svg", label: "Rodzina 2" },
  ];

  // Form states - initialize with empty strings to avoid controlled/uncontrolled issues
  const [formData, setFormData] = useState({
    phone: "",
    companyName: "",
    nip: "",
    address: "",
    city: "",
    postalCode: "",
  });

  useEffect(() => {
    const email = localStorage.getItem("ownerEmail");
    const token = localStorage.getItem("ownerSessionToken");

    if (!token) {
      router.push("/apartamentsOwner/login");
    } else {
      setOwnerEmail(email);
    }
  }, [router]);

  const {
    data: ownerData,
    isLoading: isLoadingOwner,
    error: ownerError,
    refetch: refetchOwner,
  } = api.ownerAuth.getOwnerProfile.useQuery(
    { ownerEmail: ownerEmail! },
    { enabled: !!ownerEmail },
  );

  const updateProfileMutation = api.ownerAuth.updateOwnerProfile.useMutation({
    onSuccess: () => {
      setIsEditing(false);
      setIsLoading(false);
      void refetchOwner();
    },
    onError: (error) => {
      console.error("Błąd aktualizacji profilu:", error);
      setIsLoading(false);
    },
  });

  const uploadImageMutation = api.ownerAuth.uploadProfileImage.useMutation({
    onSuccess: () => {
      setProfileImage(null);
      setPreviewUrl(null);
      void refetchOwner();
    },
    onError: (error) => {
      console.error("Błąd uploadu zdjęcia:", error);
    },
  });

  const setAvatarMutation = api.ownerAuth.setAvatar.useMutation({
    onSuccess: () => {
      void refetchOwner();
    },
    onError: (error) => {
      console.error("Błąd ustawiania avataru:", error);
    },
  });

  const removeProfileImageMutation =
    api.ownerAuth.removeProfileImage.useMutation({
      onSuccess: () => {
        void refetchOwner();
      },
      onError: (error) => {
        console.error("Błąd usuwania zdjęcia:", error);
      },
    });

  useEffect(() => {
    if (ownerData) {
      setFormData({
        phone: ownerData.phone ?? "",
        companyName: ownerData.companyName ?? "",
        nip: ownerData.nip ?? "",
        address: ownerData.address ?? "",
        city: ownerData.city ?? "",
        postalCode: ownerData.postalCode ?? "",
      });
    }
  }, [ownerData]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleImageUpload = async () => {
    if (!profileImage || !ownerEmail) return;

    try {
      // First upload the file to Vercel Blob via API route
      const formData = new FormData();
      formData.append("file", profileImage);

      const uploadResponse = await fetch("/api/upload-profile-image", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadResult = (await uploadResponse.json()) as {
        success: boolean;
        url: string;
        message?: string;
      };

      if (!uploadResult.success) {
        throw new Error(uploadResult.message ?? "Upload failed");
      }

      // Then save the image URL to database via TRPC
      await uploadImageMutation.mutateAsync({
        imageUrl: uploadResult.url,
        ownerEmail: ownerEmail,
        filename: profileImage.name,
        mimeType: profileImage.type,
        size: profileImage.size,
      });
    } catch (error) {
      console.error("Błąd uploadu:", error);
    }
  };

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!ownerEmail) return;

    try {
      await setAvatarMutation.mutateAsync({
        ownerEmail: ownerEmail,
        avatarUrl,
      });
      setShowAvatarSelector(false);
    } catch (error) {
      console.error("Błąd ustawiania avataru:", error);
    }
  };

  const handleRemoveProfileImage = async () => {
    if (!ownerEmail) return;

    try {
      await removeProfileImageMutation.mutateAsync({
        ownerEmail: ownerEmail,
      });
    } catch (error) {
      console.error("Błąd usuwania zdjęcia:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerEmail) return;

    setIsLoading(true);

    try {
      await updateProfileMutation.mutateAsync({
        ownerEmail: ownerEmail,
        ...formData,
      });
    } catch (error) {
      console.error("Błąd aktualizacji:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoadingOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Ładowanie...
      </div>
    );
  }

  if (ownerError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Wystąpił błąd: {ownerError.message}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Profil Właściciela
          </h1>
          <p className="text-gray-600">
            Zarządzaj swoimi danymi i zdjęciem profilowym
          </p>
        </div>
      </header>

      <main className="py-10">
        <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
          {/* Quick Actions */}
          <div className="mb-8 rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Szybkie akcje
              </h3>
              <div className="mt-5">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <DocumentTextIcon
                        className="h-5 w-5 text-blue-400"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="ml-3 flex-1 md:flex md:justify-between">
                      <p className="text-sm text-blue-700">
                        Przeglądaj swoją kompletną historię podatku dochodowego
                        z możliwością eksportu i analizy.
                      </p>
                      <p className="mt-3 text-sm md:ml-6 md:mt-0">
                        <Link
                          href="/apartamentsOwner/tax-history"
                          className="whitespace-nowrap font-medium text-blue-700 hover:text-blue-600"
                        >
                          Historia Podatku
                          <span aria-hidden="true"> &rarr;</span>
                        </Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white shadow">
            {/* Profile Image Section */}
            <div className="border-b border-gray-200 px-4 py-5 sm:p-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {previewUrl ? (
                    <div className="relative h-[100px] w-[100px]">
                      <Image
                        src={previewUrl}
                        alt="Podgląd zdjęcia"
                        fill
                        className="rounded-full object-cover"
                        sizes="100px"
                      />
                    </div>
                  ) : (
                    <ProfileAvatar
                      imageUrl={ownerData?.profileImageUrl}
                      size="xl"
                      alt="Zdjęcie profilowe"
                    />
                  )}

                  <div className="absolute bottom-0 right-0 flex space-x-1">
                    <label className="cursor-pointer rounded-full bg-blue-600 p-2 transition-colors hover:bg-blue-700">
                      <CameraIcon className="h-4 w-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                      className="rounded-full bg-green-600 p-2 transition-colors hover:bg-green-700"
                    >
                      <PhotoIcon className="h-4 w-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    Zdjęcie profilowe
                  </h3>
                  <p className="text-sm text-gray-500">
                    Kliknij ikonę aparatu, aby wybrać nowe zdjęcie lub ikonę
                    zdjęcia, aby wybrać avatar
                  </p>

                  {ownerData?.profileImageUrl && (
                    <div className="mt-2">
                      <button
                        onClick={handleRemoveProfileImage}
                        disabled={removeProfileImageMutation.isPending}
                        className="text-sm text-red-600 disabled:opacity-50 hover:text-red-800"
                      >
                        Usuń zdjęcie profilowe
                      </button>
                    </div>
                  )}

                  {profileImage && (
                    <div className="mt-3 flex space-x-3">
                      <button
                        onClick={handleImageUpload}
                        disabled={uploadImageMutation.isPending}
                        className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium leading-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-blue-700"
                      >
                        {uploadImageMutation.isPending
                          ? "Zapisywanie..."
                          : "Zapisz zdjęcie"}
                      </button>
                      <button
                        onClick={() => {
                          setProfileImage(null);
                          setPreviewUrl(null);
                        }}
                        className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-gray-50"
                      >
                        Anuluj
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Avatar Selector */}
              {showAvatarSelector && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <h4 className="mb-3 text-sm font-medium text-gray-900">
                    Wybierz avatar
                  </h4>
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                    {avatars.map((avatar) => (
                      <button
                        key={avatar.url}
                        onClick={() => handleAvatarSelect(avatar.url)}
                        disabled={setAvatarMutation.isPending}
                        className="group relative flex flex-col items-center space-y-2 rounded-lg border-2 border-transparent p-2 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:border-blue-500 hover:bg-white"
                      >
                        <div className="relative h-16 w-16 overflow-hidden rounded-full">
                          <Image
                            src={avatar.url}
                            alt={avatar.label}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                        <span className="text-xs text-gray-600 group-hover:text-gray-900">
                          {avatar.label}
                        </span>
                        {setAvatarMutation.isPending && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white bg-opacity-75">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => setShowAvatarSelector(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Zamknij
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Owner Information (Read-only) */}
            <div className="border-b border-gray-200 px-4 py-5 sm:p-6">
              <h3 className="mb-4 text-lg font-medium text-gray-900">
                Informacje o właścicielu
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imię
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {ownerData?.firstName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nazwisko
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {ownerData?.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <p className="mt-1 text-sm text-gray-900">
                    {ownerData?.email}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Imię, nazwisko i email mogą być zmienione tylko przez
                administratora.
              </p>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nazwa firmy
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    NIP
                  </label>
                  <input
                    type="text"
                    name="nip"
                    value={formData.nip}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Adres
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Miasto
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kod pocztowy
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form data to original values
                        if (ownerData) {
                          setFormData({
                            phone: ownerData.phone ?? "",
                            companyName: ownerData.companyName ?? "",
                            nip: ownerData.nip ?? "",
                            address: ownerData.address ?? "",
                            city: ownerData.city ?? "",
                            postalCode: ownerData.postalCode ?? "",
                          });
                        }
                      }}
                      className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-gray-50"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:bg-blue-700"
                    >
                      {isLoading ? "Zapisywanie..." : "Zapisz zmiany"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:bg-blue-700"
                  >
                    Edytuj profil
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
