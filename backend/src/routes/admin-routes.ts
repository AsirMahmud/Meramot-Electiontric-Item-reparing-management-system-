import { Router, Request, Response } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/dashboard", async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalVendors,
      totalDeliveryUsers,
      pendingVendorApplications,
      openTickets,
      activeDisputes,
      pendingRefunds,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "VENDOR" } }),
      prisma.user.count({ where: { role: "DELIVERY" } }),
      prisma.vendorApplication.count({ where: { status: "PENDING" } }),
      prisma.supportTicket.count({
        where: { status: { in: ["OPEN", "IN_PROGRESS", "ESCALATED"] } },
      }),
      prisma.disputeCase.count({
        where: {
          status: {
            in: ["OPEN", "INVESTIGATING", "WAITING_EVIDENCE", "WAITING_RESPONSE"],
          },
        },
      }),
      prisma.refund.count({
        where: { status: "PENDING" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalUsers,
        totalVendors,
        totalDeliveryUsers,
        pendingVendorApplications,
        openTickets,
        activeDisputes,
        pendingRefunds,
      },
    });
  } catch (error) {
    console.error("GET /admin/dashboard error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
});

router.get("/users", async (req: Request, res: Response) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();
    const status = String(req.query.status || "").trim();

    const users = await prisma.user.findMany({
      where: {
        AND: [
          search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { username: { contains: search, mode: "insensitive" } },
                  { email: { contains: search, mode: "insensitive" } },
                  { phone: { contains: search, mode: "insensitive" } },
                ],
              }
            : {},
          role ? { role: role as any } : {},
          status ? { status: status as any } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("GET /admin/users error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        supportTickets: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        repairRequests: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("GET /admin/users/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user",
    });
  }
});

// ─── User Moderation ──────────────────────────────────────────────────────────
// PATCH /api/admin/users/:id/status
// Body: { status: "ACTIVE" | "SUSPENDED" | "DELETED" }
// Ban, suspend, restore, or soft-delete any user account.
router.patch("/users/:id/status", async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.id);
    const { status } = req.body as { status?: string };

    const allowed = ["ACTIVE", "SUSPENDED", "DELETED"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(", ")}`,
      });
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { status: status as any },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        status: true,
        updatedAt: true,
      },
    });

    return res.json({
      success: true,
      message: `User status updated to ${status}`,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /admin/users/:id/status error:", error);
    return res.status(500).json({ success: false, message: "Failed to update user status" });
  }
});

// ─── Review Moderation ────────────────────────────────────────────────────────
// GET /api/admin/reviews
// Query params: shopId, userId, minScore, maxScore, page, take
// Lists all reviews platform-wide with optional filters.
router.get("/reviews", async (req: Request, res: Response) => {
  try {
    const shopId = String(req.query.shopId || "").trim();
    const userId = String(req.query.userId || "").trim();
    const minScore = req.query.minScore ? Number(req.query.minScore) : undefined;
    const maxScore = req.query.maxScore ? Number(req.query.maxScore) : undefined;
    const take = Math.min(100, Math.max(1, Number(req.query.take || 25)));
    const page = Math.max(1, Number(req.query.page || 1));
    const skip = (page - 1) * take;

    const where: Record<string, unknown> = {};
    if (shopId) where.shopId = shopId;
    if (userId) where.userId = userId;
    if (minScore !== undefined || maxScore !== undefined) {
      where.score = {
        ...(minScore !== undefined ? { gte: minScore } : {}),
        ...(maxScore !== undefined ? { lte: maxScore } : {}),
      };
    }

    const [reviews, total] = await Promise.all([
      prisma.rating.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          score: true,
          review: true,
          createdAt: true,
          user: { select: { id: true, name: true, username: true, email: true } },
          shop: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.rating.count({ where }),
    ]);

    return res.json({
      success: true,
      data: reviews,
      meta: {
        page,
        take,
        total,
        totalPages: Math.max(Math.ceil(total / take), 1),
      },
    });
  } catch (error) {
    console.error("GET /admin/reviews error:", error);
    return res.status(500).json({ success: false, message: "Failed to load reviews" });
  }
});

// DELETE /api/admin/reviews/:id
// Removes an inappropriate review and recalculates the shop's rating average.
router.delete("/reviews/:id", async (req: Request, res: Response) => {
  try {
    const reviewId = String(req.params.id);

    const existing = await prisma.rating.findUnique({
      where: { id: reviewId },
      select: { id: true, shopId: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.rating.delete({ where: { id: reviewId } });

      // Recalculate shop rating after deletion
      const aggregate = await tx.rating.aggregate({
        where: { shopId: existing.shopId },
        _avg: { score: true },
        _count: { score: true },
      });

      await tx.shop.update({
        where: { id: existing.shopId },
        data: {
          ratingAvg: aggregate._avg.score ?? 0,
          reviewCount: aggregate._count.score,
        },
      });
    });

    return res.json({
      success: true,
      message: "Review removed and shop rating recalculated",
    });
  } catch (error) {
    console.error("DELETE /admin/reviews/:id error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete review" });
  }
});

// ─── Shop Suspension ──────────────────────────────────────────────────────────
// PATCH /api/admin/shops/:id/active
// Body: { isActive: boolean, reason?: string }
// Activates or deactivates a shop (suspend low-rated or fraudulent shops).
router.patch("/shops/:id/active", async (req: Request, res: Response) => {
  try {
    const shopId = String(req.params.id);
    const { isActive, reason } = req.body as { isActive?: unknown; reason?: string };

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean (true to reinstate, false to suspend)",
      });
    }

    const existing = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { id: true, name: true, isActive: true },
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: "Shop not found" });
    }

    const updated = await prisma.shop.update({
      where: { id: shopId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        ratingAvg: true,
        reviewCount: true,
        updatedAt: true,
      },
    });

    const action = isActive ? "reinstated" : "suspended";
    return res.json({
      success: true,
      message: `Shop ${action} successfully${reason ? `: ${reason}` : ""}`,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /admin/shops/:id/active error:", error);
    return res.status(500).json({ success: false, message: "Failed to update shop status" });
  }
});

export default router;