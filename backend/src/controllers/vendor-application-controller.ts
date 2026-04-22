import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../models/prisma.js";

function parseCsvList(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function generateUniqueUsername(base: string) {
  const normalized = slugify(base) || "vendor";
  let candidate = normalized;
  let counter = 1;

  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    candidate = `${normalized}_${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function createVendorApplication(req: Request, res: Response) {
  try {
    const {
      ownerName,
      businessEmail,
      phone,
      password,
      confirmPassword,
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
      businessEmail?: string;
      phone?: string;
      password?: string;
      confirmPassword?: string;
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

    if (
      !ownerName ||
      !businessEmail ||
      !phone ||
      !password ||
      !confirmPassword ||
      !shopName ||
      !address
    ) {
      return res.status(400).json({
        message:
          "ownerName, businessEmail, phone, password, confirmPassword, shopName, and address are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Password and confirmPassword do not match",
      });
    }

    const normalizedEmail = businessEmail.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "A user with this business email already exists",
      });
    }

    const existingApplication = await prisma.vendorApplication.findUnique({
      where: { businessEmail: normalizedEmail },
      select: { id: true, status: true },
    });

    if (existingApplication) {
      return res.status(409).json({
        message: "A vendor application with this business email already exists",
      });
    }

    const normalizedSpecialties = Array.isArray(specialties)
      ? specialties.map((s) => s.trim()).filter(Boolean)
      : parseCsvList(specialties);

    const usernameBase = normalizedEmail.split("@")[0] || shopName;
    const username = await generateUniqueUsername(usernameBase);
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
          name: ownerName.trim(),
          phone: phone.trim(),
          role: "CUSTOMER",
        },
        select: {
          id: true,
          username: true,
          email: true,
          name: true,
          phone: true,
          role: true,
        },
      });

      const application = await tx.vendorApplication.create({
        data: {
          userId: user.id,
          ownerName: ownerName.trim(),
          businessEmail: normalizedEmail,
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
          status: "PENDING",
        },
        select: {
          id: true,
          userId: true,
          ownerName: true,
          businessEmail: true,
          shopName: true,
          status: true,
          createdAt: true,
        },
      });

      return { user, application };
    });

    return res.status(201).json({
      message: "Vendor application submitted successfully",
      user: result.user,
      application: result.application,
    });
  } catch (error) {
    console.error("createVendorApplication error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
function slugifyShopName(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function generateUniqueShopSlug(base: string) {
  const normalized = slugifyShopName(base) || "shop";
  let candidate = normalized;
  let counter = 1;

  while (await prisma.shop.findUnique({ where: { slug: candidate } })) {
    candidate = `${normalized}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function listVendorApplications(_req: Request, res: Response) {
  try {
    const applications = await prisma.vendorApplication.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
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
        status: true,
        rejectionReason: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.json({ applications });
  } catch (error) {
    console.error("listVendorApplications error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function approveVendorApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const application = await prisma.vendorApplication.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    const existingShop = await prisma.shop.findFirst({
      where: { email: application.businessEmail },
      select: { id: true },
    });

    const result = await prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.vendorApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          rejectionReason: null,
          rejectedAt: null,
          rejectionVisibleUntil: null,
        },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { role: "VENDOR" },
      });

      if (!existingShop) {
        const slug = await generateUniqueShopSlug(application.shopName);

        await tx.shop.create({
          data: {
            name: application.shopName,
            slug,
            description: application.notes || null,
            address: application.address,
            city: application.city,
            area: application.area,
            phone: application.phone,
            email: application.businessEmail,
            categories: [
              ...(application.courierPickup ? ["COURIER_PICKUP" as const] : []),
              ...(application.inShopRepair ? ["IN_SHOP_REPAIR" as const] : []),
              ...(application.spareParts ? ["SPARE_PARTS" as const] : []),
            ],
            specialties: application.specialties,
            isActive: true,
          },
        });
      }

      return updatedApplication;
    });

    return res.json({
      message: "Vendor application approved successfully",
      application: result,
    });
  } catch (error) {
    console.error("approveVendorApplication error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function rejectVendorApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };

    const application = await prisma.vendorApplication.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    const updated = await prisma.vendorApplication.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionReason: reason?.trim() || "Application rejected by admin",
        rejectedAt: new Date(),
        rejectionVisibleUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return res.json({
      message: "Vendor application rejected successfully",
      application: updated,
    });
  } catch (error) {
    console.error("rejectVendorApplication error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateMyVendorApplication(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
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
      specialties?: string[] | string;
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      notes?: string;
    };

    const existing = await prisma.vendorApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    
    if (!existing) {
      return res.status(404).json({ message: "No vendor application found" });
    }
     if (existing.status === "APPROVED") {
      return res.status(400).json({
        message: "Approved vendor applications cannot be resubmitted from this form",
      }); }

    const normalizedSpecialties = Array.isArray(specialties)
      ? specialties.map((s) => s.trim()).filter(Boolean)
      : parseCsvList(specialties);

    const updated = await prisma.vendorApplication.update({
      where: { id: existing.id },
      data: {
        ownerName: ownerName?.trim() || existing.ownerName,
        businessEmail: businessEmail?.trim().toLowerCase() || existing.businessEmail,
        phone: phone?.trim() || existing.phone,
        shopName: shopName?.trim() || existing.shopName,
        tradeLicenseNo: tradeLicenseNo?.trim() || null,
        address: address?.trim() || existing.address,
        city: city?.trim() || null,
        area: area?.trim() || null,
        specialties: normalizedSpecialties.length ? normalizedSpecialties : existing.specialties,
        courierPickup: !!courierPickup,
        inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : existing.inShopRepair,
        spareParts: !!spareParts,
        notes: notes?.trim() || null,

        status: "PENDING",
        rejectionReason: null,
        rejectedAt: null,
        rejectionVisibleUntil: null,
      },
    });

    return res.json({
      message: "Vendor application updated and resubmitted successfully",
      application: updated,
    });
  } catch (error) {
    console.error("updateMyVendorApplication error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}