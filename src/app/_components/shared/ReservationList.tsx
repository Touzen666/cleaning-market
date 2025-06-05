import { api } from "@/trpc/server";

export async function ReservationList() {
  const reservations = await api.reservation.getAll();

  return (
    <div className="mx-auto w-full max-w-md">
      <h2 className="mt-4 text-lg font-bold">Twoje apartamenty:</h2>

      <ul className="mt-2 space-y-2">
        {reservations && reservations.length > 0 ? (
          reservations.map((reservation) => (
            <li key={reservation.id} className="rounded border bg-gray-100 p-2">
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
