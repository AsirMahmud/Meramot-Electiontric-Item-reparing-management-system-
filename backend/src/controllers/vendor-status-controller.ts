import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";

type AuthPayload = {
  sub: string;
  role?: string;
};

function extractBearerToken(header?: string) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function getVendorApplicationStatus(req: Request, res: Response) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;

    if (!payload?.sub) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "VENDOR") {
      return res.status(403).json({ message: "Only vendors can access this resource" });
    }

    const application = await prisma.vendorApplication.findUnique({
        where: { userId: user.id },
        select: {
            id: true,
            status: true,
            ownerName: true,
            businessEmail: true,
            phone: true,
            shopName: true,
            tradeLicenseNo: true,
            address: true,
            city: true,
            area: true,
            specialties: true,
            courierPickup: true,
            inShopRepair: true,
            spareParts: true,
            notes: true,
            rejectionReason: true,
            rejectionVisibleUntil: true,
            createdAt: true,
        },
        });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    return res.json({ application });
  } catch (error) {
    console.error("getVendorApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

function parseCsvList(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
export async function updateVendorApplicationStatus(req: Request, res: Response) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    const payload = jwt.verify(token, env.jwtSecret) as AuthPayload;

    if (!payload?.sub) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "VENDOR") {
      return res.status(403).json({ message: "Only vendors can access this resource" });
    }

    const existing = await prisma.vendorApplication.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    const {
      ownerName,
      phone,
      shopName,
      tradeLicenseNo,
      address,
      city,
      area,
      specialties,
      courierPickup,
      inShopRepair,
      spareParts,
      notes,
    } = req.body as {
      ownerName?: string;
      phone?: string;
      shopName?: string;
      tradeLicenseNo?: string;
      address?: string;
      city?: string;
      area?: string;
      specialties?: string[] | string;
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      notes?: string;
    };

    if (!ownerName || !phone || !shopName || !address) {
      return res.status(400).json({
        message: "ownerName, phone, shopName, and address are required",
      });
    }

    const normalizedSpecialties = Array.isArray(specialties)
      ? specialties.map((s) => s.trim()).filter(Boolean)
      : parseCsvList(specialties);

    const updated = await prisma.vendorApplication.update({
      where: { userId: user.id },
      data: {
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        shopName: shopName.trim(),
        tradeLicenseNo: tradeLicenseNo?.trim() || null,
        address: address.trim(),
        city: city?.trim() || null,
        area: area?.trim() || null,
        specialties: normalizedSpecialties,
        courierPickup: Boolean(courierPickup),
        inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : true,
        spareParts: Boolean(spareParts),
        notes: notes?.trim() || null,
      },
      select: {
        id: true,
        status: true,
        ownerName: true,
        businessEmail: true,
        shopName: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "Vendor application updated successfully",
      application: updated,
    });
  } catch (error) {
    console.error("updateVendorApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}