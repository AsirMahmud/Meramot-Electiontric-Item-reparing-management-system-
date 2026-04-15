const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export type Shop = {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  averagePrice: number;
  heroTag: string;
};

export type ShopSummary = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;
  hasVoucher: boolean;
  freeDelivery: boolean;
  hasDeals: boolean;
  categories: string[];
  specialties: string[];
  acceptsDirectOrders: boolean;
  supportsPickup?: boolean;
  supportsOnsiteRepair?: boolean;
};

export type ShopService = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  description?: string | null;
  deviceType?: string | null;
  issueCategory?: string | null;
  pricingType?: string | null;
  basePrice?: number | null;
  priceMax?: number | null;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  includesPickup?: boolean;
  includesDelivery?: boolean;
  isFeatured?: boolean;
};

export type ShopDetail = ShopSummary & {
  bannerUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  openingHoursText?: string | null;
  services: ShopService[];
};

export type AuthPayload = {
  message: string;
  token: string;
  user: {
    id: string;
    name?: string | null;
    username: string | null;
    email: string | null;
    phone?: string | null;
  };
};

export function signup(data: {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}) {
  return request<AuthPayload>("/auth/signup", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function checkUsername(username: string) {
  return request<{ available: boolean }>(
    `/auth/check-username?username=${encodeURIComponent(username)}`,
    { cache: "no-store" },
  );
}

export function getShops(params?: {
  category?: string;
  sort?: string;
  q?: string;
  featured?: boolean;
  take?: number;
}) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.sort) query.set("sort", params.sort);
  if (params?.q) query.set("q", params.q);
  if (params?.featured) query.set("featured", "true");
  if (params?.take) query.set("take", String(params.take));
  const suffix = query.toString() ? `?${query}` : "";
  return request<ShopSummary[]>(`/shops${suffix}`, { cache: "no-store" });
}

export function getFeaturedShops() {
  return request<ShopSummary[]>("/shops/featured", { cache: "no-store" });
}

export function getShopBySlug(slug: string) {
  return request<ShopDetail>(`/shops/${encodeURIComponent(slug)}`, { cache: "no-store" });
}

export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {};
  }

  const token = localStorage.getItem("meramot.token");

  if (!token) {
    return {};
  }

  return { Authorization: `Bearer ${token}` };
}


export function login(data: { identifier: string; password: string }) {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
