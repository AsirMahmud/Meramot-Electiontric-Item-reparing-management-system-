-- Migration: add profilePictureUrl to RiderProfile
ALTER TABLE "RiderProfile" ADD COLUMN IF NOT EXISTS "profilePictureUrl" TEXT;

