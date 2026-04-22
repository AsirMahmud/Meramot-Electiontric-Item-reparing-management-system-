import { DeliveryPartnerApprovalStatus, Prisma } from "@prisma/client";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../models/prisma.js";
import { sendDeliveryCredentialsEmail } from "../services/delivery-credentials-email-service.js";

function randomChars(length: number) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += chars[Math.floor(Math.random() * chars.length)];
  }
  return output;
}

async function generateUniqueUsername(tx: Prisma.TransactionClient, baseName: string) {
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
    if (!existing) return candidate;
  }

  return `${normalizedBase}${Date.now().toString(36).slice(-4)}`;
}

function generatePassword() {
  return `DM-${randomChars(4)}-${randomChars(4)}-${Math.floor(100 + Math.random() * 900)}`;
}

function parseRegistrationFilter(raw: unknown): DeliveryPartnerApprovalStatus | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;
  const v = raw.trim() as DeliveryPartnerApprovalStatus;
  return Object.values(DeliveryPartnerApprovalStatus).includes(v) ? v : undefined;
}

export async function getDeliveryAdminStats(_req: Request, res: Response) {
  try {
    const partnerUser = { user: { role: "DELIVERY" as const } };

    const [
      pendingRegistrations,
      activeApprovedPartners,
      rejectedPartners,
      totalPartners,
      completedDeliveriesTotal,
    ] = await Promise.all([
      prisma.riderProfile.count({ where: { ...partnerUser, registrationStatus: "PENDING" } }),
      prisma.riderProfile.count({
        where: { ...partnerUser, registrationStatus: "APPROVED", isActive: true },
      }),
      prisma.riderProfile.count({ where: { ...partnerUser, registrationStatus: "REJECTED" } }),
      prisma.riderProfile.count({ where: partnerUser }),
      prisma.delivery.count({ where: { status: "DELIVERED" } }),
    ]);

    const partnersWithCompleted = await prisma.delivery.groupBy({
      by: ["deliveryAgentId"],
      where: {
        status: "DELIVERED",
        deliveryAgentId: { not: null },
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
  } catch (error) {
    console.error("getDeliveryAdminStats error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listDeliveryPartners(req: Request, res: Response) {
  try {
    const statusFilter = parseRegistrationFilter(req.query.registrationStatus);
    if (typeof req.query.registrationStatus === "string" && req.query.registrationStatus.trim() && !statusFilter) {
      return res.status(400).json({ message: "Invalid registrationStatus filter" });
    }

    const where: Prisma.RiderProfileWhereInput = {
      user: { role: "DELIVERY" },
      ...(statusFilter ? { registrationStatus: statusFilter } : {}),
    };

    const partners = await prisma.riderProfile.findMany({
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
    const completedByRider =
      ids.length === 0
        ? []
        : await prisma.delivery.groupBy({
            by: ["deliveryAgentId"],
            where: {
              status: "DELIVERED",
              deliveryAgentId: { in: ids },
            },
            _count: { _all: true },
          });

    const completedMap = new Map(
      completedByRider.map((row) => [row.deliveryAgentId, row._count._all]),
    );

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
  } catch (error) {
    console.error("listDeliveryPartners error:", error);
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
    const generatedPassword = generatePassword();

    const updated = await prisma.$transaction(async (tx) => {
      const rider = await tx.riderProfile.findUnique({
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

      const generatedUsername = await generateUniqueUsername(
        tx,
        rider.user.name ?? rider.user.email.split("@")[0] ?? "delivery",
      );
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

      return tx.riderProfile.update({
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
    } catch (emailError) {
      console.error("approveDeliveryPartner email send error:", emailError);
    }

    return res.json({
      message: "Delivery partner approved and credentials emailed",
      partner: updated,
    });
  } catch (error) {
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

export async function rejectDeliveryPartner(req: Request, res: Response) {
  try {
    const rawId = (req.params as { id?: unknown }).id;
    if (typeof rawId !== "string" || !rawId.trim()) {
      return res.status(400).json({ message: "Partner id is required" });
    }

    const updated = await prisma.riderProfile.update({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({ message: "Partner not found" });
    }
    console.error("rejectDeliveryPartner error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
