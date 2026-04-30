import { Router, Response } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { AuthedRequest } from "../middleware/auth.js";
import { currentAdminPasskey } from "../services/admin-passkey-service.js";

const router = Router();

router.use(requireAuth, requireAdmin);

// GET /api/admin/delivery/riders
router.get("/delivery/riders", async (req: AuthedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: "DELIVERY" },
      include: {
        riderProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const mappedRiders = users.map(u => {
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        status: u.status,
        createdAt: u.createdAt,
        registrationStatus: u.riderProfile?.registrationStatus ?? "PENDING",
        riderProfileId: u.riderProfile?.id ?? null,
      };
    });

    return res.json({
      success: true,
      data: mappedRiders,
    });
  } catch (error) {
    console.error("GET /admin/delivery-riders error:", error);
    return res.status(500).json({ success: false, message: "Failed to load delivery riders" });
  }
});

// POST /api/admin/delivery/riders/:userId/approve
router.post("/delivery/riders/:userId/approve", async (req: AuthedRequest, res: Response) => {
  try {
    const userId = String(req.params.userId);
    
    const user = await prisma.user.findUnique({
      where: { id: userId, role: "DELIVERY" },
      include: { riderProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Delivery user not found" });
    }

    if (user.riderProfile) {
      const updated = await prisma.riderProfile.update({
        where: { id: user.riderProfile.id },
        data: { registrationStatus: "APPROVED" },
      });
      return res.json({ success: true, data: updated });
    } else {
      const created = await prisma.riderProfile.create({
        data: {
          userId: user.id,
          registrationStatus: "APPROVED",
        },
      });
      return res.json({ success: true, data: created });
    }
  } catch (error) {
    console.error("POST /admin/delivery/riders/:userId/approve error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve delivery rider" });
  }
});

// POST /api/admin/delivery/riders/:userId/reject
router.post("/delivery/riders/:userId/reject", async (req: AuthedRequest, res: Response) => {
  try {
    const userId = String(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId, role: "DELIVERY" },
      include: { riderProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Delivery user not found" });
    }

    if (user.riderProfile) {
      const updated = await prisma.riderProfile.update({
        where: { id: user.riderProfile.id },
        data: { registrationStatus: "REJECTED" },
      });
      return res.json({ success: true, data: updated });
    } else {
      const created = await prisma.riderProfile.create({
        data: {
          userId: user.id,
          registrationStatus: "REJECTED",
        },
      });
      return res.json({ success: true, data: created });
    }
  } catch (error) {
    console.error("POST /admin/delivery/riders/:userId/reject error:", error);
    return res.status(500).json({ success: false, message: "Failed to reject delivery rider" });
  }
});

// DELETE /api/admin/delivery/riders/:userId
router.delete("/delivery/riders/:userId", async (req: AuthedRequest, res: Response) => {
  try {
    const passkey = req.headers["x-admin-passkey"];
    if (!passkey || passkey !== currentAdminPasskey) {
      return res.status(403).json({ success: false, message: "Invalid or expired admin passkey." });
    }

    const userId = String(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId, role: "DELIVERY" },
      include: { riderProfile: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "Delivery user not found" });
    }

    if (user.riderProfile) {
      await prisma.riderProfile.delete({
        where: { id: user.riderProfile.id }
      });
    }

    return res.json({ success: true, message: "Delivery partner registration deleted successfully" });
  } catch (error) {
    console.error("DELETE /admin/delivery/riders/:userId error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete delivery rider" });
  }
});

// GET /api/admin/delivery/stats
router.get("/delivery/stats", async (req: AuthedRequest, res: Response) => {
  try {
    // For now, return basic stats to satisfy the endpoint.
    // Additional logic can be added later if needed.
    const [totalRiders, pendingRiders, approvedRiders, rejectedRiders] = await Promise.all([
      prisma.user.count({ where: { role: "DELIVERY" } }),
      prisma.user.count({
        where: {
          role: "DELIVERY",
          OR: [
            { riderProfile: { registrationStatus: "PENDING" } },
            { riderProfile: null },
          ],
        },
      }),
      prisma.user.count({
        where: {
          role: "DELIVERY",
          riderProfile: { registrationStatus: "APPROVED" },
        },
      }),
      prisma.user.count({
        where: {
          role: "DELIVERY",
          riderProfile: { registrationStatus: "REJECTED" },
        },
      }),
    ]);

    return res.json({
      success: true,
      stats: {
        totalRiders,
        pendingRiders,
        approvedRiders,
        rejectedRiders,
      },
    });
  } catch (error) {
    console.error("GET /admin/delivery/stats error:", error);
    return res.status(500).json({ success: false, message: "Failed to load delivery stats" });
  }
});

export default router;
