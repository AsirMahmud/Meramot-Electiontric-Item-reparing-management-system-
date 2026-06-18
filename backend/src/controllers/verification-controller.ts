import { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../models/prisma.js";
import { sendGmailApiEmail } from "../services/gmail-api-service.js";
import { sendSms } from "../services/sms-service.js";

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationOtp(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { channel } = req.body;
    if (channel !== "email" && channel !== "phone") {
      return res.status(400).json({ message: "Invalid channel. Must be email or phone." });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    if (channel === "email") {
      if (user.isEmailVerified) return res.status(400).json({ message: "Email is already verified." });
      
      await prisma.user.update({
        where: { id: userId },
        data: { emailOtpCode: otp, emailOtpExpiresAt: expiresAt },
      });

      await sendGmailApiEmail({
        to: user.email,
        subject: "Verify your Email Address",
        html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      });
      return res.json({ message: "OTP sent to email successfully" });

    } else if (channel === "phone") {
      if (user.isPhoneVerified) return res.status(400).json({ message: "Phone is already verified." });
      if (!user.phone) return res.status(400).json({ message: "No phone number linked to user." });

      await prisma.user.update({
        where: { id: userId },
        data: { phoneOtpCode: otp, phoneOtpExpiresAt: expiresAt },
      });

      await sendSms(user.phone, `Your Meramot verification code is: ${otp}. It expires in 10 mins.`);
      return res.json({ message: "OTP sent to phone successfully" });
    }

  } catch (error) {
    console.error("sendVerificationOtp error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
}

export async function verifyOtp(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { channel, otp } = req.body;
    if (!otp) return res.status(400).json({ message: "OTP is required" });
    if (channel !== "email" && channel !== "phone") {
      return res.status(400).json({ message: "Invalid channel" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (channel === "email") {
      if (user.emailOtpCode !== otp) return res.status(400).json({ message: "Invalid OTP" });
      if (!user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isEmailVerified: true,
          emailOtpCode: null,
          emailOtpExpiresAt: null,
        },
      });

      return res.json({ message: "Email verified successfully" });
    } else if (channel === "phone") {
      if (user.phoneOtpCode !== otp) return res.status(400).json({ message: "Invalid OTP" });
      if (!user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < new Date()) {
        return res.status(400).json({ message: "OTP has expired" });
      }

      await prisma.user.update({
        where: { id: userId },
        data: {
          isPhoneVerified: true,
          phoneOtpCode: null,
          phoneOtpExpiresAt: null,
        },
      });

      return res.json({ message: "Phone verified successfully" });
    }
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
}
