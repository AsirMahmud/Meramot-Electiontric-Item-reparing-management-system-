const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function getAuthHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
/* =========================================================
   CORE REQUEST HELPERS
========================================================= */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      cache: init?.cache ?? "no-store",
    });
  } catch {
    throw new Error(
      `Network error while requesting ${API}/api${path}. Check whether the backend is running and reachable.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      ((typeof data === "object" && data && "message" in data ? (data as { message?: string }).message : undefined) || `Request failed with status ${response.status}`)
    );
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
    setupComplete?: boolean;
    isPublic?: boolean;
    createdAt?: string;
  };
  message?: string;
};

export type VendorSetupShopPayload = {
  shopName: string;
  description?: string;
  phone: string;
  address: string;
  city?: string;
  area?: string;
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  inspectionFee: number;
  baseLaborFee: number;
  pickupFee?: number | null;
  expressFee?: number | null;
  skillTags: string[];
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

export function completeVendorShopSetup(
  token: string,
  data: VendorSetupShopPayload
) {
  return request<{
    message: string;
    shop: {
      id: string;
      name: string;
      slug: string;
      isPublic: boolean;
      setupComplete: boolean;
    };
  }>("/vendor/application-status/setup-shop", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
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
  }>("/auth/login", {
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

export type FinalQuoteItem = {
  label: string;
  description?: string | null;
  amount: number;
};

export type BidItem = {
  id: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  estimatedDays?: number | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  shop?: {
    id: string;
    name: string;
    slug: string;
    specialties?: string[];
    ratingAvg?: number;
  };
  repairRequest?: {
    id: string;
    title: string;
    deviceType: string;
    brand?: string | null;
    model?: string | null;
    issueCategory?: string | null;
    problem: string;
    mode: string;
    status: string;
    createdAt: string;
  };
};

export type DeliverySummary = {
  id: string;
  direction: string;
  status: string;
  riderName?: string | null;
  riderPhone?: string | null;
  trackingCode?: string | null;
  scheduledAt?: string | null;
};

export type OrderItem = {
  id: string;
  title: string;
  description?: string | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueCategory?: string | null;
  problem: string;
  mode: string;
  status: string;
  preferredPickup: boolean;
  deliveryType?: string | null;
  quotedFinalAmount?: number | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  bids: BidItem[];
  repairJob?: {
    id: string;
    status: string;
    diagnosisNotes?: string | null;
    finalQuotedAmount?: number | null;
    finalQuoteItems?: FinalQuoteItem[] | null;
    customerApproved?: boolean | null;
    acceptedBid?: BidItem | null;
    shop: {
      id: string;
      name: string;
      slug: string;
      ratingAvg?: number;
    };
    deliveries: DeliverySummary[];
  } | null;
};

export type CreateRepairRequestPayload = {
  title: string;
  description?: string | null;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueCategory?: string | null;
  problem: string;
  mode?: string;
  preferredPickup?: boolean;
  deliveryType?: string | null;
  shopSlug?: string;
  imageUrls?: string[];
};

export type VendorDashboardData = {
  application: {
    id: string;
    status: string;
    shopName: string;
    businessEmail: string;
    specialties: string[];
    courierPickup: boolean;
    inShopRepair: boolean;
    spareParts: boolean;
  };
  shop: {
    id: string;
    name: string;
    slug: string;
    setupComplete: boolean;
    isPublic: boolean;
    inspectionFee?: number | null;
    baseLaborFee?: number | null;
    pickupFee?: number | null;
    expressFee?: number | null;
    categories: string[];
    specialties: string[];
  };
  stats: {
    relevantRequestCount: number;
    activeBidCount: number;
    assignedJobCount: number;
    waitingApprovalCount: number;
    completedJobCount: number;
  };
  relevantRequests: Array<{
    id: string;
    title: string;
    description?: string | null;
    deviceType: string;
    brand?: string | null;
    model?: string | null;
    issueCategory?: string | null;
    problem: string;
    mode: string;
    preferredPickup: boolean;
    deliveryType?: string | null;
    status: string;
    createdAt: string;
    bidCount: number;
    relevanceScore: number;
    matchReasons: string[];
    myBid?: BidItem | null;
  }>;
  myBids: BidItem[];
  assignedJobs: Array<{
    id: string;
    status: string;
    diagnosisNotes?: string | null;
    finalQuotedAmount?: number | null;
    finalQuoteItems?: FinalQuoteItem[] | null;
    customerApproved?: boolean | null;
    createdAt: string;
    updatedAt: string;
    acceptedBid?: BidItem | null;
    repairRequest: {
      id: string;
      title: string;
      description?: string | null;
      deviceType: string;
      brand?: string | null;
      model?: string | null;
      issueCategory?: string | null;
      problem: string;
      mode: string;
      preferredPickup: boolean;
      deliveryType?: string | null;
      status: string;
      quotedFinalAmount?: number | null;
      createdAt: string;
      updatedAt: string;
    };
  }>;
};


export type VendorAnalyticsData = {
  shop: {
    id: string;
    name: string;
    slug: string;
  };
  summary: {
    monthLabel: string;
    totalMonthlyEarnings: number;
    bidsWonThisMonth: number;
    averageCustomerRating: number;
    reviewCount: number;
  };
  trends: Array<{
    key: string;
    label: string;
    earnings: number;
    bidsWon: number;
    completedJobs: number;
  }>;
  recentRatings: Array<{
    id: string;
    score: number;
    review?: string | null;
    createdAt: string;
    customerName: string;
  }>;
  insights: {
    bestMonthLabel: string;
    bestMonthEarnings: number;
    sixMonthBidsWon: number;
    sixMonthCompletedJobs: number;
  };
};

export async function createRepairRequest(payload: CreateRepairRequestPayload, token?: string) {
  return authedRequest("/requests", token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadImages(files: File[], token?: string) {
  const formData = new FormData();
  files.forEach(f => formData.append("images", f));
  
  let response: Response;
  try {
    response = await fetch(`${API}/api/uploads`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
  } catch {
    throw new Error("Network error while uploading images.");
  }
  
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Upload failed with status ${response.status}`);
  }
  
  return data as { imageUrls: string[] };
}

