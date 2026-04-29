// @ts-nocheck
import { DeliveryPartnerApprovalStatus, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import prisma from "../models/prisma.js";
import { sendDeliveryCredentialsEmail } from "../services/delivery-credentials-email-service.js";
function randomChars(length) {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let output = "";
    for (let i = 0; i < length; i += 1) {
        output += chars[Math.floor(Math.random() * chars.length)];
    }
    return output;
}
async function generateUniqueUsername(tx, baseName) {
    const normalizedBase = baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 12) || "delivery";
    for (let i = 0; i < 8; i += 1) {
        const candidate = `${normalizedBase}${randomChars(4)}`;
        const existing = await tx.user.findUnique({
            where: { username: candidate },
            select: { id: true },
        });
        if (!existing)
            return candidate;
    }
    return `${normalizedBase}${Date.now().toString(36).slice(-4)}`;
}
function generatePassword() {
    return `DM-${randomChars(4)}-${randomChars(4)}-${Math.floor(100 + Math.random() * 900)}`;
}
function parseRegistrationFilter(raw) {
    if (typeof raw !== "string" || !raw.trim())
        return undefined;
    const v = raw.trim();
    return Object.values(DeliveryPartnerApprovalStatus).includes(v) ? v : undefined;
}
export async function getDeliveryAdminStats(_req, res) {
    try {
        const partnerUser = { user: { role: "DELIVERY" } };
        const [pendingRegistrations, activeApprovedPartners, rejectedPartners, totalPartners, completedDeliveriesTotal,] = await Promise.all([
            prisma.riderName.count({ where: { ...partnerUser, registrationStatus: "PENDING" } }),
            prisma.riderName.count({
                where: { ...partnerUser, registrationStatus: "APPROVED", isActive: true },
            }),
            prisma.riderName.count({ where: { ...partnerUser, registrationStatus: "REJECTED" } }),
            prisma.riderName.count({ where: partnerUser }),
            prisma.delivery.count({ where: { status: "DELIVERED" } }),
        ]);
        const partnersWithCompleted = await prisma.delivery.groupBy({
            by: ["riderName"],
            where: {
                status: "DELIVERED",
                riderName: { not: null },
            },
            _count: { _all: true },
        });
        const partnersCompletedAtLeastOne = partnersWithCompleted.length;
        return res.json({
            stats: {
                pendingRegistrations,
                activeApprovedPartners,
                rejectedPartners,
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
        const statusFilter = parseRegistrationFilter(req.query.registrationStatus);
        if (typeof req.query.registrationStatus === "string" && req.query.registrationStatus.trim() && !statusFilter) {
            return res.status(400).json({ message: "Invalid registrationStatus filter" });
        }
        const where = {
            user: { role: "DELIVERY" },
            ...(statusFilter ? { registrationStatus: statusFilter } : {}),
        };
        const partners = await prisma.riderName.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        phone: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 200,
        });
        const ids = partners.map((p) => p.id);
        const completedByRider = ids.length === 0
            ? []
            : await prisma.delivery.groupBy({
                by: ["riderName"],
                where: {
                    status: "DELIVERED",
                    riderName: { in: ids },
                },
                _count: { _all: true },
            });
        const completedMap = new Map(completedByRider.map((row) => [row.riderName, row._count._all]));
        const rows = partners.map((p) => ({
            id: p.id,
            vehicleType: p.vehicleType,
            nidDocumentUrl: p.nidDocumentUrl,
            educationDocumentUrl: p.educationDocumentUrl,
            cvDocumentUrl: p.cvDocumentUrl,
            agentStatus: p.status,
            isActive: p.isActive,
            registrationStatus: p.registrationStatus,
            currentLat: p.currentLat,
            currentLng: p.currentLng,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            user: p.user,
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
    try {
        const rawId = req.params.id;
        if (typeof rawId !== "string" || !rawId.trim()) {
            return res.status(400).json({ message: "Partner id is required" });
        }
        const partnerId = rawId.trim();
        const generatedPassword = generatePassword();
        const updated = await prisma.$transaction(async (tx) => {
            const rider = await tx.riderName.findUnique({
                where: { id: partnerId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
            });
            if (!rider) {
                throw new Error("PARTNER_NOT_FOUND");
            }
            const generatedUsername = await generateUniqueUsername(tx, rider.user.name ?? rider.user.email.split("@")[0] ?? "delivery");
            const passwordHash = await bcrypt.hash(generatedPassword, 10);
            await tx.user.update({
                where: { id: rider.userId },
                data: {
                    username: generatedUsername,
                    passwordHash,
                    role: "DELIVERY",
                    status: "ACTIVE",
                },
            });
            return tx.riderName.update({
                where: { id: partnerId },
                data: {
                    registrationStatus: "APPROVED",
                    isActive: true,
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            email: true,
                            phone: true,
                            status: true,
                        },
                    },
                },
            });
        });
        try {
            await sendDeliveryCredentialsEmail({
                toEmail: updated.user.email,
                recipientName: updated.user.name ?? updated.user.username,
                username: updated.user.username,
                password: generatedPassword,
            });
        }
        catch (emailError) {
            console.error("approveDeliveryPartner email send error:", emailError);
        }
        return res.json({
            message: "Delivery partner approved and credentials emailed",
            partner: updated,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "PARTNER_NOT_FOUND") {
            return res.status(404).json({ message: "Partner not found" });
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return res.status(404).json({ message: "Partner not found" });
        }
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
        const updated = await prisma.riderName.update({
            where: { id: rawId.trim() },
            data: {
                registrationStatus: "REJECTED",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        email: true,
                        phone: true,
                        status: true,
                    },
                },
            },
        });
        return res.json({
            message: "Delivery partner registration rejected",
            partner: updated,
        });
    }
    catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
            return res.status(404).json({ message: "Partner not found" });
        }
        console.error("rejectDeliveryPartner error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function listDeliveryOrders(req, res) {
    try {
        const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
        const allowedStatuses = new Set([
            "PENDING",
            "SCHEDULED",
            "DISPATCHED",
            "PICKED_UP",
            "IN_TRANSIT",
            "DELIVERED",
            "FAILED",
            "CANCELLED",
        ]);
        const statusFilter = allowedStatuses.has(rawStatus) ? rawStatus : undefined;
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
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        username: true,
                                        phone: true,
                                    },
                                },
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
                deliveryAgent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                email: true,
                                phone: true,
                                lat: true,
                                lng: true,
                                status: true,
                            },
                        },
                    },
                },
            },
            orderBy: { updatedAt: "desc" },
            take: 300,
        });
        return res.json({ deliveries });
    }
    catch (error) {
        console.error("listDeliveryOrders error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function assignDeliveryOrder(req, res) {
    try {
        const rawDeliveryId = req.params.id;
        const { deliveryUserId } = req.body;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        if (typeof deliveryUserId !== "string" || !deliveryUserId.trim()) {
            return res.status(400).json({ message: "deliveryUserId is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const partnerUserId = deliveryUserId.trim();
        const partner = await prisma.user.findUnique({
            where: { id: partnerUserId },
            select: { id: true, role: true, status: true, name: true, phone: true },
        });
        if (!partner || partner.role !== "DELIVERY") {
            return res.status(404).json({ message: "Delivery agent not found" });
        }
        if (partner.status !== "ACTIVE") {
            return res.status(400).json({ message: "Delivery agent must be active" });
        }
        let riderName = await prisma.riderName.findUnique({
            where: { userId: partnerUserId },
            select: { id: true },
        });
        if (!riderName) {
            riderName = await prisma.riderName.create({
                data: {
                    userId: partnerUserId,
                    registrationStatus: "APPROVED",
                    isActive: true,
                    status: "AVAILABLE",
                },
                select: { id: true },
            });
        }
        const activeDelivery = await prisma.delivery.findFirst({
            where: {
                riderName: riderName.id,
                status: { in: ["SCHEDULED", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"] },
            },
            select: { id: true },
        });
        if (activeDelivery) {
            return res
                .status(409)
                .json({ message: "Delivery agent already has an active delivery in progress" });
        }
        const now = new Date();
        const updated = await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
                riderName: riderName.id,
                riderName: partner.name ?? null,
                riderPhone: partner.phone ?? null,
                status: "SCHEDULED",
                scheduledAt: now,
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
                deliveryAgent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
        });
        return res.json({
            message: "Delivery assigned successfully",
            delivery: updated,
        });
    }
    catch (error) {
        console.error("assignDeliveryOrder error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function getDeliveryOrderTimeline(req, res) {
    try {
        const rawDeliveryId = req.params.id;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const delivery = await prisma.delivery.findUnique({
            where: { id: deliveryId },
            include: {
                repairJob: {
                    include: {
                        repairRequest: {
                            select: {
                                id: true,
                                title: true,
                                deviceType: true,
                            },
                        },
                        shop: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                },
                deliveryAgent: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                phone: true,
                                lat: true,
                                lng: true,
                            },
                        },
                    },
                },
            },
        });
        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" });
        }
        const timeline = [
            { code: "CREATED", title: "Order created", at: delivery.createdAt },
            { code: "SCHEDULED", title: "Assigned to rider", at: delivery.scheduledAt },
            { code: "PICKED_UP", title: "Picked up by rider", at: delivery.pickedUpAt },
            { code: "DELIVERED", title: "Delivered", at: delivery.deliveredAt },
            { code: "LAST_UPDATE", title: "Last updated", at: delivery.updatedAt },
        ];
        return res.json({
            delivery,
            timeline,
            pusher: getPusherPublicConfig(),
        });
    }
    catch (error) {
        console.error("getDeliveryOrderTimeline error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function getAdminDeliveryChatMessages(req, res) {
    try {
        const rawDeliveryId = req.params.id;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const messages = await prisma.deliveryChatMessage.findMany({
            where: { deliveryId },
            orderBy: { createdAt: "asc" },
            take: 200,
        });
        return res.json({
            messages,
            pusher: getPusherPublicConfig(),
        });
    }
    catch (error) {
        console.error("getAdminDeliveryChatMessages error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function sendAdminDeliveryChatMessage(req, res) {
    try {
        const adminUserId = req.deliveryAdminAuth?.userId;
        if (!adminUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const rawDeliveryId = req.params.id;
        const { message } = req.body;
        if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
            return res.status(400).json({ message: "Delivery id is required" });
        }
        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ message: "Message is required" });
        }
        const deliveryId = rawDeliveryId.trim();
        const delivery = await prisma.delivery.findUnique({
            where: { id: deliveryId },
            include: {
                deliveryAgent: {
                    select: {
                        userId: true,
                    },
                },
            },
        });
        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" });
        }
        if (!delivery.deliveryAgent?.userId) {
            return res.status(400).json({ message: "No delivery agent assigned for this order" });
        }
        const created = await prisma.deliveryChatMessage.create({
            data: {
                deliveryId,
                senderUserId: adminUserId,
                senderRole: "DELIVERY_ADMIN",
                recipientUserId: delivery.deliveryAgent.userId,
                message: message.trim(),
            },
        });
        await publishDeliveryChatMessage(deliveryId, created);
        return res.status(201).json({ message: created });
    }
    catch (error) {
        console.error("sendAdminDeliveryChatMessage error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function listDeliveryPayoutRequests(req, res) {
    try {
        const allowedStatuses = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"];
        const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
        const statusFilter = rawStatus && allowedStatuses.includes(rawStatus)
            ? rawStatus
            : undefined;
        const payouts = await prisma.vendorPayout.findMany({
            where: {
                riderNameId: { not: null },
                ...(statusFilter ? { status: statusFilter } : {}),
            },
            include: {
                riderName: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        return res.json({ payouts });
    }
    catch (error) {
        console.error("listDeliveryPayoutRequests error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function approveDeliveryPayoutRequest(req, res) {
    try {
        const rawId = req.params.id;
        if (typeof rawId !== "string" || !rawId.trim()) {
            return res.status(400).json({ message: "Payout request id is required" });
        }
        const payoutId = rawId.trim();
        const existing = await prisma.vendorPayout.findUnique({
            where: { id: payoutId },
            select: {
                id: true,
                riderNameId: true,
                status: true,
            },
        });
        if (!existing || !existing.riderNameId) {
            return res.status(404).json({ message: "Payout request not found" });
        }
        if (existing.status !== "PENDING" && existing.status !== "PROCESSING") {
            return res.status(409).json({ message: "Only pending payout requests can be approved" });
        }
        const updated = await prisma.vendorPayout.update({
            where: { id: payoutId },
            data: {
                status: "PAID",
                paidAt: new Date(),
            },
            include: {
                riderName: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                username: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        return res.json({
            message: "Payout approved successfully",
            payout: updated,
        });
    }
    catch (error) {
        console.error("approveDeliveryPayoutRequest error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
//# sourceMappingURL=delivery-admin-controller.js.map