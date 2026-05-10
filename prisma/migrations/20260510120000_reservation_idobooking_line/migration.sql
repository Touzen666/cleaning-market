-- Allow multiple IdoBooking object lines per reservation id (multi-room / multi-item bookings)
ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "idobookingObjectItemId" INTEGER NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "Reservation_idobookingId_key";

CREATE UNIQUE INDEX "Reservation_idobookingId_idobookingObjectItemId_key" ON "Reservation"("idobookingId", "idobookingObjectItemId");
