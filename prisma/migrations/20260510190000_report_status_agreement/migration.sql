-- AlterEnum: nowe statusy raportu (rozwiązanie umowy / zamknięcie rozliczenia)
ALTER TYPE "ReportStatus" ADD VALUE 'AGREEMENT_TERMINATION';
ALTER TYPE "ReportStatus" ADD VALUE 'AGREEMENT_SETTLED';
