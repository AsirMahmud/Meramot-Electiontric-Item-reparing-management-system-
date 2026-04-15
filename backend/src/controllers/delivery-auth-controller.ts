import type { Prisma } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sendDeliveryRegistrationAcknowledgementEmail } from "../services/delivery-credentials-email-service.js";

function signDeliveryToken(user: { id: string; username: string; email: string }) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
      aud: "delivery",
    },
    env.jwtSecretDelivery,
    { expiresIn: "7d" },
  );
}

export async function deliveryRegister(req: Request, res: Response) {
  try {
    const { name, email, phone, vehicleType, nidDocumentUrl, educationDocumentUrl, cvDocumentUrl } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      vehicleType?: string;
      nidDocumentUrl?: string;
      educationDocumentUrl?: string;
      cvDocumentUrl?: string;
    };

    if (!name || !email || !phone || !nidDocumentUrl || !educationDocumentUrl || !cvDocumentUrl) {
      return res.status(400).json({
        message:
          "name, email, phone, nidDocumentUrl, educationDocumentUrl, and cvDocumentUrl are required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanNidUrl = nidDocumentUrl.trim();
    const cleanEducationUrl = educationDocumentUrl.trim();
    const cleanCvUrl = cvDocumentUrl.trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }],
      },
      select: { id: true, role: true },
    });

    if (existing) {
      return res.status(409).json({
        message:
          existing.role === "DELIVERY"
            ? "Delivery account already exists for this email"
            : "This email is already registered",
      });
    }

    const tempUsername = `pending_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const tempPassword = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.create({
        data: {
          name: name.trim(),
          username: tempUsername,
          email: cleanEmail,
          phone: phone.trim(),
          passwordHash,
          role: "DELIVERY",
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          role: true,
        },
      });

      const riderProfile = await tx.riderProfile.create({
        data: {
          userId: user.id,
          vehicleType: vehicleType?.trim() || null,
          nidDocumentUrl: cleanNidUrl,
          educationDocumentUrl: cleanEducationUrl,
          cvDocumentUrl: cleanCvUrl,
          registrationStatus: "PENDING",
        },
        select: {
          id: true,
          vehicleType: true,
          nidDocumentUrl: true,
          educationDocumentUrl: true,
          cvDocumentUrl: true,
          status: true,
          registrationStatus: true,
        },
      });

      return { user, riderProfile };
    });

    const token = signDeliveryToken(result.user);

    try {
      await sendDeliveryRegistrationAcknowledgementEmail({
        toEmail: result.user.email,
        recipientName: result.user.name ?? result.user.username,
      });
    } catch (emailError) {
      console.error("deliveryRegister acknowledgement email error:", emailError);
    }

    return res.status(201).json({
      message:
        "Delivery registration submitted. Wait for admin approval. Username and password will be sent to your email.",
      token,
      tokenType: "delivery",
      user: result.user,
      riderProfile: result.riderProfile,
    });
  } catch (error) {
    console.error("deliveryRegister error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deliveryLogin(req: Request, res: Response) {
  try {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    if (!identifier || !password) {
      return res.status(400).json({
        message: "identifier and password are required",
      });
    }

    const cleanIdentifier = identifier.trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanIdentifier.toLowerCase() }, { username: cleanIdentifier }],
      },
    });

    if (!user || user.role !== "DELIVERY") {
      return res.status(401).json({ message: "Invalid delivery credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ message: "Invalid delivery credentials" });
    }

    let riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        vehicleType: true,
        status: true,
        isActive: true,
        registrationStatus: true,
      },
    });

    if (!riderProfile) {
      riderProfile = await prisma.riderProfile.create({
        data: { userId: user.id, registrationStatus: "PENDING" },
        select: {
          id: true,
          vehicleType: true,
          status: true,
          isActive: true,
          registrationStatus: true,
        },
      });
    }

    if (!riderProfile.isActive) {
      return res.status(403).json({ message: "Delivery account is suspended" });
    }

    const token = signDeliveryToken(user);

    return res.json({
      message: "Delivery login successful",
      token,
      tokenType: "delivery",
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      riderProfile,
    });
  } catch (error) {
    console.error("deliveryLogin error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
