import React from "react";
import CheckInCard from "@/app/components/CheckInCard";

interface CheckInCardPageProps {
  params: {
    apartmentSlug: string;
  };
}

export default function DynamicCheckInCardPage({
  params,
}: CheckInCardPageProps) {
  return (
    <main className="container mx-auto py-8">
      <CheckInCard apartmentSlug={params.apartmentSlug} />
    </main>
  );
}
