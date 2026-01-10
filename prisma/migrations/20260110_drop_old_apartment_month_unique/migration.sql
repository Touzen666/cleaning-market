-- Drop legacy unique index on (apartmentId, year, month) created by early migrations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM   pg_indexes
        WHERE  schemaname = ANY (current_schemas(false))
        AND    indexname = 'MonthlyReport_apartmentId_year_month_key'
    ) THEN
        DROP INDEX "MonthlyReport_apartmentId_year_month_key";
    END IF;
END$$;


