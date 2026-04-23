const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function getAuthHeaders(token?: string) {
  const localToken =
    token || (typeof window !== "undefined" ? localStorage.getItem("meramot.token") || "" : "");

  return {
    "Content-Type": "application/json",
    ...(localToken ? { Authorization: `Bearer ${localToken}` } : {}),
  };
}

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
  logoUrl?: string | null;
  bannerUrl?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;

  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;

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

export type ShopDetail = Shop & {
  services?: ShopService[];
  openingHoursText?: string | null;
};
export type VendorApplicationPayload = {
  ownerName: string;
  businessEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  tradeLicenseNo?: string;
  address: string;
  city?: string;
  area?: string;
  specialties?: string[] | string;
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  notes?: string;
};

export function createVendorApplication(data: VendorApplicationPayload) {
  return request<{
    message: string;
    application: {
      id: string;
      userId: string;
      ownerName: string;
      businessEmail: string;
      shopName: string;
      status: string;
      createdAt: string;
    };
  }>("/vendor/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function vendorLogin(data: { identifier: string; password: string }) {
  return request<{
    message: string;
    token: string;
    user: {
      id: string;
      username: string;
      email: string;
      name?: string | null;
      phone?: string | null;
      role?: string | null;
    };
  }>("/vendor/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export type VendorApplicationStatusResponse = {
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    rejectionReason?: string | null;
    rejectedAt?: string | null;
    rejectionVisibleUntil?: string | null;

    ownerName?: string;
    businessEmail?: string;
    phone?: string;
    shopName?: string;
    tradeLicenseNo?: string | null;
    address?: string;
    city?: string | null;
    area?: string | null;
    specialties?: string[];
    courierPickup?: boolean;
    inShopRepair?: boolean;
    spareParts?: boolean;
    notes?: string | null;

    createdAt?: string;
  };
  message?: string;
};
export function getMyVendorApplication(token: string) {
  return authedRequest<{ application?: VendorApplicationStatusResponse["application"]; message?: string }>(
    "/vendor/application-status",
    token
  );
}
export async function getVendorApplicationStatus(
  token: string
): Promise<VendorApplicationStatusResponse> {
  return authedRequest("/vendor/application-status", token);
}
export function updateVendorApplication(
  token: string,
  data: {
    ownerName: string;
    businessEmail: string;
    phone: string;
    shopName: string;
    tradeLicenseNo?: string;
    address: string;
    city?: string;
    area?: string;
    specialties?: string[] | string;
    courierPickup?: boolean;
    inShopRepair?: boolean;
    spareParts?: boolean;
    notes?: string;
  }
) {
  return request<{
    message: string;
    application: {
      id: string;
      status: "PENDING" | "APPROVED" | "REJECTED";
      ownerName: string;
      businessEmail: string;
      phone: string;
      shopName: string;
      tradeLicenseNo?: string | null;
      address?: string;
      city?: string | null;
      area?: string | null;
      specialties?: string[];
      courierPickup?: boolean;
      inShopRepair?: boolean;
      spareParts?: boolean;
      notes?: string | null;
      rejectionReason?: string | null;
      rejectionVisibleUntil?: string | null;
      createdAt: string;
    };
  }>("/vendor/application-status", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
}

export type EditableVendorApplication = {
  id?: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  shopName: string;
  tradeLicenseNo?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;
  specialties?: string[] | string;
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  notes?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  rejectionVisibleUntil?: string | null;
};

export type AdminVendorApplication = {
  id: string;
  userId: string;
  ownerName: string;
  businessEmail: string;
  phone: string;
  shopName: string;
  tradeLicenseNo?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;
  specialties: string[];
  courierPickup: boolean;
  inShopRepair: boolean;
  spareParts: boolean;
  notes?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  } | null;
};

export function getAdminVendorApplications(token: string) {
  return request<{ applications: AdminVendorApplication[] }>("/vendor/applications/admin", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function approveAdminVendorApplication(token: string, id: string) {
  return request<{ message: string; application: AdminVendorApplication }>(
    `/vendor/applications/admin/${encodeURIComponent(id)}/approve`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
}

export function rejectAdminVendorApplication(token: string, id: string, reason: string) {
  return request<{ message: string; application: AdminVendorApplication }>(
    `/vendor/applications/admin/${encodeURIComponent(id)}/reject`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    }
  );
}
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
  };
};

export type SslCommerzInitPayload = {
  amount: number;
  currency?: string;
  repairRequestId?: string;
  productName?: string;
};

export type SslCommerzInitResponse = {
  success: boolean;
  message: string;
  data: {
    payment: {
      id: string;
      transactionRef: string;
      status: string;
      amount: number;
      currency: string;
    };
    gatewayUrl: string;
    sessionkey?: string;
    gatewayStatus?: string;
  };
};

export type AdminPaymentRecord = {
  id: string;
  userId: string;
  repairRequestId: string | null;
  amount: number | string;
  currency: string;
  method: string | null;
  status: string;
  escrowStatus: string;
  transactionRef: string | null;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string;
  };
};

