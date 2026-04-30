// @ts-nocheck
import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../models/prisma.js";
import type { AuthedRequest } from "../middleware/auth.js";
import { env } from "../config/env.js";

const REVIEW_EDIT_WINDOW_MONTHS = 6;

function getEditExpiry(createdAt: Date) {
  const expiresAt = new Date(createdAt);
  expiresAt.setMonth(expiresAt.getMonth() + REVIEW_EDIT_WINDOW_MONTHS);
  return expiresAt;
}

function getReviewEditMeta(createdAt: Date) {
  const editExpiresAt = getEditExpiry(createdAt);
  return {
    canEdit: Date.now() <= editExpiresAt.getTime(),
    editExpiresAt,
  };
}

/**
 * Middleware that attaches `req.user` when a valid Bearer token is present
 * but does NOT reject the request when the token is missing.
 */
export function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice(7), env.jwtSecret) as {
        sub: string;
        username?: string;
        email?: string;
        role?: string;
      };
      req.user = {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        role: payload.role,
      };
    } catch {
      /* token invalid – proceed as unauthenticated */
    }
  }
  return next();
}

export async function getShopReviews(req: AuthedRequest, res: Response) {
  try {
    const shopSlug = req.params.shopSlug as string;
    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const reviews = await prisma.rating.findMany({
      where: { shopId: shop.id, isHidden: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        score: true,
        review: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, username: true } },
      },
    });

    const currentUserId = req.user?.id;

    return res.json(
      reviews.map((rating) => {
        const editMeta = getReviewEditMeta(rating.createdAt);
        const isOwner = currentUserId && rating.user?.id === currentUserId;
        return {
          ...rating,
          canEdit: Boolean(isOwner && editMeta.canEdit),
          editExpiresAt: isOwner ? editMeta.editExpiresAt : undefined,
        };
      }),
    );
  } catch (error) {
    console.error("getShopReviews error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function canReviewShop(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const shopSlug = req.params.shopSlug as string;
    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const completedJob = await prisma.repairJob.findFirst({
      where: {
        shopId: shop.id,
        status: "COMPLETED",
        repairRequest: { userId },
      },
      select: { id: true },
    });

    const existingReview = await prisma.rating.findUnique({
      where: { userId_shopId: { userId, shopId: shop.id } },
      select: {
        id: true,
        score: true,
        review: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json({
      eligible: !existingReview,
      hasCompletedJob: Boolean(completedJob),
      hasExistingReview: Boolean(existingReview),
      existingReview: existingReview
        ? {
            ...existingReview,
            ...getReviewEditMeta(existingReview.createdAt),
          }
        : null,
    });
  } catch (error) {
    console.error("canReviewShop error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createReview(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const shopSlug = req.params.shopSlug as string;
    const { score, review } = req.body as { score?: number; review?: string };

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: "Score must be between 1 and 5" });
    }

    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    // Pre-check for duplicate before transaction
    const existingReview = await prisma.rating.findUnique({
      where: { userId_shopId: { userId, shopId: shop.id } },
      select: { id: true },
    });

    if (existingReview) {
      return res.status(409).json({ message: "You have already reviewed this shop" });
    }

    const completedJob = await prisma.repairJob.findFirst({
      where: {
        shopId: shop.id,
        status: "COMPLETED",
        repairRequest: { userId },
      },
      select: { id: true },
    });

    if (!completedJob) {
      return res.status(403).json({ message: "You can only review shops you have completed service with" });
    }

    const created = await prisma.$transaction(async (tx) => {
      const rating = await tx.rating.create({
        data: {
          userId,
          shopId: shop.id,
          score,
          review: review?.trim() || null,
        },
        select: {
          id: true,
          score: true,
          review: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, username: true } },
        },
      });

      const aggregate = await tx.rating.aggregate({
        where: { shopId: shop.id },
        _avg: { score: true },
        _count: { score: true },
      });

      await tx.shop.update({
        where: { id: shop.id },
        data: {
          ratingAvg: aggregate._avg.score ?? 0,
          reviewCount: aggregate._count.score,
        },
      });

      return rating;
    });

    return res.status(201).json({
      message: "Review submitted",
      review: {
        ...created,
        ...getReviewEditMeta(created.createdAt),
      },
    });
  } catch (error: unknown) {
    // Handle unique constraint violation (race condition)
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      return res.status(409).json({ message: "You have already reviewed this shop" });
    }
    console.error("createReview error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function updateReview(req: AuthedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const shopSlug = req.params.shopSlug as string;
    const reviewId = req.params.reviewId as string;
    const { score, review } = req.body as { score?: number; review?: string };

    if (!score || score < 1 || score > 5) {
      return res.status(400).json({ message: "Score must be between 1 and 5" });
    }

    const shop = await prisma.shop.findUnique({
      where: { slug: shopSlug },
      select: { id: true },
    });

    if (!shop) return res.status(404).json({ message: "Shop not found" });

    const existingReview = await prisma.rating.findFirst({
      where: {
        id: reviewId,
        userId,
        shopId: shop.id,
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (!existingReview) {
      return res.status(404).json({ message: "Review not found" });
    }

    const editMeta = getReviewEditMeta(existingReview.createdAt);
    if (!editMeta.canEdit) {
      return res.status(403).json({ message: "This review can no longer be edited" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const rating = await tx.rating.update({
        where: { id: reviewId },
        data: {
          score,
          review: review?.trim() || null,
        },
        select: {
          id: true,
          score: true,
          review: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, username: true } },
        },
      });

      const aggregate = await tx.rating.aggregate({
        where: { shopId: shop.id },
        _avg: { score: true },
        _count: { score: true },
      });

      await tx.shop.update({
        where: { id: shop.id },
        data: {
          ratingAvg: aggregate._avg.score ?? 0,
          reviewCount: aggregate._count.score,
        },
      });

      return rating;
    });

    return res.json({
      message: "Review updated",
      review: {
        ...updated,
        ...getReviewEditMeta(updated.createdAt),
      },
    });
  } catch (error) {
    console.error("updateReview error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}
