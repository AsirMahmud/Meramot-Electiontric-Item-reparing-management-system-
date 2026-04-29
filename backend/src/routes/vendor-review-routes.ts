import { Router, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/vendors", async (_req: Request, res: Response) => {
  try {
    const applications = await prisma.vendorApplication.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        applicant: {
          select: { id: true, name: true, email: true, username: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        shop: true,
      },
    });

    return res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("GET /vendors error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load vendor applications",
    });
  }
});

router.get("/vendors/pending", async (_req: Request, res: Response) => {
  try {
    const applications = await prisma.vendorApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    return res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error("GET /vendors/pending error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load pending vendors",
    });
  }
});

router.get("/vendors/:id", async (req: Request, res: Response) => {
  try {
    const applicationId = String(req.params.id);

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      include: {
        applicant: {
          select: { id: true, name: true, email: true, username: true, phone: true },
        },
        reviewedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        shop: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Vendor application not found",
      });
    }

    return res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error("GET /vendors/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load vendor application",
    });
  }
});

router.patch("/vendors/:id/approve", async (req: Request & { user?: any }, res: Response) => {
  try {
    const applicationId = String(req.params.id);

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Vendor application not found",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the user by business email since applicantUserId is missing from schema
      const user = await tx.user.findUnique({
        where: { email: application.businessEmail }
      });

      // Create the shop
      const shop = await tx.shop.create({
        data: {
          name: application.shopName,
          slug: `${application.shopName}-${Date.now()}`
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
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
          vendorApplicationId: application.id
        },
      });

      // If user exists, upgrade them and make them owner
      if (user) {
        await tx.shopStaff.create({
          data: {
            shopId: shop.id,
            userId: user.id,
            role: "OWNER",
          }
        });

        await tx.user.update({
          where: { id: user.id },
          data: { role: "VENDOR" }
        });
      }

      const updatedApplication = await tx.vendorApplication.update({
        where: { id: application.id },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
          reviewedByAdmin: { connect: { id: req.user.id } },
          shop: { connect: { id: shop.id } },
        },
      });

      return { shop, updatedApplication };
    });

    return res.json({
      success: true,
      message: "Vendor approved successfully",
      data: result,
    });
  } catch (error) {
    console.error("PATCH /vendors/:id/approve error details:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve vendor",
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.patch("/vendors/:id/reject", async (req: Request & { user?: any }, res: Response) => {
  try {
    const applicationId = String(req.params.id);

    const existing = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor application not found",
      });
    }

    const application = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewNotes: req.body.reviewNotes || "Rejected by admin",
      },
    });

    return res.json({
      success: true,
      message: "Vendor rejected successfully",
      data: application,
    });
  } catch (error) {
    console.error("PATCH /vendors/:id/reject error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject vendor",
    });
  }
});

router.patch("/vendors/:id/request-info", async (req: Request & { user?: any }, res: Response) => {
  try {
    const applicationId = String(req.params.id);

    const existing = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Vendor application not found",
      });
    }

    const application = await prisma.vendorApplication.update({
      where: { id: applicationId },
      data: {
        status: "MORE_INFO_REQUIRED",
        reviewedAt: new Date(),
        reviewedById: req.user.id,
        reviewNotes: req.body.reviewNotes || "More information requested",
      },
    });

    return res.json({
      success: true,
      message: "Requested more information from vendor",
      data: application,
    });
  } catch (error) {
    console.error("PATCH /vendors/:id/request-info error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update vendor application",
    });
  }
});

router.patch("/vendors/:id/suspend", async (req: Request & { user?: any }, res: Response) => {
  try {
    const applicationId = String(req.params.id);

    const application = await prisma.vendorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Vendor application not found",
      });
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.vendorApplication.update({
        where: { id: application.id },
        data: {
          status: "SUSPENDED",
          reviewedAt: new Date(),
          reviewedById: req.user.id,
          reviewNotes: req.body.reviewNotes || "Vendor suspended by admin",
        },
      });

      const user = await tx.user.update({
        where: { id: application.applicantUserId },
        data: {
          status: "SUSPENDED",
        },
      });

      return user;
    });

    return res.json({
      success: true,
      message: "Vendor suspended successfully",
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /vendors/:id/suspend error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to suspend vendor",
    });
  }
});

export default router;