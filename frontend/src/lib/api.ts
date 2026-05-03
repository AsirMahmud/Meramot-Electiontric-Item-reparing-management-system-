const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export function getAuthHeaders(token?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
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
  address: string | null;
  city?: string | null;
  area?: string | null;

  ratingAvg?: number;
  reviewCount?: number;
  priceLevel?: number;

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
  hasVoucher?: boolean;
  freeDelivery?: boolean;
  hasDeals?: boolean;

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
  baseLaborFee?: number | null;
  inspectionFee?: number | null;
};
export type VendorApplicationPayload = {
  ownerName: string;
  businessEmail: string;
  phone: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  logoUrl?: string;
  tradeLicenseNo?: string;
  address?: string;
  city?: string;
  area?: string;
  lat?: number | null;
  lng?: number | null;
  specialties?: string[] | string;
  courierPickup?: boolean;
  inShopRepair?: boolean;
  spareParts?: boolean;
  notes?: string;
};

export function createVendorApplication(data: VendorApplicationPayload, token?: string) {
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
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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
    shopName: string;
    logoUrl?: string | null;
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
  logoUrl?: string;
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
  lat?: number | null;
  lng?: number | null;
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
    logoUrl?: string;
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
  role?: "CUSTOMER" | "VENDOR" | "DELIVERY";
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
  lat?: number | null;
  lng?: number | null;
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
  if (typeof params.lat === "number") q.set("lat", String(params.lat));
  if (typeof params.lng === "number") q.set("lng", String(params.lng));

  return q.toString() ? `?${q}` : "";
}

export function getShops(params: ShopQuery = {}) {
  return request<Shop[]>(`/shops${buildQuery(params)}`);
}

export function getFeaturedShops() {
  return request<Shop[]>("/shops/featured");
}

