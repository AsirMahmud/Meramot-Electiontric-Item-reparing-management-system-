const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

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
    throw new Error((data as { message?: string }).message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export type ShopCategory = "COURIER_PICKUP" | "IN_SHOP_REPAIR" | "SPARE_PARTS";
export type ShopServicePricingType = "FIXED" | "STARTING_FROM" | "INSPECTION_REQUIRED";

export type ShopSummary = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;
  lat?: number | null;
  lng?: number | null;
  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;
  isFeatured?: boolean;
  hasVoucher: boolean;
  freeDelivery: boolean;
  hasDeals: boolean;
  categories?: ShopCategory[];
  specialties?: string[];
  acceptsDirectOrders?: boolean;
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
  pricingType: ShopServicePricingType;
  basePrice?: number | null;
  priceMax?: number | null;
  estimatedDaysMin?: number | null;
  estimatedDaysMax?: number | null;
  includesPickup: boolean;
  includesDelivery: boolean;
  isFeatured?: boolean;
};

export type ShopDetail = ShopSummary & {
  phone?: string | null;
  email?: string | null;
  deliveryRadiusKm?: number | null;
  openingHoursText?: string | null;
  createdAt?: string;
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
  return request<ShopSummary[]>(`/shops${suffix}`);
}

export function getFeaturedShops() {
  return request<ShopSummary[]>("/shops/featured");
}

export function getShopBySlug(slug: string) {
  return request<ShopDetail>(`/shops/${encodeURIComponent(slug)}`);
}

/** localStorage key — separate from NextAuth session */
export const DELIVERY_TOKEN_STORAGE_KEY = "meeramoot_delivery_token";

async function deliveryRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: init?.cache ?? "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { message?: string }).message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export type DeliveryAuthPayload = {
  message: string;
  token: string;
  tokenType: "delivery";
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

export type DeliveryMeResponse = {
  riderProfile: {
    id: string;
    userId: string;
    vehicleType?: string | null;
    status: string;
    isActive: boolean;
    registrationStatus?: string;
    currentLat?: number | null;
    currentLng?: number | null;
    user: {
      id: string;
      name?: string | null;
      username: string;
      email: string;
      phone?: string | null;
      role: string;
      status: string;
      avatarUrl?: string | null;
    };
    coverageZones: {
      coverageZone: {
        id: string;
        name: string;
        city?: string | null;
        area?: string | null;
      };
    }[];
  };
};

export function fetchDeliveryMe(token: string) {
  return deliveryRequest<DeliveryMeResponse>("/delivery/me", token);
}

export type DeliveryWithJob = {
  id: string;
  status: string;
  direction: string;
  deliveryAgentId?: string | null;
  pickupAddress: string;
  dropAddress: string;
  fee?: number | null;
  scheduledAt?: string | null;
  repairJob: {
    id: string;
    repairRequest: {
      id: string;
      title: string;
      deviceType: string;
      status: string;
      contactPhone?: string | null;
    };
    shop: {
      id: string;
      name: string;
      phone?: string | null;
      address: string;
    };
  };
};

export type DeliveryStatusValue =
  | "PENDING"
  | "SCHEDULED"
  | "DISPATCHED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export function fetchDeliveryDeliveries(token: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return deliveryRequest<{ deliveries: DeliveryWithJob[] }>(`/delivery/deliveries${q}`, token);
}

export function updateDeliveryStatus(token: string, deliveryId: string, status: DeliveryStatusValue) {
  return deliveryRequest<{ delivery: DeliveryWithJob }>(
    `/delivery/deliveries/${encodeURIComponent(deliveryId)}/status`,
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    },
  );
}

export function acceptDelivery(token: string, deliveryId: string) {
  return deliveryRequest<{ delivery: DeliveryWithJob }>(
    `/delivery/deliveries/${encodeURIComponent(deliveryId)}/accept`,
    token,
    {
      method: "PATCH",
    },
  );
}

export function patchDeliveryLocation(token: string, lat: number, lng: number) {
  return deliveryRequest<{ riderProfile: { id: string; currentLat: number | null; currentLng: number | null } }>(
    "/delivery/location",
    token,
    {
      method: "PATCH",
      body: JSON.stringify({ lat, lng }),
    },
  );
}

/** Separate from delivery partner token — operations console for approving partners. */
export const DELIVERY_ADMIN_TOKEN_STORAGE_KEY = "meeramoot_delivery_admin_token";

async function deliveryAdminRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: init?.cache ?? "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error((data as { message?: string }).message || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export type DeliveryAdminAuthPayload = {
  message: string;
  token: string;
  tokenType: "delivery_admin";
  user: {
    id: string;
    name?: string | null;
    username: string;
    email: string;
    phone?: string | null;
    role: string;
  };
};

export function deliveryAdminLogin(data: { identifier: string; password: string }) {
  return request<DeliveryAdminAuthPayload>("/delivery-admin/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

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

export function fetchDeliveryAdminMe(token: string) {
  return deliveryAdminRequest<DeliveryAdminMeResponse>("/delivery-admin/me", token);
}

export type DeliveryAdminStats = {
  pendingRegistrations: number;
  activeApprovedPartners: number;
  rejectedPartners: number;
  totalPartners: number;
  completedDeliveriesTotal: number;
  partnersWithCompletedDeliveries: number;
};

export function fetchDeliveryAdminStats(token: string) {
  return deliveryAdminRequest<{ stats: DeliveryAdminStats }>("/delivery-admin/stats", token);
}

export type DeliveryAdminPartnerRow = {
  id: string;
  vehicleType?: string | null;
  nidDocumentUrl?: string | null;
  educationDocumentUrl?: string | null;
  cvDocumentUrl?: string | null;
  agentStatus: string;
  isActive: boolean;
  registrationStatus: string;
  currentLat?: number | null;
  currentLng?: number | null;
  createdAt: string;
  updatedAt: string;
  completedDeliveries: number;
  user: {
    id: string;
    name?: string | null;
    username: string;
    email: string;
    phone?: string | null;
    status: string;
    createdAt: string;
  };
};

export function fetchDeliveryAdminPartners(token: string, registrationStatus?: string) {
  const q = registrationStatus ? `?registrationStatus=${encodeURIComponent(registrationStatus)}` : "";
  return deliveryAdminRequest<{ partners: DeliveryAdminPartnerRow[] }>(`/delivery-admin/partners${q}`, token);
}

export function approveDeliveryPartnerAdmin(token: string, partnerProfileId: string) {
  return deliveryAdminRequest<{ message: string }>(
    `/delivery-admin/partners/${encodeURIComponent(partnerProfileId)}/approve`,
    token,
    { method: "PATCH" },
  );
}

export function rejectDeliveryPartnerAdmin(token: string, partnerProfileId: string) {
  return deliveryAdminRequest<{ message: string }>(
    `/delivery-admin/partners/${encodeURIComponent(partnerProfileId)}/reject`,
    token,
    { method: "PATCH" },
  );
}
