// @ts-nocheck
import { BidStatus, RepairJobStatus, RequestStatus } from "@prisma/client";
import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { sendOrderStatusEmail } from "../services/email-service.js";

type QuoteItemInput = {
  label?: string;
  description?: string | null;
  amount?: number | string;
};

type NormalizedQuoteItem = {
  label: string;
  description?: string | null;
  amount: number;
};

class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

function tokenize(parts: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      parts
        .join(" ")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length > 1),
    ),
  );
}

function buildRelevance(
  request: {
    title: string;
    deviceType: string;
    brand: string | null;
    model: string | null;
    issueCategory: string | null;
    problem: string;
  },
  skillTags: string[],
) {
  if (!skillTags.length) {
    return {
      isRelevant: true,
      score: 1,
      reasons: ["No skill tags configured yet"],
    };
  }

  const requestText = [
    request.title,
    request.deviceType,
    request.brand,
    request.model,
    request.issueCategory,
    request.problem,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const requestTokens = new Set(
    tokenize([
      request.title,
      request.deviceType,
      request.brand,
      request.model,
      request.issueCategory,
      request.problem,
    ]),
  );

  let score = 0;
  const reasons = new Set<string>();

  for (const rawSkill of skillTags) {
    const skill = rawSkill.trim();
    if (!skill) continue;

    const loweredSkill = skill.toLowerCase();
    const skillTokens = tokenize([skill]);
    const overlaps = skillTokens.filter((token) => requestTokens.has(token));

    if (requestText.includes(loweredSkill)) {
      score += Math.max(6, skillTokens.length * 2);
      reasons.add(`Matched skill tag: ${skill}`);
      continue;
    }

    if (overlaps.length > 0) {
      score += overlaps.length * 3;
      reasons.add(`Matched ${skill} via ${overlaps.slice(0, 2).join(", ")}`);
    }
  }

  return {
    isRelevant: score > 0,
    score,
    reasons: Array.from(reasons).slice(0, 3),
  };
}

function normalizeMoney(value: number | string | null | undefined, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    throw new HttpError(400, `${fieldName} is required`);
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new HttpError(400, `${fieldName} must be a valid non-negative number`);
  }

  return Number(parsed.toFixed(2));
}

function normalizeOptionalInteger(value: number | string | null | undefined, fieldName: string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new HttpError(400, `${fieldName} must be a valid non-negative integer`);
  }

  return parsed;
}

function normalizeQuoteItems(items: QuoteItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new HttpError(400, "Add at least one item to the final quote");
  }

  const normalized = items
    .map((item) => {
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      const description =
        typeof item?.description === "string" ? item.description.trim() : undefined;
      const amount = Number(item?.amount);

      if (!label) {
        throw new HttpError(400, "Each final quote item needs a label");
      }

      if (!Number.isFinite(amount) || amount < 0) {
        throw new HttpError(400, `Final quote amount for ${label} must be valid`);
      }

      if (amount > 500000) {
        throw new HttpError(400, `Final quote amount for ${label} exceeds the maximum allowed (৳500,000)`);
      }

      return {
        label,
        description: description || null,
        amount: Number(amount.toFixed(2)),
      } satisfies NormalizedQuoteItem;
    })
    .filter((item) => item.amount > 0);

  if (!normalized.length) {
    throw new HttpError(400, "Final quote must contain at least one amount greater than zero");
  }

  return normalized;
}

