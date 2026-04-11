import { Router } from "express";
import prisma from "../models/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";
import { requireAdmin } from "../middleware/require-admin.js";
const router = Router();
router.use(requireAuth, requireAdmin);
router.get("/dashboard", async (_req, res) => {
    try {
        const [totalUsers, totalVendors, totalDeliveryUsers, pendingVendorApplications, openTickets, activeDisputes, pendingRefunds,] = await Promise.all([
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
    }
    catch (error) {
        console.error("GET /admin/dashboard error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load dashboard",
        });
    }
});
router.get("/users", async (req, res) => {
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
                    role ? { role: role } : {},
                    status ? { status: status } : {},
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
    }
    catch (error) {
        console.error("GET /admin/users error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load users",
        });
    }
});
router.get("/users/:id", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.params.id },
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
    }
    catch (error) {
        console.error("GET /admin/users/:id error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load user",
        });
    }
});
export default router;
//# sourceMappingURL=admin-routes.js.map