export async function getMyOrders(token: string) {
  return authedRequest<OrderItem[]>("/requests/mine", token);
}

export async function acceptBid(token: string, requestId: string, bidId: string) {
  return authedRequest(
    `/requests/${encodeURIComponent(requestId)}/bids/${encodeURIComponent(bidId)}/accept`,
    token,
    {
      method: "PATCH",
    }
  );
}

export async function declineBid(token: string, requestId: string, bidId: string) {
  return authedRequest(
    `/requests/${encodeURIComponent(requestId)}/bids/${encodeURIComponent(bidId)}/decline`,
    token,
    {
      method: "PATCH",
    }
  );
}

export async function respondToFinalQuote(
  token: string,
  requestId: string,
  action: "ACCEPT" | "DECLINE"
) {
  return authedRequest(
    `/requests/${encodeURIComponent(requestId)}/final-quote/respond`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ action }),
    }
  );
}

export function getVendorDashboard(token: string) {
  return authedRequest<VendorDashboardData>("/vendor/requests/dashboard", token);
}

export function getVendorAnalytics(token: string) {
  return authedRequest<VendorAnalyticsData>("/vendor/requests/analytics", token);
}

export function submitVendorBid(
  token: string,
  requestId: string,
  payload: {
    partsCost: number;
    laborCost: number;
    estimatedDays?: number | null;
    notes?: string;
  }
) {
  return authedRequest(
    `/vendor/requests/${encodeURIComponent(requestId)}/bids`,
    token,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export function updateVendorJobStatus(token: string, jobId: string, status: string) {
  return authedRequest(
    `/vendor/requests/jobs/${encodeURIComponent(jobId)}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export function submitVendorFinalQuote(
  token: string,
  jobId: string,
  payload: {
    diagnosisNotes: string;
    items: FinalQuoteItem[];
  }
) {
  return authedRequest(
    `/vendor/requests/jobs/${encodeURIComponent(jobId)}/final-quote`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

/* =========================================================
   REVIEWS
========================================================= */

export async function getShopReviews(slug: string) {
  const data = await request<unknown>(`/shops/${slug}/reviews`);
  if (Array.isArray(data)) return data;
  if (typeof data === "object" && data && "reviews" in data) {
    const reviews = (data as { reviews?: unknown }).reviews;
    return Array.isArray(reviews) ? reviews : [];
  }
  return [];
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

export type Profile = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  city?: string | null;
  area?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export function getProfile(token?: string) {
  return authedRequest<Profile>("/profile/me", token);
}

export function updateProfile(token: string, payload: Partial<Profile> & Record<string, unknown>) {
  return authedRequest<{ message: string; user: Profile }>("/profile/me", token, {
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