export async function getShopBySlug(slug: string) {
  try {
    return await request<Shop>(`/shops/${encodeURIComponent(slug)}`);
  } catch (error) {
    const { fallbackShops } = await import("./mock-data");
    const mock = fallbackShops.find((s) => s.slug === slug);
    if (mock) {
      return mock as unknown as Shop;
    }
    throw error;
  }
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

export type RefundItem = {
  id: string;
  amount: number;
  reason?: string | null;
  status: string;
  processedAt?: string | null;
  createdAt: string;
};

export type PaymentItem = {
  id: string;
  amount: number;
  currency: string;
  method?: string | null;
  status: string;
  transactionRef?: string | null;
  paidAt?: string | null;
  createdAt: string;
  refunds: RefundItem[];
};

export type DisputeItem = {
  id: string;
  status: string;
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
};

export type TicketItem = {
  id: string;
  subject: string;
  status: string;
  priority?: string | null;
  createdAt: string;
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
  aiSummary?: string | null;
  mode: string;
  source?: string;
  status: string;
  preferredPickup: boolean;
  deliveryType?: string | null;
  quotedFinalAmount?: number | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  bids: BidItem[];
  payments: PaymentItem[];
  disputeCases: DisputeItem[];
  supportTickets: TicketItem[];
  repairJob?: {
    id: string;
    status: string;
    diagnosisNotes?: string | null;
    finalQuotedAmount?: number | null;
    finalQuoteItems?: FinalQuoteItem[] | null;
    customerApproved?: boolean | null;
    startedAt?: string | null;
    completedAt?: string | null;
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
  scheduleType?: string;
  scheduledAt?: string;
  addressMode?: string;
  address?: string;
  city?: string;
  area?: string;
  pickupLat?: string;
  pickupLng?: string;
  contactPhone?: string;
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
    liveNotificationsEnabled?: boolean;
    liveNotificationsPrompted?: boolean;
  };
  stats: {
    relevantRequestCount: number;
    activeBidCount: number;
    assignedJobCount: number;
    waitingApprovalCount: number;
    completedJobCount: number;
    pendingOrderCount: number;
  };
  pendingOrders: Array<{
    id: string;
    title: string;
    description?: string | null;
    deviceType: string;
    brand?: string | null;
    model?: string | null;
    issueCategory?: string | null;
    problem: string;
    aiSummary?: string | null;
    mode: string;
    source?: string;
    quotedFinalAmount?: number | null;
    createdAt: string;
    user: { name?: string | null; email?: string | null; phone?: string | null };
    payments: Array<{ method?: string | null; status: string; amount: number }>;
  }>;
  relevantRequests?: Array<{
    id: string;
    title: string;
    description?: string | null;
    deviceType: string;
    brand?: string | null;
    model?: string | null;
    issueCategory?: string | null;
    problem: string;
    aiSummary?: string | null;
    mode: string;
    preferredPickup: boolean;
    deliveryType?: string | null;
    status: string;
    createdAt: string;
    bidCount: number;
    lowestBidAmount?: number | null;
    relevanceScore: number;
    matchReasons: string[];
    myBid?: BidItem | null;
    isExplicitlyRequested?: boolean;
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
      aiSummary?: string | null;
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

export async function cancelRequest(token: string, requestId: string) {
  return authedRequest(
    `/requests/${encodeURIComponent(requestId)}/cancel`,
    token,
    {
      method: "PATCH",
    }
  );
}

export async function deleteRequest(token: string, requestId: string) {
  return authedRequest(
    `/requests/${encodeURIComponent(requestId)}`,
    token,
    {
      method: "DELETE",
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

export type BiddingRequestsResponse = {
  data: Array<{
    id: string;
    title: string;
    description?: string | null;
    deviceType: string;
    brand?: string | null;
    model?: string | null;
    issueCategory?: string | null;
    problem: string;
    aiSummary?: string | null;
    mode: string;
    preferredPickup: boolean;
    deliveryType?: string | null;
    status: string;
    createdAt: string;
    bidCount: number;
    lowestBidAmount?: number | null;
    relevanceScore: number;
    matchReasons: string[];
    myBid?: BidItem | null;
    isExplicitlyRequested?: boolean;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export function getBiddingRequests(token: string, page = 1, limit = 20, filter = "relevant", sort = "desc") {
  return authedRequest<BiddingRequestsResponse>(
    `/vendor/requests/bidding-requests?page=${page}&limit=${limit}&filter=${filter}&sort=${sort}`,
    token
  );
}

export function getVendorAnalytics(token: string) {
  return authedRequest<VendorAnalyticsData>("/vendor/requests/analytics", token);
}

export function acceptPendingOrder(token: string, requestId: string) {
  return authedRequest(
    `/vendor/requests/${encodeURIComponent(requestId)}/accept`,
    token,
    { method: "PATCH" }
  );
}

export function rejectPendingOrder(token: string, requestId: string, reason?: string) {
  return authedRequest(
    `/vendor/requests/${encodeURIComponent(requestId)}/reject`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ reason }),
    }
  );
}

export function declineExplicitRequest(token: string, requestId: string) {
  return authedRequest(
    `/vendor/requests/${encodeURIComponent(requestId)}/decline-explicit`,
    token,
    {
      method: "PATCH",
    }
  );
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

export function updateVendorJobStatus(token: string, jobId: string, status: string, reason?: string) {
  return authedRequest(
    `/vendor/requests/jobs/${encodeURIComponent(jobId)}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ status, reason }),
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

export async function updateVendorNotificationPreferences(
  token: string,
  payload: { liveNotificationsEnabled?: boolean; liveNotificationsPrompted?: boolean }
) {
  return authedRequest<{ message: string; liveNotificationsEnabled: boolean; liveNotificationsPrompted: boolean }>(
    "/vendor-status/notifications",
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
    existingReview?: {
      id: string;
      score: number;
      review?: string | null;
      createdAt?: string;
      updatedAt?: string;
      canEdit?: boolean;
      editExpiresAt?: string;
    } | null;
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

export async function deleteReview(slug: string, reviewId: string, token?: string) {
  return authedRequest(`/shops/${slug}/reviews/${reviewId}`, token, {
    method: "DELETE",
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
  return request<DeliveryAuthPayload>("/delivery/auth/login", {
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

export function updateDeliveryStatus(token: string, id: string, status: string) {
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

/* =========================================================
   DELIVERY ADMIN
========================================================= */

export const DELIVERY_ADMIN_TOKEN_STORAGE_KEY = "meeramoot_delivery_admin_token";

export function deliveryAdminLogin(data: { identifier: string; password: string }) {
  return request<DeliveryAdminAuthPayload>("/delivery-admin/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function fetchDeliveryAdminStats(token: string) {
  return authedRequest<{ stats: DeliveryAdminStats }>("/delivery-admin/stats", token);
}

export function fetchDeliveryAdminMe(token: string) {
  return authedRequest<DeliveryAdminMeResponse>("/delivery-admin/me", token);
}

export function fetchDeliveryAdminPartners(token: string, status?: string) {
  const q = status ? `?registrationStatus=${status}` : "";
  return authedRequest<{ partners: DeliveryAdminPartnerRow[] }>(`/delivery-admin/partners${q}`, token);
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

// --- NEW TYPES AND FUNCTIONS ---

export interface Review {
  id: string;
  score: number;
  review: string;
  createdAt: string;
  user?: { name: string; username: string };
}

export interface ApiShop {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  bannerImage?: string | null;
  profileImage?: string | null;
  rating?: number;
  ratingAvg?: number;
  reviewCount?: number;
  specialties?: string[];
  categories?: string[];
  address: string | null;
  city?: string | null;
  area?: string | null;
  phone?: string | null;
  email?: string | null;
  distanceKm?: number | null;
  priceLevel?: number;
  hasVoucher?: boolean;
  freeDelivery?: boolean;
  hasDeals?: boolean;
  resultTag?: string | null;
  offerSummary?: string | null;
  etaMinutes?: number | null;
}

export interface ShopSummary {
  id: string;
  slug: string;
  name: string;
  rating?: number;
  reviewCount?: number;
  specialties?: string[];
  profileImage?: string | null;
  bannerImage?: string | null;
  address: string | null;
  city: string | null;
  description?: string | null;
  priceLevel?: number;
  hasVoucher?: boolean;
  freeDelivery?: boolean;
  hasDeals?: boolean;
  acceptsDirectOrders?: boolean;
  ratingAvg?: number;
}

export interface DeliveryAuthPayload {
  token: string;
  user?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: string;
    userId?: string;
    username?: string | null;
    role?: string;
  };
  riderProfile?: {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    status: string;
    userId?: string;
    vehicleType?: string | null;
    isActive?: boolean;
    registrationStatus?: string;
    currentLat?: number | null;
    currentLng?: number | null;
    lat?: number | null;
    lng?: number | null;
    user?: DeliveryAuthPayload['user'];
    coverageZones?: unknown[];
  };
}

export interface DeliveryMeResponse {
  success: boolean;
  riderProfile?: DeliveryAuthPayload['riderProfile'];
  user?: DeliveryAuthPayload['user'];
}

export interface DeliveryAdminAuthPayload {
  token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    username?: string | null;
    phone?: string | null;
    role: string;
    status?: string;
    createdAt?: string;
  };
}

export interface DeliveryAdminMeResponse {
  success: boolean;
  user?: DeliveryAdminAuthPayload['user'];
}



export async function loginDelivery(credentials: unknown): Promise<{success: boolean, data?: DeliveryAuthPayload}> {
  const res = await fetch(`${API}/api/delivery/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
}

export async function loginDeliveryAdmin(credentials: unknown): Promise<{success: boolean, data?: DeliveryAdminAuthPayload}> {
  const res = await fetch(`${API}/api/delivery-admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  return res.json();
}

export type RiderProfileStatusResponse = {
  riderProfile: {
    id: string;
    userId: string;
    registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
    user?: {
      name: string;
      username: string;
    };
  };
};

export async function getDeliveryMe(token: string) {
  return authedRequest<RiderProfileStatusResponse>("/delivery/me", token);
}

/* =========================================================
   ADMIN DELIVERY MANAGEMENT ENDPOINTS
========================================================= */

export type AdminDeliveryRider = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  registrationStatus: "PENDING" | "APPROVED" | "REJECTED";
  riderProfileId: string | null;
};

export type AdminDeliveryStats = {
  totalRiders: number;
  pendingRiders: number;
  approvedRiders: number;
  rejectedRiders: number;
};

export async function fetchAdminDeliveryStats(token: string): Promise<AdminDeliveryStats> {
  const data = await authedRequest<{ success: boolean; stats: AdminDeliveryStats }>("/admin/delivery/stats", token);
  return data.stats;
}

export async function fetchAdminDeliveryRiders(token: string): Promise<AdminDeliveryRider[]> {
  const data = await authedRequest<{ success: boolean; data: AdminDeliveryRider[] }>("/admin/delivery/riders", token);
  return data.data;
}

export async function updateAdminDeliveryRiderStatus(token: string, userId: string, status: "PENDING" | "APPROVED" | "REJECTED") {
  const action = status === "APPROVED" ? "approve" : "reject";
  return authedRequest<{ success: boolean; data: any }>(`/admin/delivery/riders/${userId}/${action}`, token, {
    method: "POST",
  });
}

export async function deleteAdminDeliveryRider(token: string, userId: string, passkey: string) {
  return authedRequest<{ success: boolean; data: any }>(`/admin/delivery/riders/${userId}`, token, {
    method: "DELETE",
    headers: {
      "x-admin-passkey": passkey
    }
  });
}


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


export function deleteProfile(token: string) {
  return authedRequest("/profile/me", token, {
    method: "DELETE",
  });
}

/* =========================================================
   DELIVERY (RIDER)
========================================================= */


export type DeliveryStatusValue =
  | "PENDING"
  | "SCHEDULED"
  | "DISPATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";





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
      id?: string;
      name: string;
      address?: string;
      lat?: number | null;
      lng?: number | null;
    };
    repairRequest: {
      title: string;
      deviceType: string;
      contactPhone?: string | null;
      user?: {
        name?: string | null;
        lat?: number | null;
        lng?: number | null;
      };
    };
  };
};


export type DeliveryChatMessage = {
  id: string;
  deliveryId: string;
  senderUserId: string;
  senderRole: "DELIVERY" | "DELIVERY_ADMIN" | "ADMIN" | string;
  recipientUserId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
};


export type PusherConfig = {
  enabled: boolean;
  key: string;
  cluster: string;
};


export type DeliveryPayoutItem = {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  notes?: string | null;
  paidAt?: string | null;
  createdAt: string;
};


export type DeliveryPayoutSummaryResponse = {
  summary: {
    deliveredTrips: number;
    earned: number;
    requestedOrPaid: number;
    available: number;
    minRequestAmount: number;
    canRequest: boolean;
  };
  payouts: DeliveryPayoutItem[];
};


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


export function patchDeliveryLocation(token: string, lat: number, lng: number) {
  return authedRequest("/delivery/location", token, {
    method: "PATCH",
    body: JSON.stringify({ lat, lng }),
  });
}


export function fetchDeliveryPayoutSummary(token: string) {
  return authedRequest<DeliveryPayoutSummaryResponse>("/delivery/payouts", token);
}


export function requestDeliveryPayout(
  token: string,
  payload?: {
    amount?: number;
    notes?: string;
  },
) {
  return authedRequest<{ message: string; payout: DeliveryPayoutItem }>("/delivery/payouts/request", token, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}


export function fetchDeliveryChatMessages(token: string, deliveryId: string) {
  return authedRequest<{ messages: DeliveryChatMessage[]; pusher?: PusherConfig }>(
    `/delivery/deliveries/${encodeURIComponent(deliveryId)}/chat`,
    token,
  );
}


export function sendDeliveryChatMessage(token: string, deliveryId: string, message: string) {
  return authedRequest<{ message: DeliveryChatMessage }>(
    `/delivery/deliveries/${encodeURIComponent(deliveryId)}/chat`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}

/* =========================================================
   DELIVERY ADMIN
========================================================= */





export type DeliveryAdminStats = {
  pendingRegistrations: number;
  activeApprovedPartners: number;
  rejectedPartners: number;
  totalPartners: number;
  completedDeliveriesTotal: number;
  partnersWithCompletedDeliveries: number;
};


export type DeliveryAdminPartnerRow = {
  id: string;
  vehicleType?: string | null;
  nidDocumentUrl?: string | null;
  educationDocumentUrl?: string | null;
  cvDocumentUrl?: string | null;
  agentStatus: string;
  isActive: boolean;
  registrationStatus: "APPROVED" | "PENDING" | "REJECTED" | string;
  currentLat?: number | null;
  currentLng?: number | null;
  createdAt: string;
  updatedAt: string;
  completedDeliveries: number;
  activeDelivery?: {
    id: string;
    status: DeliveryStatusValue;
    direction: string;
    pickupAddress: string;
    dropAddress: string;
    updatedAt: string;
  } | null;
  user: {
    id: string;
    name?: string | null;
    username: string;
    email: string;
    phone?: string | null;
    role?: string;
    status?: string;
    createdAt: string;
  };
};


export type DeliveryAdminOrder = {
  id: string;
  direction: string;
  status: DeliveryStatusValue;
  pickupAddress: string;
  dropAddress: string;
  fee?: number | null;
  scheduledAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  updatedAt: string;
  deliveryAgent?: {
    id: string;
    user: {
      id: string;
      name?: string | null;
      username: string;
      email: string;
      phone?: string | null;
      lat?: number | null;
      lng?: number | null;
      status?: string;
    };
  } | null;
  repairJob: {
    repairRequest: {
      id: string;
      title: string;
      deviceType: string;
      status: string;
      contactPhone?: string | null;
      user: {
        id: string;
        name?: string | null;
        username: string;
        phone?: string | null;
      };
    };
    shop: {
      id: string;
      name: string;
      phone?: string | null;
      address: string;
    };
  };
};


export type DeliveryAdminPayoutRequest = {
  id: string;
  amount: number;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  paidAt?: string | null;
  riderProfile?: {
    id: string;
    user?: {
      id: string;
      name?: string | null;
      username?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
  } | null;
};


export function fetchDeliveryAdminPayoutRequests(token: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return authedRequest<{ payouts: DeliveryAdminPayoutRequest[] }>(`/delivery-admin/payout-requests${q}`, token);
}


export function fetchDeliveryAdminOrders(token: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return authedRequest<{ deliveries: DeliveryAdminOrder[] }>(`/delivery-admin/deliveries${q}`, token);
}


export function assignDeliveryAdminOrder(token: string, deliveryId: string, deliveryUserId: string) {
  return authedRequest<{ message: string; delivery: DeliveryAdminOrder }>(
    `/delivery-admin/deliveries/${encodeURIComponent(deliveryId)}/assign`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ deliveryUserId }),
    },
  );
}


export function fetchDeliveryAdminOrderTimeline(token: string, deliveryId: string) {
  return authedRequest<{
    delivery: DeliveryAdminOrder;
    timeline: { code: string; title: string; at: string | null }[];
    pusher?: PusherConfig;
  }>(`/delivery-admin/deliveries/${encodeURIComponent(deliveryId)}/timeline`, token);
}


export function fetchDeliveryAdminChatMessages(token: string, deliveryId: string) {
  return authedRequest<{ messages: DeliveryChatMessage[]; pusher?: PusherConfig }>(
    `/delivery-admin/deliveries/${encodeURIComponent(deliveryId)}/chat`,
    token,
  );
}


export function sendDeliveryAdminChatMessage(token: string, deliveryId: string, message: string) {
  return authedRequest<{ message: DeliveryChatMessage }>(
    `/delivery-admin/deliveries/${encodeURIComponent(deliveryId)}/chat`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
}


export function approveDeliveryAdminPayoutRequest(token: string, id: string) {
  return authedRequest<{ message: string; payout: DeliveryAdminPayoutRequest }>(
    `/delivery-admin/payout-requests/${encodeURIComponent(id)}/approve`,
    token,
    {
      method: "PATCH",
    },
  );
}
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
    categories?: string[];
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
    paymentMethod: "CASH" | "SSLCOMMERZ";
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

const GUEST_CART_KEY = "meramot.guestCart";


export function getGuestCart(): Cart[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");
}


export function setGuestCart(cart: Cart[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
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


export async function getAiChatSessions(token?: string) {
  return authedRequest("/ai-chat/sessions", token);
}


export async function createAiChatSession(title = "New Chat", token?: string) {
  return authedRequest<{ id: string; title: string }>("/ai-chat/sessions", token, {
    method: "POST",
    body: JSON.stringify({ title }),
  });
}


export async function saveAiChatMessage(
  sessionId: string,
  role: "user" | "assistant",
  text: string,
  token?: string
) {
  return authedRequest(`/ai-chat/sessions/${sessionId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ role, text }),
  });
}

export async function deleteAiChatSession(sessionId: string, token?: string) {
  return authedRequest(`/ai-chat/sessions/${sessionId}`, token, {
    method: "DELETE",
  });
}