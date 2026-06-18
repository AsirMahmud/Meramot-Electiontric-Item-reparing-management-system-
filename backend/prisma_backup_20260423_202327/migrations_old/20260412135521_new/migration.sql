/*
  Warnings:

  - A unique constraint covering the columns `[vendorApplicationId]` on the table `Shop` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'VENDOR', 'ADMIN', 'DELIVERY');

-- CreateEnum
CREATE TYPE "ShopStaffRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "RequestSource" AS ENUM ('MARKETPLACE', 'DIRECT_SERVICE', 'DIRECT_CUSTOM_SHOP');

-- CreateEnum
CREATE TYPE "DeliveryAgentStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ShopServicePricingType" AS ENUM ('FIXED', 'STARTING_FROM', 'INSPECTION_REQUIRED');

-- CreateEnum
CREATE TYPE "VerificationTargetType" AS ENUM ('USER', 'VENDOR_APPLICATION', 'SHOP');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationProvider" AS ENUM ('MANUAL', 'PORICHOY', 'TRADE_LICENSE', 'OTHER');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('CHECKUP', 'REPAIR', 'DELIVERY', 'FINAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CUSTOMER_PAYMENT', 'PLATFORM_COMMISSION', 'VENDOR_EARNING', 'VENDOR_PAYOUT', 'DELIVERY_FEE', 'DELIVERY_PAYOUT', 'REFUND', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'EMAIL', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- AlterEnum
ALTER TYPE "BidStatus" ADD VALUE 'WITHDRAWN';

-- AlterEnum
ALTER TYPE "DeliveryStatus" ADD VALUE 'DISPATCHED';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'AUTHORIZED';

-- AlterEnum
ALTER TYPE "UserStatus" ADD VALUE 'BANNED';

-- AlterEnum
ALTER TYPE "VendorApplicationStatus" ADD VALUE 'UNDER_REVIEW';

-- AlterTable
ALTER TABLE "Delivery" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "coverageZoneId" TEXT,
ADD COLUMN     "deliveryAgentId" TEXT,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "externalOrderId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "gatewayResponse" TEXT,
ADD COLUMN     "invoiceId" TEXT;

-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT,
ADD COLUMN     "moderationNote" TEXT;

-- AlterTable
ALTER TABLE "RepairRequest" ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "dropoffAddress" TEXT,
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "requestedServiceId" TEXT,
ADD COLUMN     "requestedShopId" TEXT,
ADD COLUMN     "source" "RequestSource" NOT NULL DEFAULT 'MARKETPLACE';

-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "acceptsDirectOrders" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deliveryRadiusKm" DOUBLE PRECISION,
ADD COLUMN     "openingHoursText" TEXT,
ADD COLUMN     "supportsOnsiteRepair" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "supportsPickup" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vendorApplicationId" TEXT;

-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "assigneeAdminId" TEXT,
ADD COLUMN     "repairJobId" TEXT,
ADD COLUMN     "shopId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER';

-- AlterTable
ALTER TABLE "VendorApplication" ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedByAdminId" TEXT;

-- CreateTable
CREATE TABLE "ShopStaff" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ShopStaffRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopService" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "deviceType" TEXT,
    "issueCategory" TEXT,
    "pricingType" "ShopServicePricingType" NOT NULL DEFAULT 'INSPECTION_REQUIRED',
    "basePrice" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "estimatedDaysMin" INTEGER,
    "estimatedDaysMax" INTEGER,
    "includesPickup" BOOLEAN NOT NULL DEFAULT false,
    "includesDelivery" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" TEXT,
    "status" "DeliveryAgentStatus" NOT NULL DEFAULT 'OFFLINE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoverageZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "area" TEXT,
    "postalCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoverageZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiderCoverage" (
    "id" TEXT NOT NULL,
    "riderProfileId" TEXT NOT NULL,
    "coverageZoneId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiderCoverage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "targetType" "VerificationTargetType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "VerificationProvider" NOT NULL DEFAULT 'MANUAL',
    "userId" TEXT,
    "vendorApplicationId" TEXT,
    "shopId" TEXT,
    "reviewedByAdminId" TEXT,
    "subjectRef" TEXT,
    "providerReference" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "repairRequestId" TEXT,
    "repairJobId" TEXT,
    "shopId" TEXT,
    "type" "InvoiceType" NOT NULL DEFAULT 'FINAL',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoiceNumber" TEXT NOT NULL,
    "subtotalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "commissionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "shopServiceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "paymentId" TEXT,
    "invoiceId" TEXT,
    "payoutId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "description" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "shopId" TEXT,
    "riderProfileId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "repairRequestId" TEXT,
    "deliveryId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "provider" TEXT,
    "providerRef" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopStaff_userId_idx" ON "ShopStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopStaff_shopId_userId_key" ON "ShopStaff"("shopId", "userId");

-- CreateIndex
CREATE INDEX "ShopService_shopId_isActive_sortOrder_idx" ON "ShopService"("shopId", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "ShopService_deviceType_issueCategory_idx" ON "ShopService"("deviceType", "issueCategory");

-- CreateIndex
CREATE UNIQUE INDEX "ShopService_shopId_slug_key" ON "ShopService"("shopId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RiderProfile_userId_key" ON "RiderProfile"("userId");

-- CreateIndex
CREATE INDEX "RiderProfile_status_isActive_idx" ON "RiderProfile"("status", "isActive");

-- CreateIndex
CREATE INDEX "CoverageZone_city_area_idx" ON "CoverageZone"("city", "area");

-- CreateIndex
CREATE UNIQUE INDEX "RiderCoverage_riderProfileId_coverageZoneId_key" ON "RiderCoverage"("riderProfileId", "coverageZoneId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationRecord_vendorApplicationId_key" ON "VerificationRecord"("vendorApplicationId");

-- CreateIndex
CREATE INDEX "VerificationRecord_status_provider_idx" ON "VerificationRecord"("status", "provider");

-- CreateIndex
CREATE INDEX "VerificationRecord_userId_idx" ON "VerificationRecord"("userId");

-- CreateIndex
CREATE INDEX "VerificationRecord_shopId_idx" ON "VerificationRecord"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_repairRequestId_idx" ON "Invoice"("repairRequestId");

-- CreateIndex
CREATE INDEX "Invoice_repairJobId_idx" ON "Invoice"("repairJobId");

-- CreateIndex
CREATE INDEX "Invoice_shopId_idx" ON "Invoice"("shopId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_shopServiceId_idx" ON "InvoiceLineItem"("shopServiceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_shopId_idx" ON "LedgerEntry"("shopId");

-- CreateIndex
CREATE INDEX "LedgerEntry_paymentId_idx" ON "LedgerEntry"("paymentId");

-- CreateIndex
CREATE INDEX "LedgerEntry_invoiceId_idx" ON "LedgerEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "LedgerEntry_payoutId_idx" ON "LedgerEntry"("payoutId");

-- CreateIndex
CREATE INDEX "LedgerEntry_type_direction_idx" ON "LedgerEntry"("type", "direction");

-- CreateIndex
CREATE UNIQUE INDEX "VendorPayout_reference_key" ON "VendorPayout"("reference");

-- CreateIndex
CREATE INDEX "VendorPayout_shopId_idx" ON "VendorPayout"("shopId");

-- CreateIndex
CREATE INDEX "VendorPayout_riderProfileId_idx" ON "VendorPayout"("riderProfileId");

-- CreateIndex
CREATE INDEX "VendorPayout_status_idx" ON "VendorPayout"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_repairRequestId_idx" ON "NotificationLog"("repairRequestId");

-- CreateIndex
CREATE INDEX "NotificationLog_deliveryId_idx" ON "NotificationLog"("deliveryId");

-- CreateIndex
CREATE INDEX "NotificationLog_channel_status_idx" ON "NotificationLog"("channel", "status");

-- CreateIndex
CREATE INDEX "Delivery_deliveryAgentId_idx" ON "Delivery"("deliveryAgentId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Rating_moderatedById_idx" ON "Rating"("moderatedById");

-- CreateIndex
CREATE INDEX "RepairRequest_source_status_idx" ON "RepairRequest"("source", "status");

-- CreateIndex
CREATE INDEX "RepairRequest_requestedShopId_idx" ON "RepairRequest"("requestedShopId");

-- CreateIndex
CREATE INDEX "RepairRequest_requestedServiceId_idx" ON "RepairRequest"("requestedServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_vendorApplicationId_key" ON "Shop"("vendorApplicationId");

-- CreateIndex
CREATE INDEX "Shop_isActive_isFeatured_idx" ON "Shop"("isActive", "isFeatured");

-- CreateIndex
CREATE INDEX "Shop_city_area_idx" ON "Shop"("city", "area");

-- CreateIndex
CREATE INDEX "SupportTicket_shopId_idx" ON "SupportTicket"("shopId");

-- CreateIndex
CREATE INDEX "SupportTicket_repairRequestId_idx" ON "SupportTicket"("repairRequestId");

-- CreateIndex
CREATE INDEX "SupportTicket_repairJobId_idx" ON "SupportTicket"("repairJobId");

-- CreateIndex
CREATE INDEX "VendorApplication_status_idx" ON "VendorApplication"("status");

-- CreateIndex
CREATE INDEX "VendorApplication_reviewedByAdminId_idx" ON "VendorApplication"("reviewedByAdminId");

-- AddForeignKey
ALTER TABLE "VendorApplication" ADD CONSTRAINT "VendorApplication_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shop" ADD CONSTRAINT "Shop_vendorApplicationId_fkey" FOREIGN KEY ("vendorApplicationId") REFERENCES "VendorApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopStaff" ADD CONSTRAINT "ShopStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopService" ADD CONSTRAINT "ShopService_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_requestedShopId_fkey" FOREIGN KEY ("requestedShopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairRequest" ADD CONSTRAINT "RepairRequest_requestedServiceId_fkey" FOREIGN KEY ("requestedServiceId") REFERENCES "ShopService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderProfile" ADD CONSTRAINT "RiderProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderCoverage" ADD CONSTRAINT "RiderCoverage_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiderCoverage" ADD CONSTRAINT "RiderCoverage_coverageZoneId_fkey" FOREIGN KEY ("coverageZoneId") REFERENCES "CoverageZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_deliveryAgentId_fkey" FOREIGN KEY ("deliveryAgentId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Delivery" ADD CONSTRAINT "Delivery_coverageZoneId_fkey" FOREIGN KEY ("coverageZoneId") REFERENCES "CoverageZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_vendorApplicationId_fkey" FOREIGN KEY ("vendorApplicationId") REFERENCES "VendorApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "RepairRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_shopServiceId_fkey" FOREIGN KEY ("shopServiceId") REFERENCES "ShopService"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "VendorPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_riderProfileId_fkey" FOREIGN KEY ("riderProfileId") REFERENCES "RiderProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentlyViewed" ADD CONSTRAINT "RecentlyViewed_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "RepairRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "RepairJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assigneeAdminId_fkey" FOREIGN KEY ("assigneeAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_repairRequestId_fkey" FOREIGN KEY ("repairRequestId") REFERENCES "RepairRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;
