import prisma from "../models/prisma.js";
function toNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
    if ([lat1, lng1, lat2, lng2].some((value) => typeof value !== "number"))
        return null;
    const toRadians = (degrees) => (degrees * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}
function matchesQuery(shop, query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return true;
    const haystack = [
        shop.name,
        shop.description ?? "",
        shop.address,
        shop.city ?? "",
        shop.area ?? "",
        ...shop.specialties,
        ...shop.categories,
    ]
        .join(" ")
        .toLowerCase();
    return haystack.includes(q);
}
function relevanceScore(shop, query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return 0;
    let score = 0;
    if (shop.name.toLowerCase().includes(q))
        score += 12;
    if ((shop.description ?? "").toLowerCase().includes(q))
        score += 8;
    if (shop.specialties.some((item) => item.toLowerCase().includes(q)))
        score += 14;
    if (shop.categories.some((item) => item.toLowerCase().includes(q)))
        score += 6;
    return score;
}
function resultTag(shop) {
    if (shop.hasDeals || shop.priceLevel <= 1)
        return "Lowest Price";
    if ((shop.distanceKm ?? 999) <= 1)
        return "Fastest Service";
    if (shop.ratingAvg >= 4.8)
        return "Highest Rating";
    return "Best Value";
}
export async function getShops(req, res) {
    try {
        const featuredOnly = req.query.featured === "true";
        const hasVoucher = req.query.voucher === "true";
        const freeDelivery = req.query.freeDelivery === "true";
        const hasDeals = req.query.deals === "true";
        const category = typeof req.query.category === "string" ? req.query.category : undefined;
        const sort = typeof req.query.sort === "string" ? req.query.sort : "topRated";
        const take = toNumber(req.query.take, 18) ?? 18;
        const query = typeof req.query.q === "string" ? req.query.q : "";
        const maxDistanceKm = toNumber(req.query.maxDistanceKm, 25) ?? 25;
        const originLat = toNumber(req.query.lat, 23.8103);
        const originLng = toNumber(req.query.lng, 90.4125);
        const where = {
            isActive: true,
        };
        if (featuredOnly)
            where.isFeatured = true;
        if (hasVoucher)
            where.hasVoucher = true;
        if (freeDelivery)
            where.freeDelivery = true;
        if (hasDeals)
            where.hasDeals = true;
        if (category)
            where.categories = { has: category };
        const shops = await prisma.shop.findMany({
            where,
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
        const enriched = shops
            .map((shop) => {
            const distanceKm = haversineDistanceKm(originLat, originLng, shop.lat, shop.lng);
            const etaMinutes = distanceKm == null ? null : Math.max(45, Math.round(distanceKm * 18));
            return {
                ...shop,
                distanceKm,
                etaMinutes,
                offerSummary: `৳${(700 + shop.priceLevel * 250 + Math.max(0, 5 - Math.round(shop.ratingAvg)) * 80).toLocaleString("en-BD")}`,
                resultTag: resultTag({
                    priceLevel: shop.priceLevel,
                    distanceKm,
                    ratingAvg: shop.ratingAvg,
                    hasDeals: shop.hasDeals,
                }),
            };
        })
            .filter((shop) => matchesQuery(shop, query))
            .filter((shop) => shop.distanceKm == null || shop.distanceKm <= maxDistanceKm);
        const sorted = enriched.sort((a, b) => {
            if (sort === "price") {
                if (a.priceLevel !== b.priceLevel)
                    return a.priceLevel - b.priceLevel;
                return b.ratingAvg - a.ratingAvg;
            }
            if (sort === "distance") {
                return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
            }
            if (sort === "relevance") {
                const diff = relevanceScore(b, query) - relevanceScore(a, query);
                if (diff !== 0)
                    return diff;
                return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
            }
            if (b.ratingAvg !== a.ratingAvg)
                return b.ratingAvg - a.ratingAvg;
            return b.reviewCount - a.reviewCount;
        });
        return res.json(sorted.slice(0, take));
    }
    catch (error) {
        console.error("getShops error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function getFeaturedShops(_req, res) {
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
                specialties: true,
            },
        });
        return res.json(shops);
    }
    catch (error) {
        console.error("getFeaturedShops error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
export async function getShopBySlug(req, res) {
    try {
        const slug = String(req.params.slug);
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
    }
    catch (error) {
        console.error("getShopBySlug error:", error);
        return res.status(500).json({ message: "Server error" });
    }
}
//# sourceMappingURL=shop-controllers.js.map