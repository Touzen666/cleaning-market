"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import {
  UserCircleIcon,
  CameraIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import Link from "next/link";

export default function OwnerProfile() {
  const router = useRouter();
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
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

  useEffect(() => {
    if (ownerData) {
      setFormData({
        firstName: ownerData.firstName ?? "",
        lastName: ownerData.lastName ?? "",
        email: ownerData.email ?? "",
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
    if (!profileImage) return;

    const formData = new FormData();
    formData.append("image", profileImage);

    try {
      await uploadImageMutation.mutateAsync({ image: formData });
    } catch (error) {
      console.error("Błąd uploadu:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await updateProfileMutation.mutateAsync({
        ownerEmail: ownerEmail!,
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
                  {ownerData?.profileImageUrl ? (
                    <Image
                      src={ownerData.profileImageUrl}
                      alt="Zdjęcie profilowe"
                      width={100}
                      height={100}
                      className="rounded-full object-cover"
                    />
                  ) : previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt="Podgląd zdjęcia"
                      width={100}
                      height={100}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <UserCircleIcon className="h-24 w-24 text-gray-400" />
                  )}

                  <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-2 transition-colors hover:bg-blue-700">
                    <CameraIcon className="h-4 w-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    Zdjęcie profilowe
                  </h3>
                  <p className="text-sm text-gray-500">
                    Kliknij ikonę aparatu, aby wybrać nowe zdjęcie
                  </p>

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
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Imię
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nazwisko
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 sm:text-sm"
                  />
                </div>

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
                            firstName: ownerData.firstName ?? "",
                            lastName: ownerData.lastName ?? "",
                            email: ownerData.email ?? "",
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
