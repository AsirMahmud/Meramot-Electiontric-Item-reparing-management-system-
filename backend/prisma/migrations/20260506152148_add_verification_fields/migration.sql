-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailOtpCode" TEXT,
ADD COLUMN     "emailOtpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingPenalty" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "phoneOtpCode" TEXT,
ADD COLUMN     "phoneOtpExpiresAt" TIMESTAMP(3);
