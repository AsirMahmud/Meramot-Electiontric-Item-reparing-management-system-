-- CreateTable
CREATE TABLE "DeliveryChatMessage" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" "UserRole" NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryChatMessage_deliveryId_createdAt_idx" ON "DeliveryChatMessage"("deliveryId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryChatMessage_senderUserId_recipientUserId_createdAt_idx" ON "DeliveryChatMessage"("senderUserId", "recipientUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "DeliveryChatMessage" ADD CONSTRAINT "DeliveryChatMessage_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
