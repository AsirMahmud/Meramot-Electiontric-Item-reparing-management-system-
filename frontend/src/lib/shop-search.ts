import type { ApiShop, ShopQuery } from "@/lib/api";

export type SearchState = {
  q: string;
  category: string;
  sort: "price" | "distance" | "topRated" | "relevance";
  voucher: boolean;
  freeDelivery: boolean;
  deals: boolean;
  maxDistanceKm: number;
};

export const defaultSearchState: SearchState = {
  q: "",
  category: "",
  sort: "price",
  voucher: false,
  freeDelivery: false,
  deals: false,
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
  };
}

export function toShopQuery(state: SearchState): ShopQuery {
  return {
    q: state.q || undefined,
    category: state.category || undefined,
    sort: state.sort,
    voucher: state.voucher || undefined,
    freeDelivery: state.freeDelivery || undefined,
    deals: state.deals || undefined,
    maxDistanceKm: state.maxDistanceKm,
    take: 24,
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
    if (state.voucher && !shop.hasVoucher) return false;
    if (state.freeDelivery && !shop.freeDelivery) return false;
    if (state.deals && !shop.hasDeals) return false;
    if (typeof shop.distanceKm === "number" && shop.distanceKm > state.maxDistanceKm) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (state.sort === "price") {
      if (a.priceLevel !== b.priceLevel) return a.priceLevel - b.priceLevel;
      return (b.ratingAvg ?? 0) - (a.ratingAvg ?? 0);
    }

    if (state.sort === "distance") {
      return (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER);
    }

    if (state.sort === "topRated") {
      if (b.ratingAvg !== a.ratingAvg) return b.ratingAvg - a.ratingAvg;
      return b.reviewCount - a.reviewCount;
    }

    const scoreDiff = relevanceScore(b, state.q) - relevanceScore(a, state.q);
    if (scoreDiff !== 0) return scoreDiff;
    if ((a.distanceKm ?? 999) !== (b.distanceKm ?? 999)) return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    return b.ratingAvg - a.ratingAvg;
  });

  return sorted;
}

export function formatPriceLevel(priceLevel: number) {
  return "৳".repeat(Math.max(1, Math.min(priceLevel, 4)));
}
