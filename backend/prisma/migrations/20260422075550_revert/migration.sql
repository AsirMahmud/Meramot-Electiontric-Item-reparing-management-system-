/*
  Warnings:

  - The values [WITHDRAWN] on the enum `BidStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [DISPATCHED] on the enum `DeliveryStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [AUTHORIZED] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [BANNED] on the enum `UserStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [UNDER_REVIEW] on the enum `VendorApplicationStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `cancellationReason` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `coverageZoneId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryAgentId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `dispatchedAt` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `externalOrderId` on the `Delivery` table. All the data in the column will be lost.
  - You are about to drop the column `gatewayResponse` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `invoiceId` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `isHidden` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `moderatedAt` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `moderatedById` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `moderationNote` on the `Rating` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `dropoffAddress` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `pickupAddress` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedServiceId` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `requestedShopId` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `RepairRequest` table. All the data in the column will be lost.
  - You are about to drop the column `acceptsDirectOrders` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `deliveryRadiusKm` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `openingHoursText` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `supportsOnsiteRepair` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `supportsPickup` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `vendorApplicationId` on the `Shop` table. All the data in the column will be lost.
  - You are about to drop the column `assigneeAdminId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `repairJobId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `shopId` on the `SupportTicket` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedAt` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the column `reviewedByAdminId` on the `VendorApplication` table. All the data in the column will be lost.
  - You are about to drop the `CoverageZone` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EscrowLedger` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceLineItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LedgerEntry` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NotificationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RiderCoverage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RiderProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ShopStaff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VendorPayout` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VerificationRecord` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId]` on the table `VendorApplication` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `VendorApplication` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CHECKED_OUT', 'ABANDONED');

-- AlterEnum
BEGIN;
CREATE TYPE "BidStatus_new" AS ENUM ('ACTIVE', 'ACCEPTED', 'DECLINED', 'EXPIRED');
ALTER TABLE "public"."Bid" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Bid" ALTER COLUMN "status" TYPE "BidStatus_new" USING ("status"::text::"BidStatus_new");
ALTER TYPE "BidStatus" RENAME TO "BidStatus_old";
ALTER TYPE "BidStatus_new" RENAME TO "BidStatus";
DROP TYPE "public"."BidStatus_old";
ALTER TABLE "Bid" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "DeliveryStatus_new" AS ENUM ('PENDING', 'SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED');
ALTER TABLE "public"."Delivery" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Delivery" ALTER COLUMN "status" TYPE "DeliveryStatus_new" USING ("status"::text::"DeliveryStatus_new");
ALTER TYPE "DeliveryStatus" RENAME TO "DeliveryStatus_old";
ALTER TYPE "DeliveryStatus_new" RENAME TO "DeliveryStatus";
DROP TYPE "public"."DeliveryStatus_old";
ALTER TABLE "Delivery" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
ALTER TABLE "public"."Payment" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "public"."PaymentStatus_old";
ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "UserStatus_new" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');
ALTER TABLE "public"."User" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus_new" USING ("status"::text::"UserStatus_new");
ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
ALTER TYPE "UserStatus_new" RENAME TO "UserStatus";
DROP TYPE "public"."UserStatus_old";
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "VendorApplicationStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
ALTER TABLE "public"."VendorApplication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "VendorApplication" ALTER COLUMN "status" TYPE "VendorApplicationStatus_new" USING ("status"::text::"VendorApplicationStatus_new");
ALTER TYPE "VendorApplicationStatus" RENAME TO "VendorApplicationStatus_old";
ALTER TYPE "VendorApplicationStatus_new" RENAME TO "VendorApplicationStatus";
DROP TYPE "public"."VendorApplicationStatus_old";
ALTER TABLE "VendorApplication" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_coverageZoneId_fkey";

-- DropForeignKey
ALTER TABLE "Delivery" DROP CONSTRAINT "Delivery_deliveryAgentId_fkey";

-- DropForeignKey
ALTER TABLE "EscrowLedger" DROP CONSTRAINT "EscrowLedger_vendorUserId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_repairJobId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_repairRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_shopId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLineItem" DROP CONSTRAINT "InvoiceLineItem_shopServiceId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_paymentId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_payoutId_fkey";

-- DropForeignKey
ALTER TABLE "LedgerEntry" DROP CONSTRAINT "LedgerEntry_shopId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_deliveryId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationLog" DROP CONSTRAINT "NotificationLog_repairRequestId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Rating" DROP CONSTRAINT "Rating_moderatedById_fkey";

-- DropForeignKey
ALTER TABLE "RecentlyViewed" DROP CONSTRAINT "RecentlyViewed_shopId_fkey";

-- DropForeignKey
ALTER TABLE "RepairRequest" DROP CONSTRAINT "RepairRequest_requestedServiceId_fkey";

-- DropForeignKey
ALTER TABLE "RepairRequest" DROP CONSTRAINT "RepairRequest_requestedShopId_fkey";

-- DropForeignKey
ALTER TABLE "RiderCoverage" DROP CONSTRAINT "RiderCoverage_coverageZoneId_fkey";

-- DropForeignKey
ALTER TABLE "RiderCoverage" DROP CONSTRAINT "RiderCoverage_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "RiderProfile" DROP CONSTRAINT "RiderProfile_userId_fkey";

-- DropForeignKey
ALTER TABLE "Shop" DROP CONSTRAINT "Shop_vendorApplicationId_fkey";

-- DropForeignKey
ALTER TABLE "ShopService" DROP CONSTRAINT "ShopService_shopId_fkey";

-- DropForeignKey
ALTER TABLE "ShopStaff" DROP CONSTRAINT "ShopStaff_shopId_fkey";

-- DropForeignKey
ALTER TABLE "ShopStaff" DROP CONSTRAINT "ShopStaff_userId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_assigneeAdminId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_repairJobId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_repairRequestId_fkey";

-- DropForeignKey
ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_shopId_fkey";

-- DropForeignKey
ALTER TABLE "VendorApplication" DROP CONSTRAINT "VendorApplication_reviewedByAdminId_fkey";

-- DropForeignKey
ALTER TABLE "VendorPayout" DROP CONSTRAINT "VendorPayout_riderProfileId_fkey";

-- DropForeignKey
ALTER TABLE "VendorPayout" DROP CONSTRAINT "VendorPayout_shopId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationRecord" DROP CONSTRAINT "VerificationRecord_reviewedByAdminId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationRecord" DROP CONSTRAINT "VerificationRecord_shopId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationRecord" DROP CONSTRAINT "VerificationRecord_userId_fkey";

-- DropForeignKey
ALTER TABLE "VerificationRecord" DROP CONSTRAINT "VerificationRecord_vendorApplicationId_fkey";

-- DropIndex
DROP INDEX "Delivery_deliveryAgentId_idx";

-- DropIndex
DROP INDEX "Payment_invoiceId_idx";

-- DropIndex
DROP INDEX "Rating_moderatedById_idx";

-- DropIndex
DROP INDEX "RepairRequest_requestedServiceId_idx";

-- DropIndex
DROP INDEX "RepairRequest_requestedShopId_idx";

-- DropIndex
DROP INDEX "RepairRequest_source_status_idx";

-- DropIndex
DROP INDEX "Shop_city_area_idx";

-- DropIndex
DROP INDEX "Shop_isActive_isFeatured_idx";

-- DropIndex
DROP INDEX "Shop_vendorApplicationId_key";

-- DropIndex
DROP INDEX "SupportTicket_repairJobId_idx";

-- DropIndex
DROP INDEX "SupportTicket_repairRequestId_idx";

-- DropIndex
DROP INDEX "SupportTicket_shopId_idx";

-- DropIndex
DROP INDEX "VendorApplication_reviewedByAdminId_idx";

-- DropIndex
DROP INDEX "VendorApplication_status_idx";

-- AlterTable
ALTER TABLE "Delivery" DROP COLUMN "cancellationReason",
DROP COLUMN "coverageZoneId",
DROP COLUMN "deliveryAgentId",
DROP COLUMN "dispatchedAt",
DROP COLUMN "externalOrderId";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "gatewayResponse",
DROP COLUMN "invoiceId";

-- AlterTable
ALTER TABLE "Rating" DROP COLUMN "isHidden",
DROP COLUMN "moderatedAt",
DROP COLUMN "moderatedById",
DROP COLUMN "moderationNote";

-- AlterTable
ALTER TABLE "RepairRequest" DROP COLUMN "contactPhone",
DROP COLUMN "dropoffAddress",
DROP COLUMN "pickupAddress",
DROP COLUMN "requestedServiceId",
DROP COLUMN "requestedShopId",
DROP COLUMN "source";

-- AlterTable
ALTER TABLE "Shop" DROP COLUMN "acceptsDirectOrders",
DROP COLUMN "deliveryRadiusKm",
DROP COLUMN "openingHoursText",
DROP COLUMN "supportsOnsiteRepair",
DROP COLUMN "supportsPickup",
DROP COLUMN "vendorApplicationId";

-- AlterTable
ALTER TABLE "SupportTicket" DROP COLUMN "assigneeAdminId",
DROP COLUMN "repairJobId",
DROP COLUMN "shopId";

-- AlterTable
ALTER TABLE "VendorApplication" DROP COLUMN "reviewedAt",
DROP COLUMN "reviewedByAdminId",
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "rejectionVisibleUntil" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT NOT NULL;

-- DropTable
DROP TABLE "CoverageZone";

-- DropTable
DROP TABLE "EscrowLedger";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceLineItem";

-- DropTable
DROP TABLE "LedgerEntry";

-- DropTable
DROP TABLE "NotificationLog";

-- DropTable
DROP TABLE "RiderCoverage";

-- DropTable
DROP TABLE "RiderProfile";

-- DropTable
DROP TABLE "ShopService";

-- DropTable
DROP TABLE "ShopStaff";

-- DropTable
DROP TABLE "VendorPayout";

-- DropTable
DROP TABLE "VerificationRecord";

-- DropEnum
DROP TYPE "DeliveryAgentStatus";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "InvoiceType";

-- DropEnum
DROP TYPE "LedgerDirection";

-- DropEnum
DROP TYPE "LedgerEntryType";

-- DropEnum
DROP TYPE "NotificationChannel";

-- DropEnum
DROP TYPE "NotificationStatus";

-- DropEnum
DROP TYPE "PayoutStatus";

-- DropEnum
DROP TYPE "RequestSource";

-- DropEnum
DROP TYPE "ShopServicePricingType";

-- DropEnum
DROP TYPE "ShopStaffRole";

-- DropEnum
DROP TYPE "VerificationProvider";

-- DropEnum
DROP TYPE "VerificationStatus";

-- DropEnum
DROP TYPE "VerificationTargetType";

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorApplication_userId_key" ON "VendorApplication"("userId");

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
