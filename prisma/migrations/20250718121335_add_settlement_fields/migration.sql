/*
  Warnings:

  - You are about to drop the column `name` on the `Post` table. All the data in the column will be lost.
  - Added the required column `title` to the `Post` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('ADMIN', 'UNKNOWN', 'GUEST', 'OWNER', 'CLEANER');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('COMMISSION', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "VATOption" AS ENUM ('NO_VAT', 'VAT_8', 'VAT_23');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SENT');

-- CreateEnum
CREATE TYPE "ReportItemType" AS ENUM ('REVENUE', 'EXPENSE', 'FEE', 'TAX', 'COMMISSION');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('CZYNSZ', 'MEDIA', 'PRAD', 'GAZ', 'WODA', 'INTERNET', 'PRANIE', 'SPRZATANIE', 'SRODKI_CZYSTOSCI');

-- CreateEnum
CREATE TYPE "ReservationPortal" AS ENUM ('BOOKING', 'AIRBNB', 'IDOBOOKING', 'CHANEL_MANAGER');

-- CreateEnum
CREATE TYPE "SettlementType" AS ENUM ('COMMISSION', 'FIXED', 'FIXED_MINUS_UTILITIES');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('GENERAL', 'PAYMENT', 'COMMUNICATION', 'ISSUE', 'REMINDER', 'IMPORTANT');

-- DropIndex
DROP INDEX IF EXISTS "Post_name_idx";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "name",
ADD COLUMN     "title" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'UNKNOWN';

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "source" TEXT NOT NULL,
    "createDate" DATE NOT NULL,
    "guest" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "apartmentName" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payment" TEXT NOT NULL,
    "paymantValue" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "adults" INTEGER,
    "children" INTEGER,
    "importSource" TEXT,
    "importBatchId" TEXT,
    "id" SERIAL NOT NULL,
    "apartmentId" INTEGER,
    "idobookingId" INTEGER,
    "rateCorrection" DOUBLE PRECISION,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Apartment" (
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "defaultRentAmount" DOUBLE PRECISION DEFAULT 0,
    "defaultUtilitiesAmount" DOUBLE PRECISION DEFAULT 0,
    "hasBalcony" BOOLEAN NOT NULL DEFAULT false,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "maxGuests" INTEGER DEFAULT 4,
    "importSource" TEXT,
    "importBatchId" TEXT,
    "id" SERIAL NOT NULL,
    "idobookingId" INTEGER,

    CONSTRAINT "Apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApartmentImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apartmentId" INTEGER NOT NULL,

    CONSTRAINT "ApartmentImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apartmentId" INTEGER,

    CONSTRAINT "LeadApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInCard" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "nationality" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "bookingHolderFirstName" TEXT,
    "bookingHolderLastName" TEXT,
    "isDifferentGuest" BOOLEAN NOT NULL DEFAULT false,
    "addressStreet" TEXT NOT NULL,
    "addressCity" TEXT NOT NULL,
    "addressZipCode" TEXT NOT NULL,
    "addressCountry" TEXT NOT NULL,
    "submittedApartmentIdentifier" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "isPrimaryGuest" BOOLEAN NOT NULL,
    "actualCheckInTime" TIMESTAMP(3),
    "reservationId" INTEGER,

    CONSTRAINT "CheckInCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestSession" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "apartmentSlug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "checkInCardId" TEXT NOT NULL,

    CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApartmentOwner" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "temporaryPassword" TEXT,
    "temporaryPasswordExpiresAt" TIMESTAMP(3),
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "paymentType" "PaymentType" NOT NULL DEFAULT 'COMMISSION',
    "fixedPaymentAmount" DECIMAL(65,30),
    "vatOption" "VATOption" NOT NULL DEFAULT 'NO_VAT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdByAdminId" TEXT NOT NULL,
    "resetPasswordToken" TEXT,
    "resetPasswordTokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "ApartmentOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApartmentOwnership" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedByAdminId" TEXT NOT NULL,
    "apartmentId" INTEGER NOT NULL,

    CONSTRAINT "ApartmentOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalDeduction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "vatOption" "VATOption" NOT NULL DEFAULT 'NO_VAT',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AdditionalDeduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyReport" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "draftNotes" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedByAdminId" TEXT,
    "sentAt" TIMESTAMP(3),
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerPayoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "rentAmount" DOUBLE PRECISION DEFAULT 0,
    "utilitiesAmount" DOUBLE PRECISION DEFAULT 0,
    "suggestedRent" DOUBLE PRECISION DEFAULT 0,
    "suggestedUtilities" DOUBLE PRECISION DEFAULT 0,
    "finalSettlementType" TEXT,
    "finalOwnerPayout" DOUBLE PRECISION,
    "adminCommissionAmount" DOUBLE PRECISION,
    "afterCommission" DOUBLE PRECISION,
    "afterRentAndUtilities" DOUBLE PRECISION,
    "totalAdditionalDeductions" DOUBLE PRECISION,
    "apartmentId" INTEGER NOT NULL,

    CONSTRAINT "MonthlyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportId" TEXT NOT NULL,
    "type" "ReportItemType" NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "expenseCategory" "ExpenseCategory",
    "portal" "ReservationPortal",
    "date" DATE NOT NULL,
    "notes" TEXT,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "reservationId" INTEGER,

    CONSTRAINT "ReportItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportHistory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "ReportStatus",
    "newStatus" "ReportStatus",
    "notes" TEXT,

    CONSTRAINT "ReportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnerNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdByAdminId" TEXT NOT NULL,
    "type" "NoteType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isImportant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "OwnerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_idobookingId_key" ON "Reservation"("idobookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_name_key" ON "Apartment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_slug_key" ON "Apartment"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Apartment_idobookingId_key" ON "Apartment"("idobookingId");

-- CreateIndex
CREATE INDEX "ApartmentImage_apartmentId_idx" ON "ApartmentImage"("apartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckInCard_reservationId_key" ON "CheckInCard"("reservationId");

-- CreateIndex
CREATE INDEX "GuestSession_apartmentSlug_isActive_idx" ON "GuestSession"("apartmentSlug", "isActive");

-- CreateIndex
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentOwner_email_key" ON "ApartmentOwner"("email");

-- CreateIndex
CREATE INDEX "ApartmentOwner_email_idx" ON "ApartmentOwner"("email");

-- CreateIndex
CREATE INDEX "ApartmentOwner_isActive_idx" ON "ApartmentOwner"("isActive");

-- CreateIndex
CREATE INDEX "ApartmentOwnership_ownerId_isActive_idx" ON "ApartmentOwnership"("ownerId", "isActive");

-- CreateIndex
CREATE INDEX "ApartmentOwnership_apartmentId_isActive_idx" ON "ApartmentOwnership"("apartmentId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ApartmentOwnership_ownerId_apartmentId_key" ON "ApartmentOwnership"("ownerId", "apartmentId");

-- CreateIndex
CREATE INDEX "AdditionalDeduction_reportId_idx" ON "AdditionalDeduction"("reportId");

-- CreateIndex
CREATE INDEX "MonthlyReport_status_idx" ON "MonthlyReport"("status");

-- CreateIndex
CREATE INDEX "MonthlyReport_ownerId_status_idx" ON "MonthlyReport"("ownerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyReport_apartmentId_year_month_key" ON "MonthlyReport"("apartmentId", "year", "month");

-- CreateIndex
CREATE INDEX "ReportItem_reportId_type_idx" ON "ReportItem"("reportId", "type");

-- CreateIndex
CREATE INDEX "ReportHistory_reportId_createdAt_idx" ON "ReportHistory"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "OwnerNote_ownerId_type_idx" ON "OwnerNote"("ownerId", "type");

-- CreateIndex
CREATE INDEX "OwnerNote_ownerId_isImportant_idx" ON "OwnerNote"("ownerId", "isImportant");

-- CreateIndex
CREATE INDEX "OwnerNote_createdAt_idx" ON "OwnerNote"("createdAt");

-- CreateIndex
CREATE INDEX "Post_title_idx" ON "Post"("title");

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentImage" ADD CONSTRAINT "ApartmentImage_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadApplication" ADD CONSTRAINT "LeadApplication_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInCard" ADD CONSTRAINT "CheckInCard_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestSession" ADD CONSTRAINT "GuestSession_checkInCardId_fkey" FOREIGN KEY ("checkInCardId") REFERENCES "CheckInCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentOwner" ADD CONSTRAINT "ApartmentOwner_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentOwnership" ADD CONSTRAINT "ApartmentOwnership_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentOwnership" ADD CONSTRAINT "ApartmentOwnership_assignedByAdminId_fkey" FOREIGN KEY ("assignedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApartmentOwnership" ADD CONSTRAINT "ApartmentOwnership_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ApartmentOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalDeduction" ADD CONSTRAINT "AdditionalDeduction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_apartmentId_fkey" FOREIGN KEY ("apartmentId") REFERENCES "Apartment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyReport" ADD CONSTRAINT "MonthlyReport_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ApartmentOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportItem" ADD CONSTRAINT "ReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportItem" ADD CONSTRAINT "ReportItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportHistory" ADD CONSTRAINT "ReportHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "MonthlyReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerNote" ADD CONSTRAINT "OwnerNote_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnerNote" ADD CONSTRAINT "OwnerNote_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "ApartmentOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
