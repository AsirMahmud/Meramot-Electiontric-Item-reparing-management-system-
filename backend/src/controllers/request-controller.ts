import {
  DeliveryDirection,
  DeliveryStatus,
  DeliveryType,
  RepairJobStatus,
  RequestMode,
  RequestSource,
  RequestStatus,
} from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthenticatedRequest as AuthedRequest } from "../middleware/require-auth.js";
import { sendOrderStatusEmail } from "../services/email-service.js";

const REGULAR_DELIVERY_FEE = 80;
const EXPRESS_DELIVERY_FEE = 150;

function normalizeText(input: unknown) {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeRequestStatus(status?: string): RequestStatus | undefined {
  if (!status) return undefined;
  return Object.values(RequestStatus).includes(status as RequestStatus)
    ? (status as RequestStatus)
    : undefined;
}

function normalizeDeliveryType(input?: string): DeliveryType {
  return input === DeliveryType.EXPRESS ? DeliveryType.EXPRESS : DeliveryType.REGULAR;
}

function calculateDeliveryFee(type: DeliveryType) {
  return type === DeliveryType.EXPRESS ? EXPRESS_DELIVERY_FEE : REGULAR_DELIVERY_FEE;
}

function normalizeRequestMode(input?: string): RequestMode {
  if (input && Object.values(RequestMode).includes(input as RequestMode)) {
    return input as RequestMode;
  }
  return RequestMode.CHECKUP_AND_REPAIR;
}

function normalizeScheduledAt(input?: string, when?: string) {
  if (when === "NOW") return new Date();
  if (!input) return null;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function includesNormalized(value: string | null | undefined, needle: string) {
  if (!value || !needle) return false;
  return value.toLowerCase().includes(needle.toLowerCase());
}

function normalizeNumber(input: unknown) {
  if (typeof input === "number") return Number.isFinite(input) ? input : undefined;
  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

type CandidateService = {
  id: string;
  deviceType: string | null;
  issueCategory: string | null;
  includesPickup: boolean;
  includesDelivery: boolean;
  basePrice: number | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    address: string;
    city: string | null;
    area: string | null;
    ratingAvg: number;
    reviewCount: number;
    priceLevel: number;
    supportsPickup: boolean;
    acceptsDirectOrders: boolean;
    specialties: string[];
  };
};

type MatchedShop = {
  id: string;
  name: string;
  slug: string;
  address: string;
  serviceId?: string | null;
};

async function findBestShopMatch(params: {
  deviceType: string;
  issueCategory?: string;
  problem: string;
  preferredPickup: boolean;
  city?: string;
  area?: string;
}): Promise<MatchedShop | null> {
  const device = params.deviceType.toLowerCase();
  const issue = (params.issueCategory || "").toLowerCase();
  const problem = params.problem.toLowerCase();

  const serviceCandidates = await prisma.shopService.findMany({
    where: {
      isActive: true,
      shop: {
        isActive: true,
        acceptsDirectOrders: true,
      },
      OR: [
        {
          deviceType: {
            contains: params.deviceType,
            mode: "insensitive" as const,
          },
        },
        ...(params.issueCategory
          ? [
              {
                issueCategory: {
                  contains: params.issueCategory,
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
          city: true,
          area: true,
          ratingAvg: true,
          reviewCount: true,
          priceLevel: true,
          supportsPickup: true,
          acceptsDirectOrders: true,
          specialties: true,
        },
      },
    },
    take: 100,
  });

  const scored = serviceCandidates.map((service: CandidateService) => {
    let score = 0;

    if (includesNormalized(service.deviceType, device)) score += 45;
    if (issue && includesNormalized(service.issueCategory, issue)) score += 45;

    if (params.preferredPickup && service.shop.supportsPickup) score += 18;
    if (params.preferredPickup && service.includesPickup) score += 12;
    if (service.includesDelivery) score += 6;

    if (params.city && service.shop.city?.toLowerCase() === params.city.toLowerCase()) score += 14;
    if (params.area && service.shop.area?.toLowerCase() === params.area.toLowerCase()) score += 18;

    if (
      service.shop.specialties.some(
        (specialty) =>
          problem.includes(specialty.toLowerCase()) || issue.includes(specialty.toLowerCase())
      )
    ) {
      score += 10;
    }

    score += service.shop.ratingAvg * 6;
    score += Math.min(service.shop.reviewCount, 100) / 10;
    score -= Math.max(0, service.shop.priceLevel - 2) * 2;

    return { service, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const bestService = scored[0]?.service;
  if (bestService) {
    return {
      id: bestService.shop.id,
      name: bestService.shop.name,
      slug: bestService.shop.slug,
      address: bestService.shop.address,
      serviceId: bestService.id,
    };
  }

  const fallbackShop = await prisma.shop.findFirst({
    where: {
      isActive: true,
      acceptsDirectOrders: true,
      OR: [
        { specialties: { has: params.deviceType } },
        ...(params.issueCategory ? [{ specialties: { has: params.issueCategory } }] : []),
      ],
    },
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
    select: { id: true, name: true, slug: true, address: true },
  });

  if (fallbackShop) return { ...fallbackShop, serviceId: null };

  const topShop = await prisma.shop.findFirst({
    where: {
      isActive: true,
      acceptsDirectOrders: true,
    },
    orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
    select: { id: true, name: true, slug: true, address: true },
  });

  return topShop ? { ...topShop, serviceId: null } : null;
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
      scheduleType,
      scheduledAt,
      addressMode,
      address,
      city,
      area,
      lat,
      lng,
      pickupLat,
      pickupLng,
      contactPhone,
    } = req.body as Record<string, string | boolean | number | undefined>;

    const cleanTitle = normalizeText(title);
    const cleanDeviceType = normalizeText(deviceType);
    const cleanProblem = normalizeText(problem);
    const cleanIssueCategory = normalizeText(issueCategory);

    if (!cleanTitle || !cleanDeviceType || !cleanProblem || !cleanIssueCategory) {
      return res.status(400).json({
        message: "title, deviceType, issueCategory and problem are required",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
      },
    });

    const resolvedLat = normalizeNumber(lat ?? pickupLat);
    const resolvedLng = normalizeNumber(lng ?? pickupLng);

    const chosenAddress =
      addressMode === "PROFILE"
        ? user?.address || normalizeText(address)
        : normalizeText(address) || user?.address || "";

    if (preferredPickup && !chosenAddress.trim()) {
      return res.status(400).json({
        message: "Pickup address is required when pickup is preferred",
      });
    }

    const pickupTime = normalizeScheduledAt(
      typeof scheduledAt === "string" ? scheduledAt : undefined,
      typeof scheduleType === "string" ? scheduleType : undefined
    );

    if (scheduleType === "LATER" && !pickupTime) {
      return res.status(400).json({
        message: "Valid scheduledAt is required for later bookings",
      });
    }

    const selectedDeliveryType = normalizeDeliveryType(
      typeof deliveryType === "string" ? deliveryType : undefined
    );

    const deliveryFee = calculateDeliveryFee(selectedDeliveryType);

    let matchedShop: MatchedShop | null = null;

    if (typeof shopSlug === "string" && shopSlug.trim()) {
      const selectedShop = await prisma.shop.findFirst({
        where: {
          slug: shopSlug.trim(),
          isActive: true,
          acceptsDirectOrders: true,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          address: true,
        },
      });

      if (!selectedShop) {
        return res.status(404).json({
          message: "Selected shop was not found or is not accepting orders",
        });
      }

      matchedShop = { ...selectedShop, serviceId: null };
    } else {
      matchedShop = await findBestShopMatch({
        deviceType: cleanDeviceType,
        issueCategory: cleanIssueCategory,
        problem: cleanProblem,
        preferredPickup: Boolean(preferredPickup),
        city: normalizeText(city) || user?.city || undefined,
        area: normalizeText(area) || user?.area || undefined,
      });
    }

    const created = await prisma.$transaction(async (tx) => {
      if ((addressMode === "MANUAL" || addressMode === "MAP") && chosenAddress.trim()) {
        await tx.user.update({
          where: { id: userId },
          data: {
            address: chosenAddress.trim(),
            city: normalizeText(city) || user?.city,
            area: normalizeText(area) || user?.area,
            lat: resolvedLat ?? user?.lat,
            lng: resolvedLng ?? user?.lng,
            phone: normalizeText(contactPhone) || user?.phone,
          },
        });
      }

      const request = await tx.repairRequest.create({
        data: {
          userId,
          source: shopSlug ? RequestSource.DIRECT_CUSTOM_SHOP : RequestSource.MARKETPLACE,
          requestedShopId: matchedShop?.id || null,
          requestedServiceId: matchedShop?.serviceId || null,
          title: cleanTitle,
          description:
            normalizeText(description) ||
            `Customer repair request
Schedule: ${scheduleType === "NOW" ? "Now" : pickupTime?.toISOString() || "Not scheduled"}
Delivery: ${selectedDeliveryType}
Pickup address: ${chosenAddress || "Not provided"}`,
          deviceType: cleanDeviceType,
          brand: normalizeText(brand) || null,
          model: normalizeText(model) || null,
          issueCategory: cleanIssueCategory,
          problem: cleanProblem,
          imageUrls: [],
          mode: normalizeRequestMode(typeof mode === "string" ? mode : undefined),
          preferredPickup: Boolean(preferredPickup),
          deliveryType: selectedDeliveryType,
          contactPhone: normalizeText(contactPhone) || user?.phone || null,
          pickupAddress: chosenAddress.trim() || null,
          dropoffAddress: matchedShop?.address || null,
          checkupFee: null,
          quotedFinalAmount: Boolean(preferredPickup) ? deliveryFee : null,
          status: matchedShop ? RequestStatus.ASSIGNED : RequestStatus.PENDING,
        },
      });

      let repairJob = null;
      let delivery = null;

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
            shop: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        if (Boolean(preferredPickup) && chosenAddress.trim()) {
          delivery = await tx.delivery.create({
            data: {
              repairJobId: repairJob.id,
              direction: DeliveryDirection.TO_SHOP,
              type: selectedDeliveryType,
              status: DeliveryStatus.SCHEDULED,
              fee: deliveryFee,
              pickupAddress: chosenAddress.trim(),
              dropAddress: matchedShop.address,
              scheduledAt: pickupTime,
            },
          });

          await tx.repairJob.update({
            where: { id: repairJob.id },
            data: { status: RepairJobStatus.PICKUP_SCHEDULED },
          });

          await tx.repairRequest.update({
            where: { id: request.id },
            data: { status: RequestStatus.PICKUP_SCHEDULED },
          });
        }
      }

      const finalRequest = await tx.repairRequest.findUnique({
        where: { id: request.id },
      });

      return {
        request: finalRequest || request,
        repairJob,
        delivery,
      };
    });

    if (user?.email) {
      await sendOrderStatusEmail({
        to: user.email,
        customerName: user.name,
        orderTitle: created.request.id,
        status: created.request.status,
        shopName: matchedShop?.name,
      }).catch((error) => console.error("request created email failed", error));
    }

    return res.status(201).json({
      message: "Repair request created",
      request: created.request,
      matchedShop,
      repairJob: created.repairJob,
      delivery: created.delivery,
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

    const statusRaw = req.query.status as string | undefined;
    const status = normalizeRequestStatus(statusRaw);

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
        issueCategory: true,
        problem: true,
        mode: true,
        status: true,
        preferredPickup: true,
        deliveryType: true,
        pickupAddress: true,
        dropoffAddress: true,
        createdAt: true,
        requestedShop: {
          select: {
            id: true,
            name: true,
            slug: true,
            ratingAvg: true,
          },
        },
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

    const requestId = req.params.requestId as string;
    const { status } = req.body as { status?: string };

    const nextStatus = normalizeRequestStatus(status);
    if (!nextStatus) return res.status(400).json({ message: "Valid status is required" });

    const existing = await prisma.repairRequest.findFirst({
      where: {
        id: requestId,
        userId,
      },
      select: {
        id: true,
        title: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
        repairJob: {
          select: {
            id: true,
            shop: {
              select: {
                name: true,
              },
            },
          },
        },
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
        orderTitle: existing.id,
        status: updated.status,
        shopName: existing.repairJob?.shop.name,
      }).catch((error) => console.error("status email failed", error));
    }

    return res.json({
      message: "Request status updated",
      request: updated,
    });
  } catch (error) {
    console.error("updateRequestStatus error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
