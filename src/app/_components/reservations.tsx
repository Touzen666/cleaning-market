import type {RouterOutputs} from "@/trpc/react";
import {api} from "@/trpc/server";

type Post = RouterOutputs["post"]["getAll"][0];
//test
export async function ReservationList() {
  const reservations = await api.reservation.getAll();



  return (
    <div className="w-full max-w-md mx-auto">
      <h2 className="text-lg font-bold mt-4">Twoje apartamenty:</h2>

        <ul className="mt-2 space-y-2">
          {reservations && reservations.length > 0 ? (
            reservations.map((reservation) => (
              <li
                key={reservation.id}
                className="p-2 border rounded"
              >
                {reservation.apartmentName}
                {reservation.start.toString()}
                {reservation.children}
                {reservation.adults}
              </li>
            ))
          ) : (
            <p>Brak postów.</p>
          )}
        </ul>
    </div>
  );
}
