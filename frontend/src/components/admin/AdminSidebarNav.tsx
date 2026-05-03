"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/repair-requests", label: "Repair Requests" },
  { href: "/admin/delivery", label: "Delivery Riders" },
  { href: "/admin/tickets", label: "Support Tickets" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/finance", label: "Finance Ledger" },
  { href: "/delivery-admin", label: "Live Delivery Dispatch" },
];

export default function AdminSidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const adminLabel = useMemo(() => {
    const sessionUser = session?.user as { name?: string | null; username?: string | null } | undefined;
    return sessionUser?.name?.trim() || sessionUser?.username?.trim() || "Admin";
  }, [session]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const result = await signOut({
        redirect: false,
        callbackUrl: "/",
      });
      router.replace(result?.url || "/");
    } catch {
      router.replace("/");
    } finally {
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#DCEAD7] dark:bg-[#233027] text-[var(--accent-dark)] dark:text-[#5BD881]"
                  : "text-[var(--foreground)] dark:text-[#E4FCD5] hover:bg-[var(--mint-100)] dark:hover:bg-[#1C251F] hover:text-[var(--accent-dark)] dark:hover:text-[#5BD881]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-[var(--border)] dark:border-[#2F4034] bg-white/70 dark:bg-[#1C251F]/90 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] dark:text-[#4F6C5B]">
          Signed in as
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--accent-dark)] dark:text-[#2E5B3D]">{adminLabel}</p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 w-full rounded-2xl border border-[#C7D7C2] dark:border-[#2F4034] bg-white dark:bg-[#171F1A] px-4 py-3 text-sm font-semibold text-[var(--foreground)] dark:text-[#E4FCD5] transition hover:bg-[var(--mint-100)] dark:hover:bg-[#233027] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
