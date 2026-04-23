import { DeliveryStatus } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../models/prisma.js";

function parseDeliveryStatusQuery(raw: unknown): DeliveryStatus | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const v = raw.trim() as DeliveryStatus;
  return Object.values(DeliveryStatus).includes(v) ? v : undefined;
}

export async function getDeliveryMe(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rider = await prisma.user.findUnique({
      where: { id: riderUserId },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lat: true,
        lng: true,
      },
    });

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    return res.json({ riderProfile: rider });
  } catch (error) {
    console.error("getDeliveryMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listMyDeliveries(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const statusFilter = parseDeliveryStatusQuery(req.query.status);
    if (typeof req.query.status === "string" && req.query.status.trim() && !statusFilter) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    const deliveries = await prisma.delivery.findMany({
      where: {
        riderUserId,
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
                user: { select: { phone: true } },
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
      },
      orderBy: { updatedAt: "desc" },
    });

    return res.json({ deliveries });
  } catch (error) {
    console.error("listMyDeliveries error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function acceptMyDelivery(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rawDeliveryId = (req.params as { id?: unknown }).id;
    if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
      return res.status(400).json({ message: "Delivery id is required" });
    }
    const deliveryId = rawDeliveryId.trim();

    const rider = await prisma.user.findUnique({
      where: { id: riderUserId },
      select: {
        name: true,
        phone: true,
      },
    });

    if (!rider) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const existing = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, riderUserId: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (existing.riderUserId && existing.riderUserId !== riderUserId) {
      return res.status(409).json({ message: "This order is already accepted by another rider" });
    }

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(existing.status)) {
      return res.status(400).json({ message: "Finalized delivery cannot be accepted" });
    }

    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        riderUserId,
        status: {
          notIn: ["DELIVERED", "FAILED", "CANCELLED", "PENDING"],
        },
        id: {
          not: deliveryId,
        },
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
        riderUserId,
        riderName: rider.name ?? null,
        riderPhone: rider.phone ?? null,
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
                user: { select: { phone: true } },
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
      },
    });

    return res.json({ delivery: updated });
  } catch (error) {
    console.error("acceptMyDelivery error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateLocation(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { lat, lng } = req.body as { lat?: unknown; lng?: unknown };

    if (typeof lat !== "number" || typeof lng !== "number") {
      return res.status(400).json({ message: "lat and lng must be numbers" });
    }

    const updated = await prisma.user.update({
      where: { id: riderUserId },
      data: { lat, lng },
      select: {
        id: true,
        lat: true,
        lng: true,
        updatedAt: true,
      },
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

export async function updateMyDeliveryStatus(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const rawDeliveryId = (req.params as { id?: unknown }).id;
    if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
      return res.status(400).json({ message: "Delivery id is required" });
    }
    const deliveryId = rawDeliveryId.trim();

    const status = parseDeliveryStatusBody((req.body as { status?: unknown }).status);
    if (!status) {
      return res.status(400).json({ message: "Valid delivery status is required" });
    }

    const existing = await prisma.delivery.findFirst({
      where: { id: deliveryId, riderUserId },
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
        ...(status === "IN_TRANSIT" ? { scheduledAt: now } : {}), // Fallback since dispatchedAt is gone
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
                user: { select: { phone: true } },
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
      },
    });

    return res.json({ delivery: updated });
  } catch (error) {
    console.error("updateMyDeliveryStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
