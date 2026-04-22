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
  DELIVERY_ADMIN_TOKEN_STORAGE_KEY,
  deliveryAdminLogin as apiDeliveryAdminLogin,
  fetchDeliveryAdminMe,
  type DeliveryAdminMeResponse,
} from "@/lib/api";

type DeliveryAdminAuthState = {
  token: string | null;
  user: DeliveryAdminMeResponse["user"] | null;
  loading: boolean;
  hydrated: boolean;
};

type DeliveryAdminAuthContextValue = DeliveryAdminAuthState & {
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isAuthenticated: boolean;
};

const DeliveryAdminAuthContext = createContext<DeliveryAdminAuthContextValue | null>(null);

const PUBLIC_PREFIXES = ["/delivery-admin/login"];

export function isPublicDeliveryAdminPath(pathname: string | null) {
  if (!pathname) return false;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function DeliveryAdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<DeliveryAdminMeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const persistToken = useCallback((t: string | null) => {
    setToken(t);
    if (typeof window === "undefined") return;
    if (t) {
      localStorage.setItem(DELIVERY_ADMIN_TOKEN_STORAGE_KEY, t);
    } else {
      localStorage.removeItem(DELIVERY_ADMIN_TOKEN_STORAGE_KEY);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const data = await fetchDeliveryAdminMe(token);
      setUser(data.user);
    } catch {
      persistToken(null);
      setUser(null);
    }
  }, [token, persistToken]);

  useEffect(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(DELIVERY_ADMIN_TOKEN_STORAGE_KEY) : null;
    if (!stored) {
      setHydrated(true);
      return;
    }
    setToken(stored);
    setLoading(true);
    fetchDeliveryAdminMe(stored)
      .then((data) => setUser(data.user))
      .catch(() => {
        persistToken(null);
        setUser(null);
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
        const payload = await apiDeliveryAdminLogin({ identifier, password });
        persistToken(payload.token);
        setUser({
          id: payload.user.id,
          name: payload.user.name ?? null,
          username: payload.user.username,
          email: payload.user.email,
          phone: payload.user.phone ?? null,
          role: payload.user.role,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        });
        const me = await fetchDeliveryAdminMe(payload.token);
        setUser(me.user);
      } finally {
        setLoading(false);
      }
    },
    [persistToken],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  const value = useMemo<DeliveryAdminAuthContextValue>(
    () => ({
      token,
      user,
      loading,
      hydrated,
      login,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token && user),
    }),
    [token, user, loading, hydrated, login, logout, refreshMe],
  );

  return (
    <DeliveryAdminAuthContext.Provider value={value}>{children}</DeliveryAdminAuthContext.Provider>
  );
}

export function useDeliveryAdminAuth() {
  const ctx = useContext(DeliveryAdminAuthContext);
  if (!ctx) {
    throw new Error("useDeliveryAdminAuth must be used within DeliveryAdminAuthProvider");
  }
  return ctx;
}

export function DeliveryAdminAuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, loading, token, user } = useDeliveryAdminAuth();

  const isPublic = isPublicDeliveryAdminPath(pathname);

  useEffect(() => {
    if (!hydrated) return;
    if (isPublic) return;
    if (loading) return;
    if (!token || !user) {
      router.replace(`/delivery-admin/login?next=${encodeURIComponent(pathname || "/delivery-admin")}`);
    }
  }, [hydrated, isPublic, loading, token, user, router, pathname]);

  if (!hydrated || (!isPublic && (loading || !token || !user))) {
    if (isPublic) {
      return <>{children}</>;
    }
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="rounded-2xl bg-slate-900 px-10 py-8 shadow-lg border border-slate-800">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"
              aria-hidden
            />
            <p className="text-sm font-semibold text-slate-200">Loading operations console…</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
