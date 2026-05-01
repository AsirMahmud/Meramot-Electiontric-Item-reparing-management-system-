/*
  Warnings:

  - You are about to drop the column `assigneeAdminId` on the `SupportTicket` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `VendorApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `VendorApplication` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "SupportTicketStatus" ADD VALUE 'ESCALATED';

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_assigneeAdminId_fkey";

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD';

-- AlterTable
ALTER TABLE "RepairJob" ADD COLUMN     "finalQuoteItems" JSONB;

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "baseLaborFee" DOUBLE PRECISION,
ADD COLUMN     "escrowStatus" "EscrowStatus" DEFAULT 'HELD',
ADD COLUMN     "expressFee" DOUBLE PRECISION,
ADD COLUMN     "inspectionFee" DOUBLE PRECISION,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
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

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_key" ON "VendorApplication"("userId");

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedAdminId_fkey" FOREIGN KEY ("assignedAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
