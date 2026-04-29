CREATE TABLE "EscrowLedger" (
    "id" TEXT PRIMARY KEY,
    "action" TEXT NOT NULL,
    "vendorUserId" TEXT,
    "grossAmount" DECIMAL(10,2),
    "platformCommissionAmount" DECIMAL(10,2),
    "vendorNetAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- CreateIndex
CREATE INDEX "EscrowLedger_vendorUserId_idx" ON "EscrowLedger"("vendorUserId");
CREATE INDEX "EscrowLedger_action_idx" ON "EscrowLedger"("action");

-- AddForeignKey
ALTER TABLE "EscrowLedger"
ADD CONSTRAINT "EscrowLedger_vendorUserId_fkey"
FOREIGN KEY ("vendorUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;