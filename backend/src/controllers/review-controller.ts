import type { Response } from "express";
import prisma from "../models/prisma.js";
import type { AuthenticatedRequest as AuthedRequest } from "../middleware/require-auth.js";

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

async function refreshShopRating(shopId: string) {
  const aggregate = await prisma.rating.aggregate({
    where: { shopId },
    _avg: { score: true },
    _count: { score: true },
  });

  await prisma.shop.update({
    where: { id: shopId },
    data: {
      ratingAvg: aggregate._avg.score ?? 0,
      reviewCount: aggregate._count.score,
    },
  });
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
      where: { shopId: shop.id },
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

    return res.json(
      reviews.map((rating) => ({
        ...rating,
        ...getReviewEditMeta(rating.createdAt),
      })),
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

    const existingReview = await prisma.rating.findUnique({
      where: { userId_shopId: { userId, shopId: shop.id } },
      select: { id: true },
    });

    if (existingReview) {
      return res.status(409).json({ message: "You have already reviewed this shop" });
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