async function getVendorContext(userId: string) {
  const application = await prisma.vendorApplication.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      shopName: true,
      businessEmail: true,
      specialties: true,
      courierPickup: true,
      inShopRepair: true,
      spareParts: true,
    },
  });

  if (!application) {
    throw new HttpError(404, "Vendor application not found");
  }

  if (application.status !== "APPROVED") {
    throw new HttpError(403, "Your vendor application is not approved yet");
  }

  // Look up by vendorApplicationId (direct FK) first, fall back to email
  const shop = await prisma.shop.findFirst({
    where: {
      OR: [
        { vendorApplicationId: application.id },
        ...(application.businessEmail ? [{ email: application.businessEmail }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      setupComplete: true,
      isPublic: true,
      inspectionFee: true,
      baseLaborFee: true,
      pickupFee: true,
      expressFee: true,
      categories: true,
      specialties: true,
      ratingAvg: true,
      reviewCount: true,
    },
  });

  if (!shop) {
    throw new HttpError(404, "Approved vendor shop record not found");
  }

  if (!shop.setupComplete) {
    throw new HttpError(400, "Complete your shop setup before accessing the vendor dashboard");
  }

  return { application, shop };
}

function normalizeVendorJobStatus(input?: string) {
  const value = (input || "").trim().toUpperCase();

  switch (value) {
    case RepairJobStatus.AT_SHOP:
      return RepairJobStatus.AT_SHOP;
    case RepairJobStatus.DIAGNOSING:
      return RepairJobStatus.DIAGNOSING;
    case RepairJobStatus.REPAIRING:
      return RepairJobStatus.REPAIRING;
    case RepairJobStatus.COMPLETED:
      return RepairJobStatus.COMPLETED;
    case RepairJobStatus.CANCELLED:
      return RepairJobStatus.CANCELLED;
    default:
      return null;
  }
}

function toRequestStatus(jobStatus: RepairJobStatus) {
  switch (jobStatus) {
    case RepairJobStatus.AT_SHOP:
      return RequestStatus.AT_SHOP;
    case RepairJobStatus.DIAGNOSING:
      return RequestStatus.DIAGNOSING;
    case RepairJobStatus.REPAIRING:
      return RequestStatus.REPAIRING;
    case RepairJobStatus.COMPLETED:
      return RequestStatus.COMPLETED;
    case RepairJobStatus.CANCELLED:
      return RequestStatus.CANCELLED;
    default:
      return RequestStatus.ASSIGNED;
  }
}


function roundMoney(value: number) {
  return Number(value.toFixed(2));
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

type AnalyticsBucket = {
  key: string;
  label: string;
  start: Date;
  end: Date;
  earnings: number;
  bidsWon: number;
  completedJobs: number;
};

function buildAnalyticsBuckets(now: Date, months: number) {
  const currentStart = startOfMonth(now);
  const buckets: AnalyticsBucket[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const start = new Date(currentStart.getFullYear(), currentStart.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);

    buckets.push({
      key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
      label: monthLabel(start),
      start,
      end,
      earnings: 0,
      bidsWon: 0,
      completedJobs: 0,
    });
  }

  return buckets;
}

function findBucketIndex(date: Date | null | undefined, buckets: AnalyticsBucket[]) {
  if (!date) return -1;
  const time = date.getTime();
  return buckets.findIndex((bucket) => time >= bucket.start.getTime() && time < bucket.end.getTime());
}

function getJobEarnings(job: {
  finalQuotedAmount: number | null;
  acceptedBid: { totalCost: number } | null;
}) {
  if (typeof job.finalQuotedAmount === "number" && Number.isFinite(job.finalQuotedAmount)) {
    return roundMoney(job.finalQuotedAmount);
  }

  if (typeof job.acceptedBid?.totalCost === "number" && Number.isFinite(job.acceptedBid.totalCost)) {
    return roundMoney(job.acceptedBid.totalCost);
  }

  return 0;
}

export async function getVendorDashboard(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (role !== "VENDOR") {
      return res.status(403).json({ message: "Vendor access only" });
    }

    const { application, shop } = await getVendorContext(userId);

    // Build DB-level filter from shop specialties to avoid fetching all open
    // requests into memory (OOM risk at scale).
    const specialtyTokens = shop.specialties
      .flatMap((s: string) =>
        s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((t: string) => t.length > 1),
      );
    const uniqueTokens = Array.from(new Set(specialtyTokens));

    // Build OR conditions that match specialty tokens against request text fields
    const specialtyFilter =
      uniqueTokens.length > 0
        ? {
            OR: uniqueTokens.flatMap((token: string) => [
              { deviceType: { contains: token, mode: "insensitive" as const } },
              { brand: { contains: token, mode: "insensitive" as const } },
              { issueCategory: { contains: token, mode: "insensitive" as const } },
              { title: { contains: token, mode: "insensitive" as const } },
              { problem: { contains: token, mode: "insensitive" as const } },
            ]),
          }
        : {};

    const biddingRequests = await prisma.repairRequest.findMany({
      where: {
        status: RequestStatus.BIDDING,
        bids: { none: { shopId: shop.id } },
        ...specialtyFilter,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        description: true,
        deviceType: true,
        brand: true,
        model: true,
        issueCategory: true,
        problem: true,
        mode: true,
        preferredPickup: true,
        deliveryType: true,
        status: true,
        createdAt: true,
        _count: { select: { bids: true } },
        bids: {
          where: { shopId: shop.id },
          take: 1,
          select: {
            id: true,
            partsCost: true,
            laborCost: true,
            totalCost: true,
            estimatedDays: true,
            notes: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Build a map of lowest bid per request for competitive context
    const requestIds = biddingRequests.map((r) => r.id);
    const lowestBids = await prisma.bid.groupBy({
      by: ["repairRequestId"],
      where: { repairRequestId: { in: requestIds }, status: BidStatus.ACTIVE },
      _min: { totalCost: true },
    });
    const lowestBidMap = new Map(
      lowestBids.map((lb) => [lb.repairRequestId, lb._min.totalCost])
    );

    const relevantRequests = biddingRequests
      .map((request) => {
        const relevance = buildRelevance(request, shop.specialties);
        const myBid = request.bids[0] ?? null;

        if (!relevance.isRelevant && !myBid) {
          return null;
        }

        return {
          id: request.id,
          title: request.title,
          description: request.description,
          deviceType: request.deviceType,
          brand: request.brand,
          model: request.model,
          issueCategory: request.issueCategory,
          problem: request.problem,
          mode: request.mode,
          preferredPickup: request.preferredPickup,
          deliveryType: request.deliveryType,
          status: request.status,
          createdAt: request.createdAt,
          bidCount: request._count.bids,
          lowestBidAmount: lowestBidMap.get(request.id) ?? null,
          myBid,
          relevanceScore: relevance.score,
          matchReasons: relevance.reasons,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const left = a as NonNullable<typeof a>;
        const right = b as NonNullable<typeof b>;
        if (right.relevanceScore !== left.relevanceScore) {
          return right.relevanceScore - left.relevanceScore;
        }
        return right.createdAt.getTime() - left.createdAt.getTime();
      });

    const myBids = await prisma.bid.findMany({
      where: { shopId: shop.id },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        partsCost: true,
        laborCost: true,
        totalCost: true,
        estimatedDays: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        repairRequest: {
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
            createdAt: true,
          },
        },
      },
    });

    const assignedJobs = await prisma.repairJob.findMany({
      where: {
        shopId: shop.id,
        status: {
          notIn: [RepairJobStatus.COMPLETED, RepairJobStatus.CANCELLED],
        },
      },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        status: true,
        diagnosisNotes: true,
        finalQuotedAmount: true,
        finalQuoteItems: true,
        customerApproved: true,
        createdAt: true,
        updatedAt: true,
        acceptedBid: {
          select: {
            id: true,
            partsCost: true,
            laborCost: true,
            totalCost: true,
            estimatedDays: true,
            notes: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        repairRequest: {
          select: {
            id: true,
            title: true,
            description: true,
            deviceType: true,
            brand: true,
            model: true,
            issueCategory: true,
            problem: true,
            mode: true,
            preferredPickup: true,
            deliveryType: true,
            status: true,
            quotedFinalAmount: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    const completedJobCount = await prisma.repairJob.count({
      where: {
        shopId: shop.id,
        status: RepairJobStatus.COMPLETED,
      },
    });

    return res.json({
      application,
      shop,
      stats: {
        relevantRequestCount: relevantRequests.length,
        activeBidCount: myBids.filter((bid) => bid.status === BidStatus.ACTIVE).length,
        assignedJobCount: assignedJobs.length,
        waitingApprovalCount: assignedJobs.filter(
          (job) => job.status === RepairJobStatus.WAITING_APPROVAL,
        ).length,
        completedJobCount,
      },
      relevantRequests,
      myBids,
      assignedJobs,
    });
  } catch (error) {
    console.error("getVendorDashboard error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}


export async function getVendorAnalytics(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (role !== "VENDOR") {
      return res.status(403).json({ message: "Vendor access only" });
    }

    const { shop } = await getVendorContext(userId);
    const now = new Date();
    const buckets = buildAnalyticsBuckets(now, 6);
    const historyStart = buckets[0]?.start ?? startOfMonth(now);

    const jobs = await prisma.repairJob.findMany({
      where: {
        shopId: shop.id,
        OR: [
          { createdAt: { gte: historyStart } },
          { completedAt: { gte: historyStart } },
        ],
      },
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        acceptedBidId: true,
        status: true,
        createdAt: true,
        completedAt: true,
        finalQuotedAmount: true,
        acceptedBid: {
          select: {
            totalCost: true,
          },
        },
      },
    });

    for (const job of jobs) {
      if (job.acceptedBidId) {
        const wonIndex = findBucketIndex(job.createdAt, buckets);
        if (wonIndex >= 0) {
          buckets[wonIndex].bidsWon += 1;
        }
      }

      if (job.status === RepairJobStatus.COMPLETED && job.completedAt) {
        const earningsIndex = findBucketIndex(job.completedAt, buckets);
        if (earningsIndex >= 0) {
          buckets[earningsIndex].earnings = roundMoney(
            buckets[earningsIndex].earnings + getJobEarnings(job),
          );
          buckets[earningsIndex].completedJobs += 1;
        }
      }
    }

    const recentRatings = await prisma.rating.findMany({
      where: { shopId: shop.id },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        score: true,
        review: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            username: true,
          },
        },
      },
    });

    const currentBucket = buckets[buckets.length - 1] ?? {
      label: monthLabel(now),
      earnings: 0,
      bidsWon: 0,
      completedJobs: 0,
    };

    const bestMonth = buckets.reduce<AnalyticsBucket | null>((best, bucket) => {
      if (!best || bucket.earnings > best.earnings) {
        return bucket;
      }
      return best;
    }, null);

    return res.json({
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
      },
      summary: {
        monthLabel: currentBucket.label,
        totalMonthlyEarnings: roundMoney(currentBucket.earnings),
        bidsWonThisMonth: currentBucket.bidsWon,
        averageCustomerRating: shop.ratingAvg,
        reviewCount: shop.reviewCount,
      },
      trends: buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        earnings: roundMoney(bucket.earnings),
        bidsWon: bucket.bidsWon,
        completedJobs: bucket.completedJobs,
      })),
      recentRatings: recentRatings.map((rating) => ({
        id: rating.id,
        score: rating.score,
        review: rating.review,
        createdAt: rating.createdAt,
        customerName: rating.user.name || rating.user.username || "Customer",
      })),
      insights: {
        bestMonthLabel: bestMonth?.label ?? currentBucket.label,
        bestMonthEarnings: roundMoney(bestMonth?.earnings ?? 0),
        sixMonthBidsWon: buckets.reduce((sum, bucket) => sum + bucket.bidsWon, 0),
        sixMonthCompletedJobs: buckets.reduce((sum, bucket) => sum + bucket.completedJobs, 0),
      },
    });
  } catch (error) {
    console.error("getVendorAnalytics error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}


export async function upsertVendorBid(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const requestId = (req.params.requestId as string) as string;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (role !== "VENDOR") {
      return res.status(403).json({ message: "Vendor access only" });
    }

    const { shop } = await getVendorContext(userId);

    const repairRequest = await prisma.repairRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        title: true,
        deviceType: true,
        brand: true,
        model: true,
        issueCategory: true,
        problem: true,
        status: true,
      },
    });

    if (!repairRequest) {
      return res.status(404).json({ message: "Repair request not found" });
    }

    if (repairRequest.status !== RequestStatus.BIDDING) {
      return res.status(400).json({ message: "This request is no longer accepting bids" });
    }

    const existingBid = await prisma.bid.findUnique({
      where: {
        repairRequestId_shopId: {
          repairRequestId: requestId as string,
          shopId: shop.id,
        },
      },
      select: {
        id: true,
      },
    });

    // Relevance is used for ranking only — vendors are not blocked from bidding
    // on jobs outside their configured skill tags. This prevents false negatives
    // from the naive token-matching algorithm locking out capable vendors.

    const { partsCost, laborCost, estimatedDays, notes } = req.body as {
      partsCost?: number | string;
      laborCost?: number | string;
      estimatedDays?: number | string | null;
      notes?: string;
    };

    const normalizedPartsCost = normalizeMoney(partsCost, "partsCost");
    const normalizedLaborCost = normalizeMoney(laborCost, "laborCost");
    const normalizedEstimatedDays = normalizeOptionalInteger(
      estimatedDays,
      "estimatedDays",
    );

    const bid = await prisma.bid.upsert({
      where: {
        repairRequestId_shopId: {
          repairRequestId: requestId as string,
          shopId: shop.id,
        },
      },
      update: {
        partsCost: normalizedPartsCost,
        laborCost: normalizedLaborCost,
        totalCost: Number((normalizedPartsCost + normalizedLaborCost).toFixed(2)),
        estimatedDays: normalizedEstimatedDays,
        notes: typeof notes === "string" ? notes.trim() || null : null,
        status: BidStatus.ACTIVE,
      },
      create: {
        repairRequestId: requestId as string,
        shopId: shop.id,
        partsCost: normalizedPartsCost,
        laborCost: normalizedLaborCost,
        totalCost: Number((normalizedPartsCost + normalizedLaborCost).toFixed(2)),
        estimatedDays: normalizedEstimatedDays,
        notes: typeof notes === "string" ? notes.trim() || null : null,
        status: BidStatus.ACTIVE,
      },
      select: {
        id: true,
        partsCost: true,
        laborCost: true,
        totalCost: true,
        estimatedDays: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(existingBid ? 200 : 201).json({
      message: existingBid ? "Bid updated successfully" : "Bid placed successfully",
      bid,
    });
  } catch (error) {
    console.error("upsertVendorBid error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateVendorAssignedJobStatus(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const jobId = (req.params.jobId as string) as string;
    const { status, reason } = req.body as { status?: string; reason?: string };

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (role !== "VENDOR") {
      return res.status(403).json({ message: "Vendor access only" });
    }

    const { shop } = await getVendorContext(userId);
    const nextStatus = normalizeVendorJobStatus(status);

    if (!nextStatus) {
      return res.status(400).json({
        message: "Use one of these statuses: AT_SHOP, DIAGNOSING, REPAIRING, COMPLETED, CANCELLED",
      });
    }

    const existing = await prisma.repairJob.findFirst({
      where: {
        id: jobId,
        shopId: shop.id,
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finalQuotedAmount: true,
        customerApproved: true,
        repairRequestId: true,
        repairRequest: {
          select: {
            id: true,
            title: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Assigned job not found" });
    }

    if (nextStatus === RepairJobStatus.REPAIRING) {
      if (existing.finalQuotedAmount === null) {
        return res.status(400).json({ message: "You must submit a final quote first." });
      }
      if (existing.customerApproved !== true) {
        return res.status(400).json({ message: "The customer must approve the final quote before repair can continue" });
      }
    }

    // Require a reason when cancelling a job for accountability
    if (nextStatus === RepairJobStatus.CANCELLED) {
      const trimmedReason = typeof reason === "string" ? reason.trim() : "";
      if (!trimmedReason) {
        return res.status(400).json({ message: "A cancellation reason is required" });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const repairJob = await tx.repairJob.update({
        where: { id: jobId as string },
        data: {
          status: nextStatus,
          startedAt:
            nextStatus === RepairJobStatus.REPAIRING && !existing.startedAt
              ? new Date()
              : existing.startedAt,
          completedAt:
            nextStatus === RepairJobStatus.COMPLETED ? new Date() : undefined,
          // Store cancellation reason in diagnosisNotes for admin auditing
          ...(nextStatus === RepairJobStatus.CANCELLED && typeof reason === "string"
            ? { diagnosisNotes: `[CANCELLED] ${reason.trim()}` }
            : {}),
        },
        select: {
          id: true,
          status: true,
          startedAt: true,
          completedAt: true,
          updatedAt: true,
        },
      });

      const request = await tx.repairRequest.update({
        where: { id: existing.repairRequestId },
        data: {
          status: toRequestStatus(nextStatus),
        },
        select: {
          id: true,
          status: true,
        },
      });

      return { repairJob, request };
    });

    if (existing.repairRequest.user.email) {
      await sendOrderStatusEmail({
        to: existing.repairRequest.user.email,
        customerName: existing.repairRequest.user.name,
        orderRef: existing.repairRequest.title,
        status: result.request.status,
        shopName: shop.name,
      }).catch((error) => console.error("vendor job status email failed", error));
    }

    return res.json({
      message: "Assigned job status updated",
      repairJob: result.repairJob,
      request: result.request,
    });
  } catch (error) {
    console.error("updateVendorAssignedJobStatus error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

export async function submitVendorFinalQuote(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const jobId = (req.params.jobId as string) as string;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (role !== "VENDOR") {
      return res.status(403).json({ message: "Vendor access only" });
    }

    const { shop } = await getVendorContext(userId);
    const { diagnosisNotes, items } = req.body as {
      diagnosisNotes?: string;
      items?: QuoteItemInput[];
    };

    const normalizedDiagnosis = typeof diagnosisNotes === "string" ? diagnosisNotes.trim() : "";
    if (!normalizedDiagnosis) {
      return res.status(400).json({ message: "Diagnosis notes are required" });
    }

    const normalizedItems = normalizeQuoteItems(items || []);
    const finalQuotedAmount = Number(
      normalizedItems.reduce((sum, item) => sum + item.amount, 0).toFixed(2),
    );

    const existing = await prisma.repairJob.findFirst({
      where: {
        id: jobId,
        shopId: shop.id,
      },
      select: {
        id: true,
        status: true,
        repairRequestId: true,
        repairRequest: {
          select: {
            id: true,
            title: true,
            user: { select: { email: true, name: true } },
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "Assigned job not found" });
    }

    if (
      existing.status === RepairJobStatus.COMPLETED ||
      existing.status === RepairJobStatus.CANCELLED
    ) {
      return res.status(400).json({ message: "This job is already closed" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const repairJob = await tx.repairJob.update({
        where: { id: jobId as string },
        data: {
          status: RepairJobStatus.WAITING_APPROVAL,
          diagnosisNotes: normalizedDiagnosis,
          finalQuotedAmount,
          finalQuoteItems: normalizedItems as unknown as object,
          customerApproved: null,
        },
        select: {
          id: true,
          status: true,
          diagnosisNotes: true,
          finalQuotedAmount: true,
          finalQuoteItems: true,
          customerApproved: true,
          updatedAt: true,
        },
      });

      const request = await tx.repairRequest.update({
        where: { id: existing.repairRequestId },
        data: {
          status: RequestStatus.WAITING_APPROVAL,
          quotedFinalAmount: finalQuotedAmount,
        },
        select: {
          id: true,
          status: true,
          quotedFinalAmount: true,
        },
      });

      return { repairJob, request };
    });

    if (existing.repairRequest.user.email) {
      await sendOrderStatusEmail({
        to: existing.repairRequest.user.email,
        customerName: existing.repairRequest.user.name,
        orderRef: existing.repairRequest.title,
        status: result.request.status,
        shopName: shop.name,
      }).catch((error) => console.error("vendor final quote email failed", error));
    }

    return res.json({
      message: "Final diagnosis and quote submitted successfully",
      repairJob: result.repairJob,
      request: result.request,
    });
  } catch (error) {
    console.error("submitVendorFinalQuote error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /vendor/requests/my-bids
 *
 * Returns every repair request where this vendor placed a bid,
 * together with ALL competing bids (sorted by totalCost asc).
 * Each bid carries `isOwn: true|false` so the frontend can
 * highlight the vendor's position in the price ranking.
 */
export async function getVendorMyBids(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { shop } = await getVendorContext(userId);

    // All bids this vendor's shop has placed
    const myBids = await prisma.bid.findMany({
      where: { shopId: shop.id },
      select: { repairRequestId: true },
    });

    const requestIds = [...new Set(myBids.map((b) => b.repairRequestId))];

    if (!requestIds.length) {
      return res.json({ requests: [] });
    }

    // Fetch those requests with ALL their bids
    const requests = await prisma.repairRequest.findMany({
      where: { id: { in: requestIds } },
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
        createdAt: true,
        bids: {
          orderBy: { totalCost: "asc" },
          select: {
            id: true,
            shopId: true,
            partsCost: true,
            laborCost: true,
            totalCost: true,
            estimatedDays: true,
            notes: true,
            status: true,
            createdAt: true,
            shop: {
              select: {
                name: true,
                ratingAvg: true,
                reviewCount: true,
              },
            },
          },
        },
      },
    });

    // Shape the response — flag the vendor's own bids
    const shaped = requests.map((request) => {
      const allBids = request.bids.map((bid, index) => ({
        id: bid.id,
        rank: index + 1,
        shopName: bid.shopId === shop.id ? shop.name : bid.shop.name,
        partsCost: bid.partsCost,
        laborCost: bid.laborCost,
        totalCost: bid.totalCost,
        estimatedDays: bid.estimatedDays,
        notes: bid.notes,
        status: bid.status,
        shopRating: bid.shop.ratingAvg,
        shopReviews: bid.shop.reviewCount,
        isOwn: bid.shopId === shop.id,
        createdAt: bid.createdAt,
      }));

      const myRank = allBids.find((b) => b.isOwn)?.rank ?? null;

      return {
        id: request.id,
        title: request.title,
        deviceType: request.deviceType,
        brand: request.brand,
        model: request.model,
        issueCategory: request.issueCategory,
        status: request.status,
        createdAt: request.createdAt,
        totalBids: allBids.length,
        myRank,
        bids: allBids,
      };
    });

    return res.json({ requests: shaped });
  } catch (error) {
    console.error("getVendorMyBids error:", error);

    if (isHttpError(error)) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: "Server error" });
  }
}
