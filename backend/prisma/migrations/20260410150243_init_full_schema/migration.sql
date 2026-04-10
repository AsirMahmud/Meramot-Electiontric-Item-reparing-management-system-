/*
  Warnings:

  - You are about to drop the `Shop` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('CHECK_UP_ONLY', 'DIRECT_REPAIR', 'CHECKUP_AND_REPAIR');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'ASSIGNED', 'PICKED_UP', 'AT_SHOP', 'DIAGNOSING', 'AWAITING_APPROVAL', 'FIXING', 'RETURNING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DeliveryType" AS ENUM ('REGULAR', 'EXPRESS');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'DISPATCHED', 'PICKED_UP', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "RepairStage" AS ENUM ('PICKED_UP', 'AT_SHOP', 'DIAGNOSING', 'AWAITING_APPROVAL', 'FIXING', 'RETURNING');

-- CreateEnum
CREATE TYPE "CustomerDecision" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('INITIAL_FEE', 'FINAL_BILL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RaisedByType" AS ENUM ('CUSTOMER', 'SHOP');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('REQUEST_CREATED', 'NEW_BID_RECEIVED', 'BID_ACCEPTED', 'REPAIR_STAGE_UPDATED', 'QUOTE_SENT', 'PAYMENT_RECEIVED', 'WARRANTY_ISSUED', 'SUPPORT_TICKET_UPDATE');

-- DropTable
DROP TABLE "Shop";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "commissionOwed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_skills" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,

    CONSTRAINT "shop_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "issueDescription" TEXT,
    "serviceType" "ServiceType" NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "partsCost" INTEGER NOT NULL,
    "laborCost" INTEGER NOT NULL,
    "totalCost" INTEGER NOT NULL,
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "pathaoOrderId" TEXT,
    "pickupAddress" TEXT NOT NULL,
    "dropoffAddress" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "deliveryFee" INTEGER NOT NULL,
    "deliveryType" "DeliveryType" NOT NULL DEFAULT 'REGULAR',
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repair_jobs" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "bidId" TEXT,
    "stage" "RepairStage" NOT NULL DEFAULT 'PICKED_UP',
    "diagnosisNotes" TEXT,
    "finalQuote" INTEGER,
    "customerDecision" "CustomerDecision" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sslcommerzTxnId" TEXT,
    "paymentType" "PaymentType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warranties" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warranties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "repairJobId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedByType" "RaisedByType" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'SMS',
    "eventType" "NotificationEventType" NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shops_phone_key" ON "shops"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "shops_email_key" ON "shops"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shop_skills_shopId_deviceType_brand_key" ON "shop_skills"("shopId", "deviceType", "brand");

-- CreateIndex
CREATE UNIQUE INDEX "bids_requestId_shopId_key" ON "bids"("requestId", "shopId");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_requestId_key" ON "deliveries"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "repair_jobs_requestId_key" ON "repair_jobs"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "repair_jobs_bidId_key" ON "repair_jobs"("bidId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_sslcommerzTxnId_key" ON "payments"("sslcommerzTxnId");

-- CreateIndex
CREATE UNIQUE INDEX "warranties_repairJobId_key" ON "warranties"("repairJobId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_repairJobId_key" ON "ratings"("repairJobId");

-- AddForeignKey
ALTER TABLE "shop_skills" ADD CONSTRAINT "shop_skills_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "repair_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "repair_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "repair_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_bidId_fkey" FOREIGN KEY ("bidId") REFERENCES "bids"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "repair_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "repair_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warranties" ADD CONSTRAINT "warranties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_repairJobId_fkey" FOREIGN KEY ("repairJobId") REFERENCES "repair_jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "repair_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
