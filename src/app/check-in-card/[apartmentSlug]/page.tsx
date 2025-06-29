import React from "react";
import CheckInCard from "@/app/components/CheckInCard";

interface Props {
  params: Promise<{ apartmentSlug: string }>;
}

export default async function CheckInCardPage({ params }: Props) {
  const { apartmentSlug } = await params;

  return (
    <main className="container mx-auto py-8">
      <CheckInCard apartmentSlug={apartmentSlug} />
    </main>
  );
}
