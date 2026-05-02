import type { ApiShop, ShopQuery } from "@/lib/api";

export type SearchState = {
  q: string;
  category: string;
  sort: "price" | "distance" | "topRated" | "relevance";
  voucher: boolean;
  freeDelivery: boolean;
  deals: boolean;
  featured: boolean;
  maxDistanceKm: number;
  lat?: number | null;
  lng?: number | null;
};

export const defaultSearchState: SearchState = {
  q: "",
  category: "",
  sort: "price",
  voucher: false,
  freeDelivery: false,
  deals: false,
  featured: false,
  maxDistanceKm: 15,
};

export function normalizeSearchState(input: Partial<SearchState>): SearchState {
  return {
    ...defaultSearchState,
    ...input,
    q: input.q?.trim() ?? "",
    category: input.category ?? "",
    sort: (input.sort as SearchState["sort"]) ?? defaultSearchState.sort,
    maxDistanceKm: Number.isFinite(input.maxDistanceKm) ? Math.max(1, Number(input.maxDistanceKm)) : defaultSearchState.maxDistanceKm,
    lat: typeof input.lat === "number" ? input.lat : undefined,
    lng: typeof input.lng === "number" ? input.lng : undefined,
  };
}

export function toShopQuery(state: SearchState): ShopQuery {
  return {
    q: state.q || undefined,
    category: state.category || undefined,
    sort: state.sort,
    featured: state.featured || undefined,
    maxDistanceKm: state.maxDistanceKm,
    take: 100,
    lat: state.lat,
    lng: state.lng,
  };
}

function textForShop(shop: ApiShop) {
  return [
    shop.name,
    shop.description ?? "",
    shop.address,
    shop.city ?? "",
    shop.area ?? "",
    ...(shop.specialties ?? []),
    ...(shop.categories ?? []),
    shop.resultTag ?? "",
    shop.offerSummary ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

function relevanceScore(shop: ApiShop, query: string) {
  if (!query) return 0;
  const q = query.toLowerCase();
  const text = textForShop(shop);
  let score = 0;
  if (shop.name.toLowerCase().includes(q)) score += 12;
  if ((shop.description ?? "").toLowerCase().includes(q)) score += 8;
  if ((shop.specialties ?? []).some((item) => item.toLowerCase().includes(q))) score += 14;
  if ((shop.categories ?? []).some((item) => item.toLowerCase().includes(q))) score += 6;
  if (text.includes(q)) score += 3;
  return score;
}

export function filterAndSortShops(shops: ApiShop[], state: SearchState) {
  const filtered = shops.filter((shop) => {
    const score = relevanceScore(shop, state.q);
    if (state.q && score === 0) return false;
    if (state.category && !(shop.categories ?? []).includes(state.category)) return false;
    if (typeof shop.distanceKm === "number" && shop.distanceKm > state.maxDistanceKm) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    // Promo sorting (checked promos bubble to top)
    if (state.voucher) {
      if (a.hasVoucher && !b.hasVoucher) return -1;
      if (!a.hasVoucher && b.hasVoucher) return 1;
    }
    if (state.freeDelivery) {
      if (a.freeDelivery && !b.freeDelivery) return -1;
      if (!a.freeDelivery && b.freeDelivery) return 1;
    }
    if (state.deals) {
      if (a.hasDeals && !b.hasDeals) return -1;
      if (!a.hasDeals && b.hasDeals) return 1;
    }

    if (state.sort === "price") {
      const getPrice = (s: any) => {
        if (s.offerSummary) {
          const parsed = parseInt(s.offerSummary.replace(/\D/g, ""), 10);
          if (!isNaN(parsed)) return parsed;
        }
        return s.inspectionFee ?? ((s.priceLevel || 1) * 150);
      };
      
      const priceA = getPrice(a);
      const priceB = getPrice(b);
      
      if (priceA !== priceB) return priceA - priceB;
      
      const laborA = a.baseLaborFee ?? Number.MAX_SAFE_INTEGER;
      const laborB = b.baseLaborFee ?? Number.MAX_SAFE_INTEGER;
      if (laborA !== laborB) return laborA - laborB;

      if ((a.priceLevel || 1) !== (b.priceLevel || 1)) return (a.priceLevel || 1) - (b.priceLevel || 1);
      return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
    }

    if (state.sort === "distance") {
      const distDiff = (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
      if (distDiff !== 0) return distDiff;
      return (a.etaMinutes ?? Number.MAX_SAFE_INTEGER) - (b.etaMinutes ?? Number.MAX_SAFE_INTEGER);
    }

    if (state.sort === "topRated") {
      if ((b.ratingAvg ?? 0) !== (a.ratingAvg ?? 0)) return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    }

    const scoreDiff = relevanceScore(b, state.q) - relevanceScore(a, state.q);
    if (scoreDiff !== 0) return scoreDiff;
    if ((a.distanceKm ?? 999) !== (b.distanceKm ?? 999)) return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
  });

  return sorted;
}

export function formatPriceLevel(priceLevel: number) {
  return "৳".repeat(Math.max(1, Math.min(priceLevel, 4)));
}
