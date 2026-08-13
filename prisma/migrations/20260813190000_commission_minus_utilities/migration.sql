-- AlterEnum: prowizja liczona po odjęciu czynszu i mediów
DO $$
BEGIN
    ALTER TYPE "PaymentType" ADD VALUE 'COMMISSION_MINUS_UTILITIES';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "SettlementType" ADD VALUE 'COMMISSION_MINUS_UTILITIES';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