export type AdminPaymentsResponse = {
  success: boolean;
  data: AdminPaymentRecord[];
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

export function initSslCommerzPayment(data: SslCommerzInitPayload, token?: string) {
  return authedRequest<SslCommerzInitResponse>("/payments/sslcommerz/init", token, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function getAdminPayments(params: { status?: string } = {}, token?: string) {
  const q = params.status ? `?status=${params.status}` : "";
  return authedRequest<AdminPaymentsResponse>(`/payments/admin/list${q}`, token);
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

export type DeliveryStatusValue =
  | "PENDING"
  | "SCHEDULED"
  | "DISPATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type DeliveryAuthPayload = {
  token: string;
  user: {
    id: string;
    name?: string | null;
    username: string;
    email: string;
    phone?: string | null;
    role: string;
  };
  riderProfile: {
    id: string;
    vehicleType?: string | null;
    status: string;
    isActive?: boolean;
    registrationStatus?: string;
  };
};

export type DeliveryMeResponse = {
  riderProfile: {
    id: string;
    userId: string;
    vehicleType?: string | null;
    status: string;
    isActive?: boolean;
    registrationStatus?: string;
    currentLat?: number | null;
    currentLng?: number | null;
    coverageZones?: string[];
    user: {
      id: string;
      name?: string | null;
      username: string;
      email: string;
      phone?: string | null;
      role: string;
      status?: string;
      avatarUrl?: string | null;
    };
  };
};

export type DeliveryWithJob = {
  id: string;
  direction: string;
  status: DeliveryStatusValue;
  fee?: number | null;
  pickupAddress: string;
  dropAddress: string;
  deliveryAgentId?: string | null;
  repairJob: {
    shop: {
      name: string;
    };
    repairRequest: {
      title: string;
      deviceType: string;
      contactPhone?: string | null;
    };
  };
};

export function deliveryLogin(data: { identifier: string; password: string }) {
  return request<DeliveryAuthPayload>("/delivery/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deliveryRegister(data: {
  name: string;
  email: string;
  phone: string;
  vehicleType?: string;
  nidDocumentUrl: string;
  educationDocumentUrl: string;
  cvDocumentUrl: string;
}) {
  return request<DeliveryAuthPayload>("/delivery/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryMe(token: string) {
  return authedRequest<DeliveryMeResponse>("/delivery/me", token);
}

export function fetchDeliveryDeliveries(token: string, status?: string) {
  const q = status ? `?status=${status}` : "";
  return authedRequest<{ deliveries: DeliveryWithJob[] }>(`/delivery/deliveries${q}`, token);
}

export function updateDeliveryStatus(token: string, id: string, status: DeliveryStatusValue) {
  return authedRequest<{ delivery: DeliveryWithJob }>(`/delivery/deliveries/${id}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function acceptDelivery(token: string, id: string) {
  return authedRequest<{ delivery: DeliveryWithJob }>(`/delivery/deliveries/${id}/accept`, token, {
    method: "PATCH",
  });
}

export function patchDeliveryLocation(token: string, lat: number, lng: number) {
  return authedRequest("/delivery/location", token, {
    method: "PATCH",
    body: JSON.stringify({ lat, lng }),
  });
}

/* =========================================================
   DELIVERY ADMIN
========================================================= */

export const DELIVERY_ADMIN_TOKEN_STORAGE_KEY = "meeramoot_delivery_admin_token";

export type DeliveryAdminMeResponse = {
  user: {
    id: string;
    name?: string | null;
    username: string;
    email: string;
    phone?: string | null;
    role: string;
    status: string;
    createdAt: string;
  };
};

export function deliveryAdminLogin(data: { identifier: string; password: string }) {
  return request<{
    message: string;
    token: string;
    user: any;
  }>("/delivery-admin/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryAdminMe(token: string) {
  return authedRequest<DeliveryAdminMeResponse>("/delivery-admin/me", token);
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
<<<<<<< HEAD


/* =========================================================
   Cart Management
========================================================= */

export type CartItem = {
  id: string;
  cartId: string;
  serviceName: string;
  description?: string | null;
  price: number | string;
  quantity: number;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type Cart = {
  id: string;
  userId: string;
  shopId: string;
  status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  shop: {
    id: string;
    name: string;
    slug: string;
    address: string;
    ratingAvg: number;
    reviewCount: number;
  };
  items: CartItem[];
};



export async function addServiceToCart(
  payload: {
    shopSlug: string;
    serviceName: string;
    description?: string;
    price: number;
    quantity?: number;
    metadata?: Record<string, unknown>;
  },
  token: string
) {
  return authedRequest<{ message: string; cart: Cart }>("/cart/items", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyCarts(token: string) {
  return authedRequest<Cart[]>("/cart", token);
}

export async function updateCartItem(
  itemId: string,
  quantity: number,
  token: string
) {
  return authedRequest(`/cart/items/${itemId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ quantity }),
  });
}

export async function removeCartItem(itemId: string, token: string) {
  return authedRequest(`/cart/items/${itemId}`, token, {
    method: "DELETE",
  });
}

export async function checkoutCart(
  cartId: string,
  payload: {
    scheduleType: "NOW" | "LATER";
    scheduledAt?: string;
    paymentMethod: "CASH" | "BKASH";
    addressMode: "PROFILE" | "MANUAL" | "MAP";
    address: string;
    city?: string;
    area?: string;
    lat?: number;
    lng?: number;
    deliveryType?: "REGULAR" | "EXPRESS";
    problemNote?: string;
  },
  token: string
) {
  return authedRequest(`/cart/${cartId}/checkout`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/* =========================================================
   Ai Chat
========================================================= */

export async function chatWithAi(payload: {
  message: string;
  history?: { role: "user" | "assistant"; text: string }[];
}) {
  return request<{ ok: true; reply: string }>("/ai/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}
=======
>>>>>>> origin/main
