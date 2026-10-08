-- Archiwizacja właścicieli po zakończeniu współpracy.
-- Rekord, apartamenty i raporty historyczne zostają; właściciel znika z list operacyjnych.
ALTER TABLE "ApartmentOwner" ADD COLUMN IF NOT EXISTS "archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "ApartmentOwner_archived_idx" ON "ApartmentOwner"("archived");
