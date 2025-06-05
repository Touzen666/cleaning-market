import React from "react";
import { ReservationList } from "@/app/_components/shared/ReservationList";

export default function ApartmentsPage() {
  return (
    <div className="p-4">
      <h1 className="mb-4 text-2xl font-bold">Lista apartamentów</h1>
      <ReservationList />
    </div>
  );
}
