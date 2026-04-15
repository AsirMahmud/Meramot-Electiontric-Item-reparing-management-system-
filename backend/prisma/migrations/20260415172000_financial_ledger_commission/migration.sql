-- AlterTable
ALTER TABLE "EscrowLedger"
ADD COLUMN "vendorUserId" TEXT,
ADD COLUMN "grossAmount" DECIMAL(10,2),
ADD COLUMN "platformCommissionAmount" DECIMAL(10,2),
ADD COLUMN "vendorNetAmount" DECIMAL(10,2);

-- CreateIndex
CREATE INDEX "EscrowLedger_vendorUserId_idx" ON "EscrowLedger"("vendorUserId");
CREATE INDEX "EscrowLedger_action_idx" ON "EscrowLedger"("action");

-- AddForeignKey
ALTER TABLE "EscrowLedger"
ADD CONSTRAINT "EscrowLedger_vendorUserId_fkey"
FOREIGN KEY ("vendorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
