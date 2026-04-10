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

export type AuthPayload = {
  message: string;
  token: string;
  user: {
    id: string;
    username: string | null;
    email: string | null;
    role: string;
  };
};

export function getShops() {
  return request<Shop[]>("/shops", { cache: "no-store" });
}

export function signup(data: { username: string; email: string; password: string }) {
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
