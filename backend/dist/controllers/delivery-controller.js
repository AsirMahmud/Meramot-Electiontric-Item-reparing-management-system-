import { DeliveryStatus } from "@prisma/client";
import prisma from "../models/prisma.js";
function parseDeliveryStatusQuery(raw) {
    if (typeof raw !== "string" || !raw.trim())
        return undefined;
    const v = raw.trim();
    return Object.values(DeliveryStatus).includes(v) ? v : undefined;
}
export async function getDeliveryMe(req, res) {
    try {
        const riderProfileId = req.deliveryAuth?.riderProfileId;
        if (!riderProfileId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const rider = await prisma.riderProfile.findUnique({
            where: { id: riderProfileId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        phone: true,
                        role: true,
                        status: true,
                        avatarUrl: true,
                    },
                },
                coverageZones: {
                    include: { coverageZone: true },
                },
            },
        });
        if (!rider) {
            return res.status(404).json({ message: "Rider profile not found" });
        }
        return res.json({ riderProfile: rider });
    }
    catch (error) {
        console.error("getDeliveryMe error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function listMyDeliveries(req, res) {
    try {
        const riderProfileId = req.deliveryAuth?.riderProfileId;
        if (!riderProfileId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const statusFilter = parseDeliveryStatusQuery(req.query.status);
        if (typeof req.query.status === "string" && req.query.status.trim() && !statusFilter) {
            return res.status(400).json({ message: "Invalid status filter" });
        }
        const deliveries = await prisma.delivery.findMany({
            where: {
                ...(statusFilter ? { status: statusFilter } : {}),
            },
            include: {
                repairJob: {
                    include: {
                        repairRequest: {
                            select: {
                                id: true,
                                title: true,
                                deviceType: true,
                                status: true,
                                contactPhone: true,
                            },
                        },
                        shop: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                address: true,
                            },
                        },
                    },
                },
                coverageZone: true,
            },
            orderBy: { updatedAt: "desc" },
        });
        return res.json({ deliveries });
    }
    catch (error) {
        console.error("listMyDeliveries error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function acceptMyDelivery(req, res) {
    try {
        const riderProfileId = req.deliveryAuth?.riderProfileId;
        if (!riderProfileId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const rawDeliveryId = req.params.id;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const rider = await prisma.riderProfile.findUnique({
            where: { id: riderProfileId },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
        });
        if (!rider) {
            return res.status(404).json({ message: "Rider profile not found" });
        }
        const existing = await prisma.delivery.findUnique({
            where: { id: deliveryId },
            select: { id: true, deliveryAgentId: true, status: true },
        });
        if (!existing) {
            return res.status(404).json({ message: "Delivery not found" });
        }
        if (existing.deliveryAgentId && existing.deliveryAgentId !== riderProfileId) {
            return res.status(409).json({ message: "This order is already accepted by another rider" });
        }
        if (["DELIVERED", "FAILED", "CANCELLED"].includes(existing.status)) {
            return res.status(400).json({ message: "Finalized delivery cannot be accepted" });
        }
        const now = new Date();
        const updated = await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
                deliveryAgentId: riderProfileId,
                riderName: rider.user.name ?? null,
                riderPhone: rider.user.phone ?? null,
                ...(existing.status === "PENDING" ? { status: "SCHEDULED", scheduledAt: now } : {}),
            },
            include: {
                repairJob: {
                    include: {
                        repairRequest: {
                            select: {
                                id: true,
                                title: true,
                                deviceType: true,
                                status: true,
                                contactPhone: true,
                            },
                        },
                        shop: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                address: true,
                            },
                        },
                    },
                },
                coverageZone: true,
            },
        });
        return res.json({ delivery: updated });
    }
    catch (error) {
        console.error("acceptMyDelivery error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function updateLocation(req, res) {
    try {
        const riderProfileId = req.deliveryAuth?.riderProfileId;
        if (!riderProfileId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const { lat, lng } = req.body;
        if (typeof lat !== "number" || typeof lng !== "number") {
            return res.status(400).json({ message: "lat and lng must be numbers" });
        }
        const updated = await prisma.riderProfile.update({
            where: { id: riderProfileId },
            data: { currentLat: lat, currentLng: lng },
            select: {
                id: true,
                currentLat: true,
                currentLng: true,
                updatedAt: true,
            },
        });
        return res.json({ riderProfile: updated });
    }
    catch (error) {
        console.error("updateLocation error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
function parseDeliveryStatusBody(raw) {
    if (typeof raw !== "string" || !raw.trim())
        return undefined;
    const v = raw.trim();
    return Object.values(DeliveryStatus).includes(v) ? v : undefined;
}
export async function updateMyDeliveryStatus(req, res) {
    try {
        const riderProfileId = req.deliveryAuth?.riderProfileId;
        if (!riderProfileId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const rawDeliveryId = req.params.id;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const status = parseDeliveryStatusBody(req.body.status);
        if (!status) {
            return res.status(400).json({ message: "Valid delivery status is required" });
        }
        const existing = await prisma.delivery.findFirst({
            where: { id: deliveryId, deliveryAgentId: riderProfileId },
            select: { id: true },
        });
        if (!existing) {
            return res.status(404).json({ message: "Delivery not found for this rider" });
        }
        const now = new Date();
        const updated = await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
                status,
                ...(status === "DISPATCHED" ? { dispatchedAt: now } : {}),
                ...(status === "PICKED_UP" ? { pickedUpAt: now } : {}),
                ...(status === "DELIVERED" ? { deliveredAt: now } : {}),
            },
            include: {
                repairJob: {
                    include: {
                        repairRequest: {
                            select: {
                                id: true,
                                title: true,
                                deviceType: true,
                                status: true,
                                contactPhone: true,
                            },
                        },
                        shop: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                address: true,
                            },
                        },
                    },
                },
                coverageZone: true,
            },
        });
        return res.json({ delivery: updated });
    }
    catch (error) {
        console.error("updateMyDeliveryStatus error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
//# sourceMappingURL=delivery-controller.js.map