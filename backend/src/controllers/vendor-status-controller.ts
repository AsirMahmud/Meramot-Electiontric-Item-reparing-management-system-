import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import { env } from "../config/env.js";
import { sendVendorWelcomeNotification } from "../services/vendor-onboarding-notify.js";

/**
 * Fire-and-forget: ask Gemini 2.5 Flash Lite to format a shop address
 * into a clean, professional Bangladeshi address string, then persist it.
 */
async function formatAddressWithAI(applicationId: string, rawAddress: string) {
  if (!env.geminiApiKey || !rawAddress.trim()) return;

  try {
    const prompt = `You are an address formatter for Bangladesh. Given this raw shop address, return ONLY a single clean, properly formatted address string (in English). Fix spelling, add proper punctuation, capitalise place names, and include city/area if present. Do NOT add fictional details. If the input is too vague to improve, return it as-is.\n\nRaw address: ${rawAddress}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${env.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    if (!response.ok) return;

    const data = await response.json();
    const formatted = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!formatted || formatted.length < 3) return;

    await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: { address: formatted },
    });

    // Also update the Shop record if it exists
    const app = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: { shop: { select: { id: true } } },
    });
    if (app?.shop?.id) {
      await prisma.shop.update({
        where: { id: app.shop.id },
        data: { address: formatted },
      });
    }
  } catch (err) {
    console.error("[AI Address Format] Failed:", err);
  }
}

type AuthPayload = {
  sub: string;
  role?: string;
};

type AuthenticatedVendorUser = {
  id: string;
  role: string;
};

function extractBearerToken(header?: string) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function requireVendorUser(
  req: Request,
  res: Response
): Promise<AuthenticatedVendorUser | null> {
  const token = extractBearerToken(req.headers.authorization);

  if (!token) {
    res.status(401).json({ message: "Missing authorization token" });
    return null;
  }

  let payload: AuthPayload;

  try {
    payload = jwt.verify(token, env.jwtSecret) as AuthPayload;
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
    return null;
  }

  if (!payload?.sub) {
    res.status(401).json({ message: "Invalid or expired token" });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return null;
  }

  if (user.role !== "VENDOR") {
    res.status(403).json({ message: "Only vendors can access this resource" });
    return null;
  }

  return user;
}

function parseCsvList(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getVendorApplicationStatus(req: Request, res: Response) {
  try {
    const user = await requireVendorUser(req, res);

    if (!user) {
      return;
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
        lat: true,
        lng: true,
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
      where: {
        OR: [
          { vendorApplicationId: application.id },
          ...(application.businessEmail ? [{ email: application.businessEmail }] : []),
        ],
      },
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

export async function updateVendorApplicationStatus(req: Request, res: Response) {
  try {
    const user = await requireVendorUser(req, res);

    if (!user) {
      return;
    }

    const existing = await prisma.vendorApplication.findUnique({
      where: { userId: user.id },
      select: {
        id: true,
        status: true,
        businessEmail: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    if (existing.status === "APPROVED") {
      return res.status(400).json({
        message:
          "Approved vendors must update their public shop details from shop setup or dashboard tools.",
      });
    }

    const {
      ownerName,
      businessEmail,
      phone,
      shopName,
      tradeLicenseNo,
      address,
      city,
      area,
      lat,
      lng,
      specialties,
      courierPickup,
      inShopRepair,
      spareParts,
      notes,
    } = req.body as {
      ownerName?: string;
      businessEmail?: string;
      phone?: string;
      shopName?: string;
      tradeLicenseNo?: string;
      address?: string;
      city?: string;
      area?: string;
      lat?: number | string;
      lng?: number | string;
      specialties?: string[] | string;
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      notes?: string;
    };

    const normalizedOwnerName = ownerName?.trim() || "";
    const normalizedBusinessEmail = businessEmail?.trim().toLowerCase() || "";
    const normalizedPhone = phone?.trim() || "";
    const normalizedShopName = shopName?.trim() || "";
    const normalizedAddress = address?.trim() || "";
    const normalizedTradeLicenseNo = tradeLicenseNo?.trim() || null;
    const normalizedCity = city?.trim() || null;
    const normalizedArea = area?.trim() || null;
    const normalizedNotes = notes?.trim() || null;

    if (
      !normalizedOwnerName ||
      !normalizedBusinessEmail ||
      !normalizedPhone ||
      !normalizedShopName
    ) {
      return res.status(400).json({
        message:
          "ownerName, businessEmail, phone, and shopName are required",
      });
    }

    const normalizedSpecialties = Array.isArray(specialties)
      ? specialties.map((item) => item.trim()).filter(Boolean)
      : parseCsvList(specialties);

    const [existingUserWithEmail, existingApplicationWithEmail] = await Promise.all([
      prisma.user.findFirst({
        where: {
          email: normalizedBusinessEmail,
          NOT: { id: user.id },
        },
        select: { id: true },
      }),
      prisma.vendorApplication.findFirst({
        where: {
          businessEmail: normalizedBusinessEmail,
          NOT: { userId: user.id },
        },
        select: { id: true },
      }),
    ]);

    if (existingUserWithEmail || existingApplicationWithEmail) {
      return res.status(409).json({
        message: "That business email is already in use by another account.",
      });
    }

    const existingShop = await prisma.shop.findFirst({
      where: {
        OR: [
          { vendorApplicationId: existing.id },
          ...(existing.businessEmail ? [{ email: existing.businessEmail }] : []),
        ],
      },
      select: { id: true },
    });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: normalizedOwnerName,
          email: normalizedBusinessEmail,
          phone: normalizedPhone,
        },
      });

      if (existingShop) {
        await tx.shop.update({
          where: { id: existingShop.id },
          data: { email: normalizedBusinessEmail },
        });
      }

      return tx.vendorApplication.update({
        where: { userId: user.id },
        data: {
          ownerName: normalizedOwnerName,
          businessEmail: normalizedBusinessEmail,
          phone: normalizedPhone,
          shopName: normalizedShopName,
          tradeLicenseNo: normalizedTradeLicenseNo,
          address: normalizedAddress,
          city: normalizedCity,
          area: normalizedArea,
          lat: lat !== undefined && lat !== null && lat !== "" ? Number(lat) : undefined,
          lng: lng !== undefined && lng !== null && lng !== "" ? Number(lng) : undefined,
          specialties: normalizedSpecialties,
          courierPickup: Boolean(courierPickup),
          inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : true,
          spareParts: Boolean(spareParts),
          notes: normalizedNotes,
          status: "PENDING",
          rejectionReason: null,
          rejectedAt: null,
          rejectionVisibleUntil: null,
        },
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
    });

    // Fire-and-forget: format the shop address using Gemini AI
    if (normalizedAddress) {
      formatAddressWithAI(updated.id, normalizedAddress).catch(() => {});
    }

    return res.json({
      message:
        existing.status === "REJECTED"
          ? "Vendor application updated and resubmitted for review"
          : "Vendor application updated successfully",
      application: updated,
    });
  } catch (error) {
    console.error("updateVendorApplicationStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function completeVendorShopSetup(req: Request, res: Response) {
  try {
    const user = await requireVendorUser(req, res);

    if (!user) {
      return;
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
      lat,
      lng,
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
      lat?: number | string;
      lng?: number | string;
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
      ...(courierPickup ? (["COURIER_PICKUP"] as const) : []),
      ...(inShopRepair ? (["IN_SHOP_REPAIR"] as const) : []),
      ...(spareParts ? (["SPARE_PARTS"] as const) : []),
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

    const latNumber =
      lat === "" || lat === undefined || lat === null ? null : Number(lat);

    const lngNumber =
      lng === "" || lng === undefined || lng === null ? null : Number(lng);

    if (
      (inspectionFeeNumber !== null && (Number.isNaN(inspectionFeeNumber) || inspectionFeeNumber < 0)) ||
      (baseLaborFeeNumber !== null && (Number.isNaN(baseLaborFeeNumber) || baseLaborFeeNumber < 0)) ||
      (pickupFeeNumber !== null && (Number.isNaN(pickupFeeNumber) || pickupFeeNumber < 0)) ||
      (expressFeeNumber !== null && (Number.isNaN(expressFeeNumber) || expressFeeNumber < 0))
    ) {
      return res.status(400).json({
        message: "Pricing fields must be valid non-negative numbers",
      });
    }

    if (inspectionFeeNumber === null || baseLaborFeeNumber === null) {
      return res.status(400).json({
        message: "inspectionFee and baseLaborFee are required",
      });
    }

    const existingShop = await prisma.shop.findFirst({
      where: {
        OR: [
          { vendorApplicationId: application.id },
          ...(application.businessEmail ? [{ email: application.businessEmail }] : []),
        ],
      },
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
          lat: latNumber,
          lng: lngNumber,
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
          lat: latNumber,
          lng: lngNumber,
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

    // Fire-and-forget: notify vendor about matching BIDDING requests
    sendVendorWelcomeNotification(user.id).catch((err) =>
      console.error("[VendorSetup] Notification failed:", err),
    );

    return res.json({
      message: "Shop setup completed successfully",
      shop: result,
    });
  } catch (error) {
    console.error("completeVendorShopSetup error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateVendorNotificationPreferences(req: Request, res: Response) {
  try {
    const user = await requireVendorUser(req, res);
    if (!user) return;

    const application = await prisma.vendorApplication.findUnique({
      where: { userId: user.id },
      select: { id: true, businessEmail: true },
    });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        OR: [
          { vendorApplicationId: application.id },
          ...(application.businessEmail ? [{ email: application.businessEmail }] : []),
        ],
      },
      select: { id: true },
    });

    if (!shop) {
      return res.status(404).json({ message: "Vendor shop not found" });
    }

    const { liveNotificationsEnabled, liveNotificationsPrompted } = req.body;
    
    const updateData: any = {};
    if (typeof liveNotificationsEnabled === "boolean") {
      updateData.liveNotificationsEnabled = liveNotificationsEnabled;
    }
    if (typeof liveNotificationsPrompted === "boolean") {
      updateData.liveNotificationsPrompted = liveNotificationsPrompted;
    }

    const updatedShop = await prisma.shop.update({
      where: { id: shop.id },
      data: updateData,
    });

    return res.json({
      message: "Notification preferences updated",
      liveNotificationsEnabled: updatedShop.liveNotificationsEnabled,
      liveNotificationsPrompted: updatedShop.liveNotificationsPrompted,
    });
  } catch (error) {
    console.error("updateVendorNotificationPreferences error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
