import { DeliveryStatus } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../models/prisma.js";
import { getPusherPublicConfig, publishDeliveryChatMessage } from "../services/pusher-service.js";
import { sendDeliveryCredentialsEmail } from "../services/delivery-credentials-email-service.js";

export async function getDeliveryAdminStats(_req: Request, res: Response) {
  try {
    const [
      pendingRegistrations,
      activeApprovedPartners,
      rejectedPartners,
      totalPartners,
      completedDeliveriesTotal,
    ] = await Promise.all([
      prisma.riderProfile.count({ where: { registrationStatus: "PENDING" } }),
      prisma.riderProfile.count({
        where: { registrationStatus: "APPROVED", user: { status: "ACTIVE" } },
      }),
      prisma.riderProfile.count({ where: { registrationStatus: "REJECTED" } }),
      prisma.user.count({ where: { role: "DELIVERY" } }),
      prisma.delivery.count({ where: { status: "DELIVERED" } }),
    ]);

    const partnersWithCompleted = await prisma.delivery.findMany({
      where: {
        status: "DELIVERED",
        deliveryAgentId: { not: null },
      },
      select: {
        deliveryAgent: {
          select: {
            userId: true,
          },
        },
      },
    });

    const partnerUserIds = (partnersWithCompleted as Array<{ deliveryAgent: { userId: string } | null }>)
      .map((row: { deliveryAgent: { userId: string } | null }) => row.deliveryAgent?.userId)
      .filter((id: string | undefined): id is string => Boolean(id));

    const partnersCompletedAtLeastOne = new Set(partnerUserIds).size;

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
  } catch (error) {
    console.error("getDeliveryAdminStats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listDeliveryPartners(req: Request, res: Response) {
  try {
    const rawRegistrationStatus =
      typeof req.query.registrationStatus === "string"
        ? req.query.registrationStatus.trim().toUpperCase()
        : "";
    const allowedRegistrationStatuses = new Set(["PENDING", "APPROVED", "REJECTED"]);
    const registrationStatusFilter = allowedRegistrationStatuses.has(rawRegistrationStatus)
      ? rawRegistrationStatus
      : "";

    const partners = await prisma.user.findMany({
      where: { role: "DELIVERY" },
      include: {
        riderProfile: {
          select: {
            id: true,
            vehicleType: true,
            nidDocumentUrl: true,
            educationDocumentUrl: true,
            cvDocumentUrl: true,
            status: true,
            isActive: true,
            registrationStatus: true,
            currentLat: true,
            currentLng: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    const ids = (partners as Array<{ id: string }>).map((p: { id: string }) => p.id);
    const completedByRider =
      ids.length === 0
        ? []
        : await prisma.delivery.findMany({
            where: {
              status: "DELIVERED",
              deliveryAgent: {
                is: {
                  userId: { in: ids },
                },
              },
            },
            select: {
              deliveryAgent: {
                select: {
                  userId: true,
                },
              },
            },
          });

    const completedMap = (completedByRider as Array<{ deliveryAgent: { userId: string } | null }>).reduce<
      Map<string, number>
    >((acc: Map<string, number>, row: { deliveryAgent: { userId: string } | null }) => {
      const userId = row.deliveryAgent?.userId;
      if (!userId) return acc;
      acc.set(userId, (acc.get(userId) ?? 0) + 1);
      return acc;
    }, new Map());

    const riderProfiles = ids.length
      ? await prisma.riderProfile.findMany({
          where: { userId: { in: ids } },
          select: {
            id: true,
            userId: true,
          },
        })
      : [];

    const riderProfileByUserId = new Map<string, string>(
      riderProfiles.map((profile: { userId: string; id: string }) => [profile.userId, profile.id]),
    );

    const activeDeliveries = riderProfiles.length
      ? await prisma.delivery.findMany({
          where: {
            deliveryAgentId: {
              in: riderProfiles.map((profile: { id: string }) => profile.id),
            },
            status: {
              in: ["SCHEDULED", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"],
            },
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            status: true,
            direction: true,
            pickupAddress: true,
            dropAddress: true,
            updatedAt: true,
            deliveryAgentId: true,
          },
        })
      : [];

    const activeDeliveryByRiderProfileId = new Map<string, (typeof activeDeliveries)[number]>();
    for (const delivery of activeDeliveries) {
      if (!delivery.deliveryAgentId) continue;
      if (!activeDeliveryByRiderProfileId.has(delivery.deliveryAgentId)) {
        activeDeliveryByRiderProfileId.set(delivery.deliveryAgentId, delivery);
      }
    }

    const rows = (partners as Array<any>)
      .map((p: any) => {
        const registrationStatus = p.riderProfile?.registrationStatus ?? "PENDING";
        const riderProfileId = riderProfileByUserId.get(p.id);
        const activeDelivery = riderProfileId
          ? activeDeliveryByRiderProfileId.get(riderProfileId) ?? null
          : null;

        return {
          id: p.id,
          vehicleType: p.riderProfile?.vehicleType ?? null,
          nidDocumentUrl: p.riderProfile?.nidDocumentUrl ?? null,
          educationDocumentUrl: p.riderProfile?.educationDocumentUrl ?? null,
          cvDocumentUrl: p.riderProfile?.cvDocumentUrl ?? null,
          agentStatus: p.riderProfile?.status ?? p.status,
          isActive: p.riderProfile?.isActive ?? p.status === "ACTIVE",
          registrationStatus,
          currentLat: p.riderProfile?.currentLat ?? p.lat,
          currentLng: p.riderProfile?.currentLng ?? p.lng,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          user: p,
          completedDeliveries: completedMap.get(p.id) ?? 0,
          activeDelivery,
        };
      })
      .filter((row) => (registrationStatusFilter ? row.registrationStatus === registrationStatusFilter : true));

    return res.json({ partners: rows });
  } catch (error) {
    console.error("listDeliveryPartners error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listDeliveryOrders(req: Request, res: Response) {
  try {
    const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const allowedStatuses = new Set<DeliveryStatus>(Object.values(DeliveryStatus));
    const statusFilter = allowedStatuses.has(rawStatus as DeliveryStatus)
      ? (rawStatus as DeliveryStatus)
      : undefined;

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
  } catch (error) {
    console.error("listDeliveryOrders error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function assignDeliveryOrder(req: Request, res: Response) {
  try {
    const rawDeliveryId = (req.params as { id?: unknown }).id;
    const { deliveryUserId } = req.body as { deliveryUserId?: unknown };
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

    let riderProfile = await prisma.riderProfile.findUnique({
      where: { userId: partnerUserId },
      select: { id: true },
    });
    if (!riderProfile) {
      riderProfile = await prisma.riderProfile.create({
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
        deliveryAgentId: riderProfile.id,
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
        deliveryAgentId: riderProfile.id,
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
  } catch (error) {
    console.error("assignDeliveryOrder error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getDeliveryOrderTimeline(req: Request, res: Response) {
  try {
    const rawDeliveryId = (req.params as { id?: unknown }).id;
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
  } catch (error) {
    console.error("getDeliveryOrderTimeline error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getAdminDeliveryChatMessages(req: Request, res: Response) {
  try {
    const rawDeliveryId = (req.params as { id?: unknown }).id;
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
  } catch (error) {
    console.error("getAdminDeliveryChatMessages error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function sendAdminDeliveryChatMessage(req: Request, res: Response) {
  try {
    const adminUserId = req.deliveryAdminAuth?.userId;
    if (!adminUserId) {
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
  } catch (error) {
    console.error("sendAdminDeliveryChatMessage error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function approveDeliveryPartner(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Partner id is required" });
    }

    const partnerId = rawId.trim();
    const tempPassword = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: partnerId },
        data: {
          status: "ACTIVE",
          passwordHash,
        },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
        },
      });

      const riderProfile = await tx.riderProfile.upsert({
        where: { userId: partnerId },
        create: {
          userId: partnerId,
          registrationStatus: "APPROVED",
          isActive: true,
          status: "AVAILABLE",
        },
        update: {
          registrationStatus: "APPROVED",
          isActive: true,
          status: "AVAILABLE",
        },
      });

      return { user, riderProfile };
    });

    try {
      await sendDeliveryCredentialsEmail({
        toEmail: updated.user.email,
        recipientName: updated.user.name ?? updated.user.username,
        username: updated.user.username,
        password: tempPassword,
      });
    } catch (emailError) {
      console.error("approveDeliveryPartner credentials email error:", emailError);
    }

    return res.json({
      message: "Delivery partner approved",
      partner: updated.riderProfile,
    });
  } catch (error) {
    console.error("approveDeliveryPartner error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function rejectDeliveryPartner(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Partner id is required" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: rawId.trim() },
        data: { status: "SUSPENDED" },
      });

      return tx.riderProfile.upsert({
        where: { userId: rawId.trim() },
        create: {
          userId: rawId.trim(),
          registrationStatus: "REJECTED",
          isActive: false,
          status: "SUSPENDED",
        },
        update: {
          registrationStatus: "REJECTED",
          isActive: false,
          status: "SUSPENDED",
        },
      });
    });

    return res.json({
      message: "Delivery partner rejected",
      partner: updated,
    });
  } catch (error) {
    console.error("rejectDeliveryPartner error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function blockDeliveryPartner(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Partner id is required" });
    }

    const partnerId = rawId.trim();
    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: partnerId },
        data: { status: "SUSPENDED" },
      });

      return tx.riderProfile.upsert({
        where: { userId: partnerId },
        create: {
          userId: partnerId,
          registrationStatus: "APPROVED",
          isActive: false,
          status: "SUSPENDED",
        },
        update: {
          isActive: false,
          status: "SUSPENDED",
        },
      });
    });

    return res.json({
      message: "Delivery partner blocked",
      partner: updated,
    });
  } catch (error) {
    console.error("blockDeliveryPartner error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteDeliveryPartner(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Partner id is required" });
    }
    const partnerRef = rawId.trim();

    const existing =
      (await prisma.user.findUnique({
        where: { id: partnerRef },
        select: {
          id: true,
          role: true,
          riderProfile: {
            select: { id: true },
          },
        },
      })) ??
      (await prisma.user.findFirst({
        where: {
          role: "DELIVERY",
          riderProfile: {
            is: {
              id: partnerRef,
            },
          },
        },
        select: {
          id: true,
          role: true,
          riderProfile: {
            select: { id: true },
          },
        },
      }));

    if (!existing || existing.role !== "DELIVERY") {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    const partnerId = existing.id;
    if (!partnerId) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    if (existing.riderProfile?.id) {
      const activeDelivery = await prisma.delivery.findFirst({
        where: {
          deliveryAgentId: existing.riderProfile.id,
          status: { in: ["SCHEDULED", "DISPATCHED", "PICKED_UP", "IN_TRANSIT"] },
        },
        select: { id: true },
      });
      if (activeDelivery) {
        return res.status(409).json({
          message: "Cannot delete delivery partner with active deliveries. Block first and finish active jobs.",
        });
      }
    }

    await prisma.user.delete({
      where: { id: partnerId },
    });

    return res.json({ message: "Delivery partner deleted successfully" });
  } catch (error) {
    console.error("deleteDeliveryPartner error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listDeliveryPayoutRequests(req: Request, res: Response) {
  try {
    const allowedStatuses = ["PENDING", "PROCESSING", "PAID", "FAILED", "CANCELLED"] as const;
    type PayoutStatusValue = (typeof allowedStatuses)[number];
    const rawStatus = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const statusFilter =
      rawStatus && (allowedStatuses as readonly string[]).includes(rawStatus)
        ? (rawStatus as PayoutStatusValue)
        : undefined;

    const payouts = await prisma.vendorPayout.findMany({
      where: {
        riderProfileId: { not: null },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        riderProfile: {
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
  } catch (error) {
    console.error("listDeliveryPayoutRequests error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function approveDeliveryPayoutRequest(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Payout request id is required" });
    }
    const payoutId = rawId.trim();

    const existing = await prisma.vendorPayout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        riderProfileId: true,
        status: true,
      },
    });

    if (!existing || !existing.riderProfileId) {
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
        riderProfile: {
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
  } catch (error) {
    console.error("approveDeliveryPayoutRequest error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
