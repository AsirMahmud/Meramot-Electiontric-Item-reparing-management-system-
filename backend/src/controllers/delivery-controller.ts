import { DeliveryStatus } from "@prisma/client";
import { Response } from "express";
import prisma from "../models/prisma.js";
import { AuthedRequest } from "../middleware/auth.js";

function parseDeliveryStatusQuery(raw: unknown): DeliveryStatus | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const v = raw.trim() as DeliveryStatus;
  return Object.values(DeliveryStatus).includes(v) ? v : undefined;
}

export async function getDeliveryMe(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId },
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

    if (!riderProfile) {
      return res.json({
        riderName: {
          id: "",
          userId: userId,
          registrationStatus: "PENDING",
          user: req.user,
        }
      });
    }

    return res.json({ riderProfile });
  } catch (error) {
    console.error("getDeliveryMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listMyDeliveries(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId } });
    if (!riderProfile) return res.status(404).json({ message: "Rider profile not found" });

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
  } catch (error) {
    console.error("listMyDeliveries error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function acceptMyDelivery(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const rider = await prisma.riderProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { name: true, phone: true },
        },
      },
    });

    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    const rawDeliveryId = (req.params as { id?: unknown }).id;
    if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
      return res.status(400).json({ message: "Delivery id is required" });
    }
    const deliveryId = rawDeliveryId.trim();

    const existing = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, deliveryAgentId: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (existing.deliveryAgentId && existing.deliveryAgentId !== rider.id) {
      return res.status(409).json({ message: "This order is already accepted by another rider" });
    }

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(existing.status)) {
      return res.status(400).json({ message: "Finalized delivery cannot be accepted" });
    }

    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        deliveryAgentId: rider.id,
        status: { notIn: ["DELIVERED", "FAILED", "CANCELLED"] },
        id: { not: deliveryId },
      },
      select: { id: true },
    });

    if (activeDelivery) {
      return res.status(409).json({ message: "Finish your active delivery before accepting a new order" });
    }

    const now = new Date();
    const updated = await prisma.delivery.update({
      where: { id: deliveryId },
      data: {
        deliveryAgentId: rider.id,
        riderName: rider.user.name ?? null,
        riderPhone: rider.user.phone ?? null,
        ...(existing.status === "PENDING" ? { status: "SCHEDULED", scheduledAt: now } : {}),
      },
      include: {
        repairJob: {
          include: {
            repairRequest: {
              select: { id: true, title: true, deviceType: true, status: true, contactPhone: true },
            },
            shop: {
              select: { id: true, name: true, phone: true, address: true },
            },
          },
        },
        coverageZone: true,
      },
    });

    return res.json({ delivery: updated });
  } catch (error) {
    console.error("acceptMyDelivery error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateLocation(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId } });
    if (!riderProfile) return res.status(404).json({ message: "Rider profile not found" });

    const { lat, lng } = req.body as { lat?: unknown; lng?: unknown };
    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat and lng must be numbers" });
    }

    const updated = await prisma.riderProfile.update({
      where: { id: riderProfile.id },
      data: { currentLat: lat, currentLng: lng },
      select: { id: true, currentLat: true, currentLng: true, updatedAt: true },
    });

    return res.json({ riderProfile: updated });
  } catch (error) {
    console.error("updateLocation error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

function parseDeliveryStatusBody(raw: unknown): DeliveryStatus | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const v = raw.trim() as DeliveryStatus;
  return Object.values(DeliveryStatus).includes(v) ? v : undefined;
}

export async function updateMyDeliveryStatus(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const riderProfile = await prisma.riderProfile.findUnique({ where: { userId } });
    if (!riderProfile) return res.status(404).json({ message: "Rider profile not found" });

    const rawDeliveryId = (req.params as { id?: unknown }).id;
    if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
      return res.status(400).json({ message: "Delivery id is required" });
    }
    const deliveryId = rawDeliveryId.trim();

    const status = parseDeliveryStatusBody((req.body as { status?: unknown }).status);
    if (!status) return res.status(400).json({ message: "Valid delivery status is required" });

    const existing = await prisma.delivery.findFirst({
      where: { id: deliveryId, deliveryAgentId: riderProfile.id },
      select: { id: true },
    });

    if (!existing) return res.status(404).json({ message: "Delivery not found for this rider" });

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
              select: { id: true, title: true, deviceType: true, status: true, contactPhone: true },
            },
            shop: {
              select: { id: true, name: true, phone: true, address: true },
            },
          },
        },
        coverageZone: true,
      },
    });

    return res.json({ delivery: updated });
  } catch (error) {
    console.error("updateMyDeliveryStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getDeliveryPayoutSummary(req: AuthedRequest, res: Response) {
  return res.status(400).json({ message: "Not implemented in this phase" });
}

export async function requestDeliveryPayout(req: AuthedRequest, res: Response) {
  return res.status(400).json({ message: "Not implemented in this phase" });
}

export async function getDeliveryChatMessages(req: AuthedRequest, res: Response) {
  return res.status(400).json({ message: "Not implemented in this phase" });
}

export async function sendDeliveryChatMessage(req: AuthedRequest, res: Response) {
  return res.status(400).json({ message: "Not implemented in this phase" });
}
