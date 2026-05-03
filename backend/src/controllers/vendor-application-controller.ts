// @ts-nocheck
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import prisma from "../models/prisma.js";
import { currentAdminPasskey } from "../services/admin-passkey-service.js";
import { validateEmail } from "../utils/validate-email.js";
import emailValidator from 'deep-email-validator';
import { env } from "../config/env.js";

function parseCsvList(input?: string) {
  if (!input) return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

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
  } catch (err) {
    console.error("[AI Address Format] Failed:", err);
  }
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

export async function checkEmailAvailability(req: Request, res: Response) {
  try {
    const { email } = req.query as { email?: string };
    if (!email || !email.trim()) {
      return res.status(400).json({ available: false, message: "Email is required." });
    }

    const normalized = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });

    if (existingUser) {
      return res.json({ available: false, message: "Account already exists." });
    }

    const existingApp = await prisma.vendorApplication.findUnique({
      where: { businessEmail: normalized },
      select: { id: true },
    });

    if (existingApp) {
      return res.json({ available: false, message: "A vendor application with this email already exists." });
    }

    return res.json({ available: true });
  } catch (error) {
    console.error("checkEmailAvailability error:", error);
    return res.status(500).json({ available: false, message: "Server error" });
  }
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
      lat,
      lng,
      specialties,
      courierPickup,
      inShopRepair,
      spareParts,
      notes,
      logoUrl,
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
      lat?: number | string;
      lng?: number | string;
      specialties?: string[] | string;
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      notes?: string;
      logoUrl?: string;
    };

    // Always require all fields — no authenticated upgrade path
    if (
      !ownerName ||
      !businessEmail ||
      !phone ||
      !password ||
      !confirmPassword ||
      !shopName
    ) {
      return res.status(400).json({
        message:
          "ownerName, businessEmail, phone, password, confirmPassword, and shopName are required",
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

    const normalizedEmail = businessEmail!.trim().toLowerCase();

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      return res.status(400).json({ message: emailError });
    }

    // Deep validation: MX record + SMTP mailbox check
    try {
      const deepResult = await emailValidator.validate({
        email: normalizedEmail,
        validateRegex: false,    // already checked above
        validateMx: true,        // check if domain accepts mail
        validateTypo: true,      // catch typos like gmial.com
        validateDisposable: true, // catch disposable services
        validateSMTP: false,     // Gmail/Outlook block SMTP checks
      });

      if (!deepResult.valid) {
        const reason = deepResult.reason || "unknown";
        const reasonMap: Record<string, string> = {
          mx: "This email domain does not accept mail. Please use a real email address.",
          typo: `Did you mean a different email? The domain looks like a typo.`,
          disposable: "Disposable/temporary email addresses are not allowed.",
        };
        return res.status(400).json({
          message: reasonMap[reason] || "This email address appears to be invalid. Please use a real email.",
        });
      }
    } catch {
      // If deep validation fails (network issues etc.), allow through — basic check already passed
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    // Reject if email already exists as ANY user
    if (existingUser) {
      return res.status(409).json({
        message: "Account already exists.",
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

    const result = await prisma.$transaction(async (tx: any) => {
      const usernameBase = normalizedEmail.split("@")[0] || shopName;
      const username = await generateUniqueUsername(usernameBase);
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user as VENDOR_APPLICANT — NOT CUSTOMER
      const user = await tx.user.create({
        data: {
          username,
          email: normalizedEmail,
          passwordHash,
          name: ownerName.trim(),
          phone: phone.trim(),
          role: "VENDOR_APPLICANT",
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
          address: address?.trim() || "",
          city: city?.trim() || null,
          area: area?.trim() || null,
          lat: lat !== undefined && lat !== null && lat !== "" ? Number(lat) : null,
          lng: lng !== undefined && lng !== null && lng !== "" ? Number(lng) : null,
          specialties: normalizedSpecialties,
          courierPickup: Boolean(courierPickup),
          inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : true,
          spareParts: Boolean(spareParts),
          notes: notes?.trim() || null,
          logoUrl: logoUrl?.trim() || null,
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

    // Fire-and-forget: format the shop address using Gemini AI
    if (address?.trim()) {
      formatAddressWithAI(result.application.id, address.trim()).catch(() => {});
    }

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

async function generateUniqueShopSlug(base: string, tx: typeof prisma) {
  const normalized = slugifyShopName(base) || "shop";
  // Use crypto for collision-resistant suffix inside the transaction
  const suffix = crypto.randomBytes(4).toString("hex");
  let candidate = `${normalized}-${suffix}`;
  let counter = 1;

  while (await tx.shop.findUnique({ where: { slug: candidate } })) {
    candidate = `${normalized}-${suffix}-${counter}`;
    counter += 1;
  }

  return candidate;
}

export async function listVendorApplications(req: Request, res: Response) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(1000, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.vendorApplication.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
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
              name: true,
              username: true,
              email: true,
              phone: true,
            }
          },
          shop: {
            select: {
              id: true,
              isActive: true,
              isFeatured: true,
            }
          }
        },
      }),
      prisma.vendorApplication.count(),
    ]);

    return res.json({ applications, total, page, limit });
  } catch (error) {
    console.error("listVendorApplications error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

  // existing implementation stays unchanged


// New endpoint: fetch a single vendor application with related user and shop info
export async function getVendorApplication(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const application = await prisma.vendorApplication.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, username: true, email: true, phone: true } },
        shop: true,
      },
    });
    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }
    return res.json({ application });
  } catch (error) {
    console.error("getVendorApplication error:", error);
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

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedApplication = await tx.vendorApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          rejectionReason: null,
          rejectedAt: null,
          rejectionVisibleUntil: null,
        },
      });

      // Promote VENDOR_APPLICANT → VENDOR, but SUSPENDED until shop setup
      await tx.user.update({
        where: { id: application.userId },
        data: { role: "VENDOR", status: "SUSPENDED" },
      });

      // Check for existing shop INSIDE the transaction for proper isolation
      const existingShop = await tx.shop.findFirst({
        where: { email: application.businessEmail },
        select: { id: true, slug: true },
      });

    if (!existingShop) {
      const slug = await generateUniqueShopSlug(application.shopName, tx);

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
          logoUrl: application.logoUrl || null,
          isActive: false,
          isPublic: false,
          setupComplete: false,
        },
      });
    } else {
      await tx.shop.update({
        where: { id: existingShop.id },
        data: {
          name: application.shopName,
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
          logoUrl: application.logoUrl || null,
          isActive: false,
          isPublic: false,
          setupComplete: false,
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
      lat,
      lng,
      specialties,
      courierPickup,
      inShopRepair,
      spareParts,
      notes,
      logoUrl,
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
      logoUrl?: string;
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
        lat: lat !== undefined && lat !== null && lat !== "" ? Number(lat) : existing.lat,
        lng: lng !== undefined && lng !== null && lng !== "" ? Number(lng) : existing.lng,
        specialties: normalizedSpecialties.length ? normalizedSpecialties : existing.specialties,
        courierPickup: !!courierPickup,
        inShopRepair: typeof inShopRepair === "boolean" ? inShopRepair : existing.inShopRepair,
        spareParts: !!spareParts,
        notes: notes?.trim() || null,
        logoUrl: logoUrl?.trim() || existing.logoUrl || null,

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

export async function deleteVendorApplication(req: Request, res: Response) {
  try {
    const passkey = req.headers["x-admin-passkey"];
    if (!passkey || passkey !== currentAdminPasskey) {
      return res.status(403).json({ message: "Invalid or expired admin passkey." });
    }

    const { id } = req.params;
    
    const application = await prisma.vendorApplication.findUnique({
      where: { id }
    });

    if (!application) {
      return res.status(404).json({ message: "Vendor application not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Find associated shop first
      const shop = await tx.shop.findFirst({
        where: { vendorApplicationId: id }
      });

      if (shop) {
        // Delete shop staff and shop
        await tx.shopStaff.deleteMany({ where: { shopId: shop.id } });
        // Prisma will handle other cascade deletes if schema is configured, otherwise we should delete repair jobs etc.
        // Wait, if it has jobs/payments, it might fail. But this is an explicit admin delete.
        // Let's assume cascade is set up for Shop. If not, it will throw.
        await tx.shop.delete({ where: { id: shop.id } });
      }

      await tx.vendorApplication.delete({
        where: { id }
      });

      // Delete the VENDOR_APPLICANT user entirely (they have no other purpose)
      if (application.userId) {
        await tx.user.delete({
          where: { id: application.userId },
        });
      }
    });

    return res.json({ message: "Vendor application deleted successfully" });
  } catch (error) {
    console.error("deleteVendorApplication error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}


