import { DeliveryStatus, PayoutStatus } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../models/prisma.js";
import { getPusherPublicConfig, publishDeliveryChatMessage } from "../services/pusher-service.js";

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
        deliveryAgent: { is: { userId: riderUserId } },
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
                user: { select: { name: true, phone: true, lat: true, lng: true } },
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                lat: true,
                lng: true,
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

    const riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: riderUserId },
      select: { id: true },
    });

    if (!riderProfile) {
      return res.status(404).json({ message: "Rider profile not found" });
    }

    const existing = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, deliveryAgentId: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (existing.deliveryAgentId && existing.deliveryAgentId !== riderProfile.id) {
      return res.status(409).json({ message: "This order is already accepted by another rider" });
    }

    if (["DELIVERED", "FAILED", "CANCELLED"].includes(existing.status)) {
      return res.status(400).json({ message: "Finalized delivery cannot be accepted" });
    }

    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        deliveryAgentId: riderProfile.id,
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
        deliveryAgentId: riderProfile.id,
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
                user: { select: { name: true, phone: true, lat: true, lng: true } },
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                lat: true,
                lng: true,
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
      where: { id: deliveryId, deliveryAgent: { is: { userId: riderUserId } } },
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
                user: { select: { name: true, phone: true, lat: true, lng: true } },
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
                phone: true,
                address: true,
                lat: true,
                lng: true,
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

async function ensureRiderProfileId(userId: string): Promise<string> {
  const existing = await prisma.riderProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing?.id) return existing.id;

  const created = await prisma.riderProfile.create({
    data: {
      userId,
      registrationStatus: "APPROVED",
      isActive: true,
      status: "AVAILABLE",
    },
    select: { id: true },
  });
  return created.id;
}

async function getDeliveryWalletSummary(userId: string) {
  const riderProfileId = await ensureRiderProfileId(userId);

  const [deliveredAgg, payoutAgg] = await Promise.all([
    prisma.delivery.aggregate({
      where: {
        status: "DELIVERED",
        deliveryAgentId: riderProfileId,
      },
      _sum: {
        fee: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.vendorPayout.aggregate({
      where: {
        riderProfileId,
        status: {
          in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING, PayoutStatus.PAID],
        },
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const earned = Number(deliveredAgg._sum.fee ?? 0);
  const requestedOrPaid = Number(payoutAgg._sum.amount ?? 0);
  const available = Math.max(0, earned - requestedOrPaid);

  return {
    riderProfileId,
    deliveredTrips: deliveredAgg._count.id,
    earned,
    requestedOrPaid,
    available,
  };
}

export async function getDeliveryPayoutSummary(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const summary = await getDeliveryWalletSummary(riderUserId);
    const payouts = await prisma.vendorPayout.findMany({
      where: { riderProfileId: summary.riderProfileId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        amount: true,
        status: true,
        notes: true,
        paidAt: true,
        createdAt: true,
      },
    });

    return res.json({
      summary: {
        deliveredTrips: summary.deliveredTrips,
        earned: summary.earned,
        requestedOrPaid: summary.requestedOrPaid,
        available: summary.available,
        minRequestAmount: 500,
        canRequest: summary.available >= 500,
      },
      payouts,
    });
  } catch (error) {
    console.error("getDeliveryPayoutSummary error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function requestDeliveryPayout(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { amount, notes } = req.body as { amount?: unknown; notes?: unknown };
    const summary = await getDeliveryWalletSummary(riderUserId);

    if (summary.available < 500) {
      return res
        .status(400)
        .json({ message: "You can request payout only after earning at least BDT 500" });
    }

    const requestedAmountRaw = typeof amount === "number" ? amount : summary.available;
    const requestedAmount = Math.round((requestedAmountRaw + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({ message: "Valid payout amount is required" });
    }
    if (requestedAmount > summary.available) {
      return res.status(400).json({ message: "Requested amount is higher than available balance" });
    }
    if (requestedAmount < 500) {
      return res.status(400).json({ message: "Minimum payout request amount is BDT 500" });
    }

    const created = await prisma.vendorPayout.create({
      data: {
        riderProfileId: summary.riderProfileId,
        amount: requestedAmount,
        status: PayoutStatus.PENDING,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      },
      select: {
        id: true,
        amount: true,
        status: true,
        notes: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      message: "Payout request sent to admin",
      payout: created,
    });
  } catch (error) {
    console.error("requestDeliveryPayout error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getDeliveryChatMessages(req: Request, res: Response) {
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

    const delivery = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        deliveryAgent: { is: { userId: riderUserId } },
      },
      select: { id: true },
    });
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found for this rider" });
    }

    const messages = await prisma.deliveryChatMessage.findMany({
      where: { deliveryId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });

    return res.json({
      messages,
      pusher: getPusherPublicConfig(),
    });
  } catch (error) {
    console.error("getDeliveryChatMessages error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function sendDeliveryChatMessage(req: Request, res: Response) {
  try {
    const riderUserId = req.deliveryAuth?.userId;
    if (!riderUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const rawDeliveryId = (req.params as { id?: unknown }).id;
    const { message } = req.body as { message?: unknown };
    if (typeof rawDeliveryId !== "string" || !rawDeliveryId.trim()) {
      return res.status(400).json({ message: "Delivery id is required" });
    }
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    const deliveryId = rawDeliveryId.trim();

    const adminUser = await prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        deliveryAgent: { is: { userId: riderUserId } },
      },
      select: {
        id: true,
        repairJob: {
          select: {
            shop: {
              select: {
                staff: {
                  where: { user: { role: "DELIVERY_ADMIN", status: "ACTIVE" } },
                  select: { userId: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!adminUser) {
      return res.status(404).json({ message: "Delivery not found for this rider" });
    }

    const explicitAdmin = await prisma.user.findFirst({
      where: {
        role: { in: ["DELIVERY_ADMIN", "ADMIN"] },
        status: "ACTIVE",
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!explicitAdmin) {
      return res.status(404).json({ message: "No active delivery admin found" });
    }

    const created = await prisma.deliveryChatMessage.create({
      data: {
        deliveryId,
        senderUserId: riderUserId,
        senderRole: "DELIVERY",
        recipientUserId: explicitAdmin.id,
        message: message.trim(),
      },
    });

    await publishDeliveryChatMessage(deliveryId, created);
    return res.status(201).json({ message: created });
  } catch (error) {
    console.error("sendDeliveryChatMessage error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
