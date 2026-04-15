"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type StoredUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/finance", label: "Finance Ledger" },
  { href: "/admin/vendors", label: "Vendor Review" },
  { href: "/admin/tickets", label: "Support Tickets" },
  { href: "/admin/disputes", label: "Disputes" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [adminUser, setAdminUser] = useState<StoredUser | null>(null);

  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginRoute) {
      setIsCheckingAuth(false);
      return;
    }

    const rawUser = localStorage.getItem("meramot.user");
    if (!rawUser) {
      router.replace("/admin/login");
      setIsCheckingAuth(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(rawUser) as StoredUser;
      if (parsedUser.role !== "ADMIN") {
        localStorage.removeItem("meramot.user");
        localStorage.removeItem("meramot.token");
        router.replace("/admin/login");
        setIsCheckingAuth(false);
        return;
      }

      setAdminUser(parsedUser);
      setIsCheckingAuth(false);
    } catch {
      localStorage.removeItem("meramot.user");
      localStorage.removeItem("meramot.token");
      router.replace("/admin/login");
      setIsCheckingAuth(false);
    }
  }, [isLoginRoute, router]);

  const adminDisplayName = useMemo(() => {
    if (!adminUser) {
      return "Admin";
    }

    return (
      adminUser.name?.trim() ||
      adminUser.username?.trim() ||
      adminUser.email?.trim() ||
      "Admin"
    );
  }, [adminUser]);

  function handleLogout() {
    localStorage.removeItem("meramot.user");
    localStorage.removeItem("meramot.token");
    window.dispatchEvent(new Event("meramot-auth-changed"));
    router.replace("/admin/login");
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  if (isCheckingAuth) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#EEF5EA] text-[#244233]">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#5E7366]">
          Verifying admin access...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EEF5EA] text-[#244233]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">
              Meramot
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#1F4D2E]">Admin Panel</h1>
            <p className="mt-2 text-sm text-[#6B7C72]">
              Verify vendors, support users, and mediate disputes.
            </p>
            <p className="mt-4 rounded-2xl bg-[#EAF3E6] px-3 py-2 text-xs font-medium text-[#355845]">
              Signed in as {adminDisplayName}
            </p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#244233] transition hover:bg-[#E6F0E2] hover:text-[#1F4D2E]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 w-full rounded-2xl border border-[#BFD1B9] bg-white px-4 py-3 text-sm font-semibold text-[#244233] transition hover:bg-[#E6F0E2]"
          >
            Log out
          </button>
        </aside>

        <main className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
