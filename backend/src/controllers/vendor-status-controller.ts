import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";

type AuthPayload = {
  sub: string;
  role?: string;
};
type SetupShopBody = {
  shopName?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  area?: string;
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  inspectionFee?: number | string;
  baseLaborFee?: number | string;
  pickupFee?: number | string;
  expressFee?: number | string;
  skillTags?: string[] | string;
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

const shop = await prisma.shop.findFirst({
  where: { email: application.businessEmail },
  select: {
    id: true,
    setupComplete: true,
    isPublic: true,
    inspectionFee: true,
    baseLaborFee: true,
    pickupFee: true,
    expressFee: true,
  },
});

return res.json({
  application: {
    ...application,
    setupComplete: shop?.setupComplete ?? false,
    isPublic: shop?.isPublic ?? false,
    inspectionFee: shop?.inspectionFee ?? null,
    baseLaborFee: shop?.baseLaborFee ?? null,
    pickupFee: shop?.pickupFee ?? null,
    expressFee: shop?.expressFee ?? null,
  },
});

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


export async function completeVendorShopSetup(req: Request, res: Response) {
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
        userId: true,
        status: true,
        businessEmail: true,
        ownerName: true,
        shopName: true,
        phone: true,
        address: true,
        city: true,
        area: true,
        notes: true,
        specialties: true,
        courierPickup: true,
        inShopRepair: true,
        spareParts: true,
      },
    });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    if (application.status !== "APPROVED") {
      return res.status(400).json({
        message: "Only approved vendors can complete shop setup",
      });
    }

    const {
      shopName,
      description,
      phone,
      address,
      city,
      area,
      courierPickup,
      inShopRepair,
      spareParts,
      inspectionFee,
      baseLaborFee,
      pickupFee,
      expressFee,
      skillTags,
    } = req.body as {
      shopName?: string;
      description?: string;
      phone?: string;
      address?: string;
      city?: string;
      area?: string;
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      inspectionFee?: number | string;
      baseLaborFee?: number | string;
      pickupFee?: number | string;
      expressFee?: number | string;
      skillTags?: string[] | string;
    };

    const normalizedShopName = shopName?.trim() || "";
    const normalizedPhone = phone?.trim() || "";
    const normalizedAddress = address?.trim() || "";
    const normalizedCity = city?.trim() || null;
    const normalizedArea = area?.trim() || null;
    const normalizedDescription = description?.trim() || null;

    const normalizedSkillTags = Array.isArray(skillTags)
      ? skillTags.map((tag) => tag.trim()).filter(Boolean)
      : parseCsvList(skillTags);

    const serviceCategories = [
      ...(courierPickup ? ["COURIER_PICKUP" as const] : []),
      ...(inShopRepair ? ["IN_SHOP_REPAIR" as const] : []),
      ...(spareParts ? ["SPARE_PARTS" as const] : []),
    ];

    if (!normalizedShopName || !normalizedPhone || !normalizedAddress) {
      return res.status(400).json({
        message: "shopName, phone, and address are required",
      });
    }

    if (serviceCategories.length === 0) {
      return res.status(400).json({
        message: "Select at least one service option",
      });
    }

    if (normalizedSkillTags.length === 0) {
      return res.status(400).json({
        message: "Add at least one skill tag",
      });
    }

    const inspectionFeeNumber =
      inspectionFee === "" || inspectionFee === undefined || inspectionFee === null
        ? null
        : Number(inspectionFee);

    const baseLaborFeeNumber =
      baseLaborFee === "" || baseLaborFee === undefined || baseLaborFee === null
        ? null
        : Number(baseLaborFee);

    const pickupFeeNumber =
      pickupFee === "" || pickupFee === undefined || pickupFee === null
        ? null
        : Number(pickupFee);

    const expressFeeNumber =
      expressFee === "" || expressFee === undefined || expressFee === null
        ? null
        : Number(expressFee);

    if (
      (inspectionFeeNumber !== null && Number.isNaN(inspectionFeeNumber)) ||
      (baseLaborFeeNumber !== null && Number.isNaN(baseLaborFeeNumber)) ||
      (pickupFeeNumber !== null && Number.isNaN(pickupFeeNumber)) ||
      (expressFeeNumber !== null && Number.isNaN(expressFeeNumber))
    ) {
      return res.status(400).json({
        message: "Pricing fields must be valid numbers",
      });
    }

    if (inspectionFeeNumber === null || baseLaborFeeNumber === null) {
      return res.status(400).json({
        message: "inspectionFee and baseLaborFee are required",
      });
    }

    const existingShop = await prisma.shop.findFirst({
      where: { email: application.businessEmail },
      select: { id: true },
    });

    if (!existingShop) {
      return res.status(404).json({
        message: "Approved vendor shop record not found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.vendorApplication.update({
        where: { id: application.id },
        data: {
          shopName: normalizedShopName,
          phone: normalizedPhone,
          address: normalizedAddress,
          city: normalizedCity,
          area: normalizedArea,
          specialties: normalizedSkillTags,
          courierPickup: Boolean(courierPickup),
          inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : true,
          spareParts: Boolean(spareParts),
          notes: normalizedDescription,
        },
      });

      const updatedShop = await tx.shop.update({
        where: { id: existingShop.id },
        data: {
          name: normalizedShopName,
          description: normalizedDescription,
          phone: normalizedPhone,
          address: normalizedAddress,
          city: normalizedCity,
          area: normalizedArea,
          categories: serviceCategories,
          specialties: normalizedSkillTags,
          inspectionFee: inspectionFeeNumber,
          baseLaborFee: baseLaborFeeNumber,
          pickupFee: pickupFeeNumber,
          expressFee: expressFeeNumber,
          isPublic: true,
          setupComplete: true,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          isPublic: true,
          setupComplete: true,
        },
      });

      return updatedShop;
    });

    return res.json({
      message: "Shop setup completed successfully",
      shop: result,
    });
  } catch (error) {
    console.error("completeVendorShopSetup error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}