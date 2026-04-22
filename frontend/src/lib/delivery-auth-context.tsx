"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DELIVERY_TOKEN_STORAGE_KEY,
  deliveryLogin as apiDeliveryLogin,
  deliveryRegister as apiDeliveryRegister,
  fetchDeliveryMe,
  type DeliveryAuthPayload,
  type DeliveryMeResponse,
} from "@/lib/api";

type DeliveryAuthState = {
  token: string | null;
  me: DeliveryMeResponse["riderProfile"] | null;
  loading: boolean;
  hydrated: boolean;
};

type DeliveryAuthContextValue = DeliveryAuthState & {
  login: (identifier: string, password: string) => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    vehicleType?: string;
    nidDocumentUrl: string;
    educationDocumentUrl: string;
    cvDocumentUrl: string;
  }) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isAuthenticated: boolean;
};

const DeliveryAuthContext = createContext<DeliveryAuthContextValue | null>(null);

const PUBLIC_PREFIXES = ["/delivery/login", "/delivery/signup", "/delivery/register"];

export function isPublicDeliveryPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DeliveryAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<DeliveryMeResponse["riderProfile"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const persistToken = useCallback((t: string | null) => {
    setToken(t);
    if (typeof window === "undefined") return;
    if (t) {
      localStorage.setItem(DELIVERY_TOKEN_STORAGE_KEY, t);
    } else {
      localStorage.removeItem(DELIVERY_TOKEN_STORAGE_KEY);
    }
  }, []);

  const applyAuthPayload = useCallback(async (payload: DeliveryAuthPayload) => {
    persistToken(payload.token);

    // Use login/register response immediately so auth does not fail on an extra /me round-trip.
    setMe({
      id: payload.riderProfile.id,
      userId: payload.user.id,
      vehicleType: payload.riderProfile.vehicleType ?? null,
      status: payload.riderProfile.status,
      isActive: payload.riderProfile.isActive ?? true,
      registrationStatus: payload.riderProfile.registrationStatus ?? "APPROVED",
      currentLat: null,
      currentLng: null,
      user: {
        id: payload.user.id,
        name: payload.user.name ?? null,
        username: payload.user.username,
        email: payload.user.email,
        phone: payload.user.phone ?? null,
        role: payload.user.role,
        status: "ACTIVE",
        avatarUrl: null,
      },
      coverageZones: [],
    });

    try {
      const profile = await fetchDeliveryMe(payload.token);
      setMe(profile.riderProfile);
    } catch {
      // Keep session from login payload even if /me is temporarily unavailable.
    }
  }, [persistToken]);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setMe(null);
      return;
    }
    try {
      const profile = await fetchDeliveryMe(token);
      setMe(profile.riderProfile);
    } catch {
      persistToken(null);
      setMe(null);
    }
  }, [token, persistToken]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(DELIVERY_TOKEN_STORAGE_KEY) : null;
    if (!stored) {
      setHydrated(true);
      return;
    }
    setToken(stored);
    setLoading(true);
    fetchDeliveryMe(stored)
      .then((data) => setMe(data.riderProfile))
      .catch(() => {
        persistToken(null);
        setMe(null);
      })
      .finally(() => {
        setLoading(false);
        setHydrated(true);
      });
  }, [persistToken]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      setLoading(true);
      try {
        const payload = await apiDeliveryLogin({ identifier, password });
        await applyAuthPayload(payload);
      } finally {
        setLoading(false);
      }
    },
    [applyAuthPayload],
  );

  const register = useCallback(
    async (data: {
      name: string;
      email: string;
      phone: string;
      vehicleType?: string;
      nidDocumentUrl: string;
      educationDocumentUrl: string;
      cvDocumentUrl: string;
    }) => {
      setLoading(true);
      try {
        const payload = await apiDeliveryRegister(data);
        await applyAuthPayload(payload);
      } finally {
        setLoading(false);
      }
    },
    [applyAuthPayload],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setMe(null);
  }, [persistToken]);

  const value = useMemo<DeliveryAuthContextValue>(
    () => ({
      token,
      me,
      loading,
      hydrated,
      login,
      register,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token && me),
    }),
    [token, me, loading, hydrated, login, register, logout, refreshMe],
  );

  return (
    <DeliveryAuthContext.Provider value={value}>{children}</DeliveryAuthContext.Provider>
  );
}

export function useDeliveryAuth() {
  const ctx = useContext(DeliveryAuthContext);
  if (!ctx) {
    throw new Error("useDeliveryAuth must be used within DeliveryAuthProvider");
  }
  return ctx;
}

export function DeliveryAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, loading, token, me } = useDeliveryAuth();

  const isPublic = isPublicDeliveryPath(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (isPublic) return;
    if (loading) return;
    if (!token || !me) {
      router.replace(`/delivery/login?next=${encodeURIComponent(pathname || "/delivery")}`);
    }
  }, [hydrated, isPublic, loading, token, me, router, pathname]);

  if (!hydrated || (!isPublic && (loading || !token || !me))) {
    if (isPublic) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen bg-[#E4FCD5] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-10 py-8 shadow-sm border border-[#d9e5d5]">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 border-2 border-[#163625] border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
            <p className="text-sm font-semibold text-[#163625]">Loading partner session…</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
