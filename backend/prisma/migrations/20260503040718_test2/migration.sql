/*
  Warnings:

  - You are about to drop the column `assigneeAdminId` on the `SupportTicket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `VendorApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `VendorApplication` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'WAITING_EVIDENCE', 'WAITING_RESPONSE', 'RESOLVED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'NOT_APPLICABLE');

-- AlterEnum
ALTER TYPE "SupportTicketStatus" ADD VALUE 'ESCALATED';

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_assigneeAdminId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "baseLaborFee" DOUBLE PRECISION,
ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD',
ADD COLUMN     "expressFee" DOUBLE PRECISION,
ADD COLUMN     "inspectionFee" DOUBLE PRECISION,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liveNotificationsPrompted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openingDays" TEXT,
ADD COLUMN     "openingHours" TEXT,
ADD COLUMN     "pickupFee" DOUBLE PRECISION,
ADD COLUMN     "setupComplete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportPhone" TEXT,
ADD COLUMN     "whatsappNumber" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "assigneeAdminId",
ADD COLUMN     "assignedAdminId" TEXT;

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectionVisibleUntil" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "VendorPayout" ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD';

-- CreateTable
CREATE TABLE "DisputeCase" (
    "id" TEXT NOT NULL,
    "repairRequestId" TEXT,
    "repairJobId" TEXT,
    "paymentId" TEXT,
    "openedById" TEXT NOT NULL,
    "againstId" TEXT NOT NULL,
    "assignedAdminId" TEXT,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT,
    "invoiceId" TEXT,
    "vendorPayoutId" TEXT,

    CONSTRAINT "DisputeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisputeNote" (
    "id" TEXT NOT NULL,
    "disputeCaseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisputeNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "disputeCaseId" TEXT,
    "approvedById" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT,
    "invoiceId" TEXT,
    "vendorPayoutId" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowLedger" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "disputeCaseId" TEXT,
    "repairRequestId" TEXT,
    "customerUserId" TEXT,
    "vendorUserId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "grossAmount" DOUBLE PRECISION,
    "platformCommissionAmount" DOUBLE PRECISION,
    "vendorNetAmount" DOUBLE PRECISION,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "shopId" TEXT,
    "invoiceId" TEXT,
    "vendorPayoutId" TEXT,

    CONSTRAINT "EscrowLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "senderType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportMessage_ticketId_idx" ON "SupportMessage"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_authorId_idx" ON "SupportMessage"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_key" ON "VendorApplication"("userId");

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "RepairRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_openedById_fkey" FOREIGN KEY ("openedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_againstId_fkey" FOREIGN KEY ("againstId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeCase" ADD CONSTRAINT "DisputeCase_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNote" ADD CONSTRAINT "DisputeNote_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisputeNote" ADD CONSTRAINT "DisputeNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_disputeCaseId_fkey" FOREIGN KEY ("disputeCaseId") REFERENCES "DisputeCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "RepairRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_vendorPayoutId_fkey" FOREIGN KEY ("vendorPayoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
