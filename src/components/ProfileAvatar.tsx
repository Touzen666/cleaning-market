import Image from "next/image";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface ProfileAvatarProps {
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  alt?: string;
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const sizePixels = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96,
};

export default function ProfileAvatar({
  imageUrl,
  size = "md",
  alt = "Zdjęcie profilowe",
  className = "",
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Show default icon if no image URL or image failed to load
  if (!imageUrl || imageError) {
    return (
      <UserCircleIcon
        className={`${sizeClasses[size]} text-gray-400 ${className}`}
      />
    );
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={sizePixels[size]}
      height={sizePixels[size]}
      className={`${sizeClasses[size]} rounded-full object-cover ${className}`}
      onError={() => setImageError(true)}
    />
  );
}
