-- Add optional roomId to MonthlyReport to support per-room reports
ALTER TABLE "MonthlyReport" ADD COLUMN IF NOT EXISTS "roomId" INTEGER NULL;

-- Drop old unique constraint (apartmentId, year, month) if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'MonthlyReport_apartmentId_year_month_key'
    ) THEN
        ALTER TABLE "MonthlyReport" DROP CONSTRAINT "MonthlyReport_apartmentId_year_month_key";
    END IF;
END$$;

-- Create new composite unique including roomId (NULLs allowed for apartment-wide reports)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_indexes
        WHERE  schemaname = ANY (current_schemas(false))
        AND    indexname = 'MonthlyReport_apartmentId_year_month_roomId_key'
    ) THEN
        ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_apartmentId_year_month_roomId_key" UNIQUE ("apartmentId","year","month","roomId");
    END IF;
END$$;

-- Add FK to Room
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM   pg_constraint
        WHERE  conname = 'MonthlyReport_roomId_fkey'
    ) THEN
        ALTER TABLE "MonthlyReport"
        ADD CONSTRAINT "MonthlyReport_roomId_fkey"
        FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;


