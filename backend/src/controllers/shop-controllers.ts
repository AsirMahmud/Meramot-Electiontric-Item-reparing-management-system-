import { Request, Response } from "express";
import prisma from "../models/prisma";

function toNumber(value: unknown, fallback?: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function getShops(req: Request, res: Response) {
  try {
    const featuredOnly = req.query.featured === "true";
    const hasVoucher = req.query.voucher === "true";
    const freeDelivery = req.query.freeDelivery === "true";
    const hasDeals = req.query.deals === "true";
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const sort = typeof req.query.sort === "string" ? req.query.sort : "topRated";
    const take = toNumber(req.query.take, 12);

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (featuredOnly) where.isFeatured = true;
    if (hasVoucher) where.hasVoucher = true;
    if (freeDelivery) where.freeDelivery = true;
    if (hasDeals) where.hasDeals = true;
    if (category) where.categories = { has: category };

    let orderBy: Array<Record<string, "asc" | "desc">> = [
      { isFeatured: "desc" },
      { ratingAvg: "desc" },
      { reviewCount: "desc" },
    ];

    if (sort === "price") {
      orderBy = [{ priceLevel: "asc" }, { ratingAvg: "desc" }];
    } else if (sort === "new") {
      orderBy = [{ createdAt: "desc" }];
    } else if (sort === "topRated") {
      orderBy = [{ ratingAvg: "desc" }, { reviewCount: "desc" }];
    }

    const shops = await prisma.shop.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        address: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
        ratingAvg: true,
        reviewCount: true,
        priceLevel: true,
        isFeatured: true,
        hasVoucher: true,
        freeDelivery: true,
        hasDeals: true,
        categories: true,
        specialties: true,
      },
    });

    return res.json(shops);
  } catch (error) {
    console.error("getShops error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getFeaturedShops(_req: Request, res: Response) {
  try {
    const shops = await prisma.shop.findMany({
      where: {
        isActive: true,
        isFeatured: true,
      },
      orderBy: [{ ratingAvg: "desc" }, { reviewCount: "desc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        address: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
        ratingAvg: true,
        reviewCount: true,
        priceLevel: true,
        hasVoucher: true,
        freeDelivery: true,
        hasDeals: true,
        categories: true,
      },
    });

    return res.json(shops);
  } catch (error) {
    console.error("getFeaturedShops error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}

export async function getShopBySlug(req: Request, res: Response) {
  try {
    const { slug } = req.params;

    const shop = await prisma.shop.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        address: true,
        city: true,
        area: true,
        lat: true,
        lng: true,
        phone: true,
        email: true,
        ratingAvg: true,
        reviewCount: true,
        priceLevel: true,
        isFeatured: true,
        hasVoucher: true,
        freeDelivery: true,
        hasDeals: true,
        categories: true,
        specialties: true,
        createdAt: true,
      },
    });

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    return res.json(shop);
  } catch (error) {
    console.error("getShopBySlug error:", error);
    return res.status(500).json({ message: "Server error" });
  }
}