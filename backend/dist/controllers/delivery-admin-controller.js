import prisma from "../models/prisma.js";
function randomChars(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let output = "";
    for (let i = 0; i < length; i += 1) {
        output += chars[Math.floor(Math.random() * chars.length)];
    }
    return output;
}
export async function getDeliveryAdminStats(_req, res) {
    try {
        const [activeApprovedPartners, totalPartners, completedDeliveriesTotal,] = await Promise.all([
            prisma.user.count({
                where: { role: "DELIVERY", status: "ACTIVE" },
            }),
            prisma.user.count({ where: { role: "DELIVERY" } }),
            prisma.delivery.count({ where: { status: "DELIVERED" } }),
        ]);
        const partnersWithCompleted = await prisma.delivery.groupBy({
            by: ["riderUserId"],
            where: {
                status: "DELIVERED",
                riderUserId: { not: null },
            },
            _count: { _all: true },
        });
        const partnersCompletedAtLeastOne = partnersWithCompleted.length;
        return res.json({
            stats: {
                pendingRegistrations: 0,
                activeApprovedPartners,
                rejectedPartners: 0,
                totalPartners,
                completedDeliveriesTotal,
                partnersWithCompletedDeliveries: partnersCompletedAtLeastOne,
            },
        });
    }
    catch (error) {
        console.error("getDeliveryAdminStats error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function listDeliveryPartners(req, res) {
    try {
        const partners = await prisma.user.findMany({
            where: { role: "DELIVERY" },
            orderBy: { updatedAt: "desc" },
            take: 200,
        });
        const ids = partners.map((p) => p.id);
        const completedByRider = ids.length === 0
            ? []
            : await prisma.delivery.groupBy({
                by: ["riderUserId"],
                where: {
                    status: "DELIVERED",
                    riderUserId: { in: ids },
                },
                _count: { _all: true },
            });
        const completedMap = new Map(completedByRider.map((row) => [row.riderUserId, row._count._all]));
        const rows = partners.map((p) => ({
            id: p.id,
            vehicleType: "BIKE", // Default since it was removed from schema
            nidDocumentUrl: null,
            educationDocumentUrl: null,
            cvDocumentUrl: null,
            agentStatus: p.status,
            isActive: p.status === "ACTIVE",
            registrationStatus: "APPROVED",
            currentLat: p.lat,
            currentLng: p.lng,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            user: p,
            completedDeliveries: completedMap.get(p.id) ?? 0,
        }));
        return res.json({ partners: rows });
    }
    catch (error) {
        console.error("listDeliveryPartners error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function approveDeliveryPartner(req, res) {
    // Legacy function: RiderProfiles are no longer in schema. We just set user to active.
    try {
        const rawId = req.params.id;
        if (typeof rawId !== "string" || !rawId.trim()) {
            return res.status(400).json({ message: "Partner id is required" });
        }
        const partnerId = rawId.trim();
        const updated = await prisma.user.update({
            where: { id: partnerId },
            data: { status: "ACTIVE" },
        });
        return res.json({
            message: "Delivery partner activated",
            partner: updated,
        });
    }
    catch (error) {
        console.error("approveDeliveryPartner error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function rejectDeliveryPartner(req, res) {
    try {
        const rawId = req.params.id;
        if (typeof rawId !== "string" || !rawId.trim()) {
            return res.status(400).json({ message: "Partner id is required" });
        }
        const updated = await prisma.user.update({
            where: { id: rawId.trim() },
            data: { status: "SUSPENDED" },
        });
        return res.json({
            message: "Delivery partner suspended",
            partner: updated,
        });
    }
    catch (error) {
        console.error("rejectDeliveryPartner error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
//# sourceMappingURL=delivery-admin-controller.js.map