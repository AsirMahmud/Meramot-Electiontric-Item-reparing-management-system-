const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

/* =========================================================
   CORE REQUEST HELPERS
========================================================= */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: init?.cache ?? "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as any)?.message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

async function authedRequest<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

/* =========================================================
   TYPES
========================================================= */

export type ShopCategory = "COURIER_PICKUP" | "IN_SHOP_REPAIR" | "SPARE_PARTS";
export type ShopServicePricingType = "FIXED" | "STARTING_FROM" | "INSPECTION_REQUIRED";

/** 🔥 Unified shop type (merged both versions) */
export type Shop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;

  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;

  logoUrl?: string | null;
  bannerUrl?: string | null;

  lat?: number | null;
  lng?: number | null;

  /** discovery fields */
  distanceKm?: number | null;
  etaMinutes?: number | null;
  etaText?: string | null;
  resultTag?: string | null;
  offerSummary?: string | null;
  matchReasons?: string[];

  /** flags */
  isFeatured?: boolean;
  hasVoucher: boolean;
  freeDelivery: boolean;
  hasDeals: boolean;

  /** classification */
  categories?: ShopCategory[] | string[];
  specialties?: string[];

  /** capabilities */
  acceptsDirectOrders?: boolean;
  supportsPickup?: boolean;
  supportsOnsiteRepair?: boolean;

  /** details */
  phone?: string | null;
  email?: string | null;
};

/* =========================================================
   AUTH
========================================================= */

export type AuthPayload = {
  message: string;
  token: string;
  user: {
    id: string;
    name?: string | null;
    username: string | null;
    email: string | null;
    phone?: string | null;
    role?: string | null;
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

export function login(data: { identifier: string; password: string }) {
  return request<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function checkUsername(username: string) {
  return request<{ available: boolean }>(
    `/auth/check-username?username=${encodeURIComponent(username)}`
  );
}

/* =========================================================
   SHOPS
========================================================= */

export type ShopQuery = {
  q?: string;
  category?: string;
  sort?: string;
  featured?: boolean;
  voucher?: boolean;
  freeDelivery?: boolean;
  deals?: boolean;
  maxDistanceKm?: number;
  take?: number;
};

function buildQuery(params: ShopQuery = {}) {
  const q = new URLSearchParams();

  if (params.q) q.set("q", params.q);
  if (params.category) q.set("category", params.category);
  if (params.sort) q.set("sort", params.sort);
  if (params.featured) q.set("featured", "true");
  if (params.voucher) q.set("voucher", "true");
  if (params.freeDelivery) q.set("freeDelivery", "true");
  if (params.deals) q.set("deals", "true");
  if (params.maxDistanceKm) q.set("maxDistanceKm", String(params.maxDistanceKm));
  if (params.take) q.set("take", String(params.take));

  return q.toString() ? `?${q}` : "";
}

export function getShops(params: ShopQuery = {}) {
  return request<Shop[]>(`/shops${buildQuery(params)}`);
}

export function getFeaturedShops() {
  return request<Shop[]>("/shops/featured");
}

export function getShopBySlug(slug: string) {
  return request<Shop>(`/shops/${encodeURIComponent(slug)}`);
}

/* =========================================================
   SERVICES / REQUESTS
========================================================= */

export async function createRepairRequest(payload: any, token?: string) {
  return authedRequest("/requests", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyOrders(token: string) {
  return authedRequest<any[]>("/requests/mine", token);
}

/* =========================================================
   REVIEWS
========================================================= */

export async function getShopReviews(slug: string) {
  const data = await request<any>(`/shops/${slug}/reviews`);
  return Array.isArray(data) ? data : data.reviews || [];
}

export async function getReviewEligibility(
  shopSlug: string,
  accessToken?: string
) {
  return request<{
    eligible: boolean;
    hasCompletedJob: boolean;
    hasExistingReview: boolean;
  }>(`/shops/${shopSlug}/review-eligibility`, {
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });
}

export async function createReview(
  slug: string,
  payload: { score: number; review?: string },
  token?: string
) {
  return authedRequest(`/shops/${slug}/reviews`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   PROFILE
========================================================= */

export function getProfile(token?: string) {
  return authedRequest("/profile/me", token);
}

export function updateProfile(token: string, payload: any) {
  return authedRequest("/profile/me", token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   DELIVERY (RIDER)
========================================================= */

export const DELIVERY_TOKEN_STORAGE_KEY = "meeramoot_delivery_token";

export function deliveryLogin(data: { identifier: string; password: string }) {
  return request("/delivery/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryMe(token: string) {
  return authedRequest("/delivery/me", token);
}

export function fetchDeliveryDeliveries(token: string, status?: string) {
  const q = status ? `?status=${status}` : "";
  return authedRequest(`/delivery/deliveries${q}`, token);
}

export function updateDeliveryStatus(token: string, id: string, status: string) {
  return authedRequest(`/delivery/deliveries/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function acceptDelivery(token: string, id: string) {
  return authedRequest(`/delivery/deliveries/${id}/accept`, token, {
    method: "PATCH",
  });
}

/* =========================================================
   DELIVERY ADMIN
========================================================= */

export const DELIVERY_ADMIN_TOKEN_STORAGE_KEY = "meeramoot_delivery_admin_token";

export function deliveryAdminLogin(data: { identifier: string; password: string }) {
  return request("/delivery-admin/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryAdminStats(token: string) {
  return authedRequest("/delivery-admin/stats", token);
}

export function fetchDeliveryAdminPartners(token: string, status?: string) {
  const q = status ? `?registrationStatus=${status}` : "";
  return authedRequest(`/delivery-admin/partners${q}`, token);
}

export function approveDeliveryPartnerAdmin(token: string, id: string) {
  return authedRequest(`/delivery-admin/partners/${id}/approve`, token, {
    method: "PATCH",
  });
}

export function rejectDeliveryPartnerAdmin(token: string, id: string) {
  return authedRequest(`/delivery-admin/partners/${id}/reject`, token, {
    method: "PATCH",
  });
}