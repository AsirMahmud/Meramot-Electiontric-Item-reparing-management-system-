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
    profilePictureUrl: string;
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

function normalizeRiderProfile(
  riderProfile: DeliveryMeResponse["riderProfile"] | Record<string, unknown>,
): DeliveryMeResponse["riderProfile"] {
  const p = riderProfile as Record<string, any>;
  if (p.user && typeof p.user === "object") {
    return p as DeliveryMeResponse["riderProfile"];
  }

  return {
    id: (p.id as string) ?? "",
    userId: (p.userId as string) ?? (p.id as string) ?? "",
    vehicleType: (p.vehicleType as string | null | undefined) ?? null,
    status: (p.status as string) ?? "OFFLINE",
    isActive: (p.isActive as boolean | undefined) ?? true,
    registrationStatus: (p.registrationStatus as string | undefined) ?? "APPROVED",
    currentLat: (p.currentLat as number | null | undefined) ?? (p.lat as number | null | undefined) ?? null,
    currentLng: (p.currentLng as number | null | undefined) ?? (p.lng as number | null | undefined) ?? null,
    coverageZones: Array.isArray(p.coverageZones) ? p.coverageZones : [],
    user: {
      id: (p.id as string) ?? "",
      name: (p.name as string | null | undefined) ?? null,
      username: (p.username as string) ?? "",
      email: (p.email as string) ?? "",
      phone: (p.phone as string | null | undefined) ?? null,
      role: (p.role as string) ?? "DELIVERY",
      status: (p.status as string | undefined) ?? "ACTIVE",
      avatarUrl: (p.avatarUrl as string | null | undefined) ?? null,
    },
  };
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

    const rp = payload.riderProfile;
    const u = payload.user;

    if (!rp || !u) return;

    // Use login/register response immediately so auth does not fail on an extra /me round-trip.
    setMe({
      id: rp.id,
      email: u.email,
      name: u.name ?? null,
      phone: u.phone ?? null,
      userId: u.id,
      vehicleType: rp.vehicleType ?? null,
      status: rp.status,
      isActive: rp.isActive ?? true,
      registrationStatus: rp.registrationStatus ?? "APPROVED",
      currentLat: null,
      currentLng: null,
      user: {
        id: u.id,
        name: u.name ?? null,
        username: u.username,
        email: u.email,
        phone: u.phone ?? null,
        role: u.role,
        status: "ACTIVE",
      },
      coverageZones: [],
    });

    try {
      const profile = await fetchDeliveryMe(payload.token);
      setMe(normalizeRiderProfile(profile.riderProfile));
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
      setMe(normalizeRiderProfile(profile.riderProfile));
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
      .then((data) => setMe(normalizeRiderProfile(data.riderProfile)))
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
      profilePictureUrl: string;
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

  useEffect(() => {
    if (!hydrated || loading || isPublic) return;
    if (!token || !me) return;

    const registrationStatus = me.registrationStatus ?? "APPROVED";
    const isProfileRoute = pathname === "/delivery/profile" || pathname?.startsWith("/delivery/profile/");
    if (registrationStatus !== "APPROVED" && !isProfileRoute) {
      router.replace("/delivery/profile");
    }
  }, [hydrated, loading, isPublic, token, me, pathname, router]);

  if (!hydrated || (!isPublic && (loading || !token || !me))) {
    if (isPublic) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen bg-[#E4FCD5] flex items-center justify-center">
        <div className="rounded-2xl bg-white px-10 py-8 shadow-sm border border-[#d9e5d5]">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 border-2 border-[var(--foreground)] border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
            <p className="text-sm font-semibold text-[var(--foreground)]">Loading partner sessionâ€¦</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

