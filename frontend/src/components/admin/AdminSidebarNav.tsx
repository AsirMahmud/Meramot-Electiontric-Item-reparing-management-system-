"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/finance", label: "Finance Ledger" },
  { href: "/admin/vendors", label: "Vendor Review" },
  { href: "/admin/tickets", label: "Support Tickets" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/delivery", label: "Delivery Riders" },
];

export default function AdminSidebarNav() {
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
              className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-[#DCEAD7] text-[var(--accent-dark)]"
                  : "text-[var(--foreground)] hover:bg-[var(--mint-100)] hover:text-[var(--accent-dark)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-[var(--border)] bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Signed in as
        </p>
        <p className="mt-2 text-sm font-semibold text-[var(--accent-dark)]">{adminLabel}</p>

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 w-full rounded-2xl border border-[#C7D7C2] bg-white px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--mint-100)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? "Signing out..." : "Sign out"}
        </button>
      </div>
    </div>
  );
}
