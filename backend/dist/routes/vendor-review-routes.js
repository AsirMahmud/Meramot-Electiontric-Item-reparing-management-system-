import { Router } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
const router = Router();
router.use(requireAuth, requireAdmin);
router.get("/vendors", async (_req, res) => {
    try {
        const applications = await prisma.vendorApplication.findMany({
            orderBy: { submittedAt: "desc" },
            include: {
                applicant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        phone: true,
                    },
                },
                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                shop: true,
            },
        });
        return res.json({
            success: true,
            data: applications,
        });
    }
    catch (error) {
        console.error("GET /vendors error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load vendor applications",
        });
    }
});
router.get("/vendors/pending", async (_req, res) => {
    try {
        const applications = await prisma.vendorApplication.findMany({
            where: { status: "PENDING" },
            orderBy: { submittedAt: "asc" },
            include: {
                applicant: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        phone: true,
                    },
                },
            },
        });
        return res.json({
            success: true,
            data: applications,
        });
    }
    catch (error) {
        console.error("GET /vendors/pending error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load pending vendors",
        });
    }
});
router.get("/vendors/:id", async (req, res) => {
    try {
        const application = await prisma.vendorApplication.findUnique({
            where: { id: req.params.id },
            include: {
                applicant: true,
                reviewedBy: true,
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
    }
    catch (error) {
        console.error("GET /vendors/:id error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load vendor application",
        });
    }
});
router.patch("/vendors/:id/approve", async (req, res) => {
    try {
        const application = await prisma.vendorApplication.findUnique({
            where: { id: req.params.id },
        });
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Vendor application not found",
            });
        }
        const result = await prisma.$transaction(async (tx) => {
            const shop = await tx.shop.create({
                data: {
                    ownerId: application.applicantUserId,
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
                        ...(application.courierPickup ? ["COURIER_PICKUP"] : []),
                        ...(application.inShopRepair ? ["IN_SHOP_REPAIR"] : []),
                        ...(application.spareParts ? ["SPARE_PARTS"] : []),
                    ],
                    specialties: application.specialties,
                    isActive: true,
                },
            });
            const updatedApplication = await tx.vendorApplication.update({
                where: { id: application.id },
                data: {
                    status: "APPROVED",
                    reviewedAt: new Date(),
                    reviewedById: req.user.id,
                    shopId: shop.id,
                    reviewNotes: req.body.reviewNotes || "Approved by admin",
                },
            });
            const updatedUser = await tx.user.update({
                where: { id: application.applicantUserId },
                data: {
                    role: "VENDOR",
                },
            });
            return { shop, updatedApplication, updatedUser };
        });
        return res.json({
            success: true,
            message: "Vendor approved successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("PATCH /vendors/:id/approve error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve vendor",
        });
    }
});
router.patch("/vendors/:id/reject", async (req, res) => {
    try {
        const application = await prisma.vendorApplication.update({
            where: { id: req.params.id },
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
    }
    catch (error) {
        console.error("PATCH /vendors/:id/reject error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject vendor",
        });
    }
});
router.patch("/vendors/:id/request-info", async (req, res) => {
    try {
        const application = await prisma.vendorApplication.update({
            where: { id: req.params.id },
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
    }
    catch (error) {
        console.error("PATCH /vendors/:id/request-info error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update vendor application",
        });
    }
});
router.patch("/vendors/:id/suspend", async (req, res) => {
    try {
        const application = await prisma.vendorApplication.findUnique({
            where: { id: req.params.id },
        });
        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Vendor application not found",
            });
        }
        const updated = await prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        console.error("PATCH /vendors/:id/suspend error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to suspend vendor",
        });
    }
});
export default router;
//# sourceMappingURL=vendor-review-routes.js.map