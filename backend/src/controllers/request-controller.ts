import { DeliveryType, RepairJobStatus, RequestMode, RequestStatus } from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { sendOrderStatusEmail } from "../services/email-service.js";

function normalizeRequestStatus(status?: string): RequestStatus | undefined {
  if (!status) return undefined;
  return Object.values(RequestStatus).includes(status as RequestStatus)
    ? (status as RequestStatus)
    : undefined;
}

function normalizeDeliveryType(input?: string): DeliveryType | null {
  if (!input) return null;
  return Object.values(DeliveryType).includes(input as DeliveryType)
    ? (input as DeliveryType)
    : null;
}

function normalizeRequestMode(input?: string): RequestMode {
  if (input && Object.values(RequestMode).includes(input as RequestMode)) {
    return input as RequestMode;
  }
  return RequestMode.CHECKUP_AND_REPAIR;
}

export async function createRepairRequest(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const {
      title,
      description,
      deviceType,
      brand,
      model,
      issueCategory,
      problem,
      mode,
      preferredPickup,
      deliveryType,
      shopSlug,
    } = req.body as Record<string, string | boolean | undefined>;

    if (!title || !deviceType || !problem) {
      return res.status(400).json({ message: "title, deviceType and problem are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    let matchedShop = null as null | { id: string; name: string; slug: string };

    if (typeof shopSlug === "string" && shopSlug.trim()) {
      matchedShop = await prisma.shop.findUnique({
        where: { slug: shopSlug.trim() },
        select: { id: true, name: true, slug: true },
      });

      if (!matchedShop) {
        return res.status(404).json({ message: "Selected shop was not found" });
      }
    } else {
      matchedShop = await prisma.shop.findFirst({
        where: { isActive: true },
        orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
        select: { id: true, name: true, slug: true },
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.create({
        data: {
          userId,
          title: String(title).trim(),
          description: typeof description === "string" ? description.trim() : null,
          deviceType: String(deviceType).trim(),
          brand: typeof brand === "string" ? brand.trim() : null,
          model: typeof model === "string" ? model.trim() : null,
          issueCategory: typeof issueCategory === "string" ? issueCategory.trim() : null,
          problem: String(problem).trim(),
          imageUrls: [],
          mode: normalizeRequestMode(typeof mode === "string" ? mode : undefined),
          preferredPickup: Boolean(preferredPickup),
          deliveryType: normalizeDeliveryType(typeof deliveryType === "string" ? deliveryType : undefined),
          status: matchedShop ? RequestStatus.ASSIGNED : RequestStatus.PENDING,
        },
      });

      let repairJob = null;

      if (matchedShop) {
        repairJob = await tx.repairJob.create({
          data: {
            repairRequestId: request.id,
            shopId: matchedShop.id,
            status: RepairJobStatus.CREATED,
          },
          select: {
            id: true,
            status: true,
            shop: { select: { id: true, name: true, slug: true } },
          },
        });
      }

      return { request, repairJob };
    });

    if (user?.email) {
      await sendOrderStatusEmail({
        to: user.email,
        customerName: user.name,
        orderTitle: created.request.title,
        status: created.request.status,
        shopName: matchedShop?.name,
      }).catch((error) => console.error("request created email failed", error));
    }

    return res.status(201).json({
      message: "Repair request created",
      request: created.request,
      matchedShop,
      repairJob: created.repairJob,
    });
  } catch (error) {
    console.error("createRepairRequest error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function listMyRequests(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const status = normalizeRequestStatus(typeof req.query.status === "string" ? req.query.status : undefined);

    const requests = await prisma.repairRequest.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        deviceType: true,
        brand: true,
        model: true,
        problem: true,
        mode: true,
        status: true,
        preferredPickup: true,
        deliveryType: true,
        createdAt: true,
        repairJob: {
          select: {
            id: true,
            status: true,
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
                ratingAvg: true,
              },
            },
            deliveries: {
              orderBy: { createdAt: "desc" },
              take: 2,
              select: {
                id: true,
                direction: true,
                status: true,
                riderName: true,
                riderPhone: true,
                trackingCode: true,
                scheduledAt: true,
              },
            },
          },
        },
      },
    });

    return res.json(requests);
  } catch (error) {
    console.error("listMyRequests error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateRequestStatus(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { requestId } = req.params;
    const { status } = req.body as { status?: string };

    const nextStatus = normalizeRequestStatus(status);
    if (!nextStatus) {
      return res.status(400).json({ message: "Valid status is required" });
    }

    const existing = await prisma.repairRequest.findFirst({
      where: { id: requestId, userId },
      select: {
        id: true,
        title: true,
        user: { select: { email: true, name: true } },
        repairJob: { select: { id: true, shop: { select: { name: true } } } },
      },
    });

    if (!existing) return res.status(404).json({ message: "Request not found" });

    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.repairRequest.update({
        where: { id: requestId },
        data: { status: nextStatus },
      });

      if (existing.repairJob?.id) {
        const jobStatusMap: Partial<Record<RequestStatus, RepairJobStatus>> = {
          ASSIGNED: RepairJobStatus.CREATED,
          PICKUP_SCHEDULED: RepairJobStatus.PICKUP_SCHEDULED,
          PICKED_UP: RepairJobStatus.PICKED_UP,
          AT_SHOP: RepairJobStatus.AT_SHOP,
          DIAGNOSING: RepairJobStatus.DIAGNOSING,
          WAITING_APPROVAL: RepairJobStatus.WAITING_APPROVAL,
          REPAIRING: RepairJobStatus.REPAIRING,
          RETURNING: RepairJobStatus.RETURNING,
          COMPLETED: RepairJobStatus.COMPLETED,
          CANCELLED: RepairJobStatus.CANCELLED,
        };

        const mapped = jobStatusMap[nextStatus];
        if (mapped) {
          await tx.repairJob.update({
            where: { id: existing.repairJob.id },
            data: {
              status: mapped,
              ...(mapped === RepairJobStatus.COMPLETED ? { completedAt: new Date() } : {}),
            },
          });
        }
      }

      return request;
    });

    if (existing.user.email) {
      await sendOrderStatusEmail({
        to: existing.user.email,
        customerName: existing.user.name,
        orderTitle: existing.title,
        status: updated.status,
        shopName: existing.repairJob?.shop.name,
      }).catch((error) => console.error("status email failed", error));
    }

    return res.json({ message: "Request status updated", request: updated });
  } catch (error) {
    console.error("updateRequestStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
