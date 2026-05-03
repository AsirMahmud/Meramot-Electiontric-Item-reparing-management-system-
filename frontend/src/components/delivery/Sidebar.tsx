"use client";

import { Home, Map, Wallet, User, Menu, X, LogOut, Package2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { useState } from "react";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useDeliveryAuth();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", icon: Home, path: "/delivery" },
    { name: "Live Map", icon: Map, path: "/delivery/map" },
    { name: "Earnings", icon: Wallet, path: "/delivery/earnings" },
    { name: "Profile", icon: User, path: "/delivery/profile" },
  ];

  return (
    <>
      <div className="sticky top-0 z-50 flex items-center justify-between border-b border-[var(--border)] bg-[var(--card)] p-4 md:hidden">
        <div className="flex items-center gap-2 text-[var(--accent-dark)]">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)]">
            <Package2 size={18} />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight">Meeramoot Delivery</p>
            <p className="text-[11px] font-medium text-[var(--accent-dark)]/65">Rider Portal</p>
          </div>
        </div>
        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="rounded-lg border border-[var(--border)] p-2 text-[var(--accent-dark)]"
          onClick={() => setIsOpen((v) => !v)}
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-[var(--border)] bg-[var(--card)] transition-transform duration-300 md:sticky md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden border-b border-[var(--border)] px-6 py-6 md:flex md:items-center md:gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--foreground)] text-[var(--background)]">
            <Package2 size={20} />
          </div>
          <div>
            <p className="text-sm font-extrabold text-[var(--accent-dark)]">Meeramoot Delivery</p>
            <p className="text-xs font-medium text-[var(--accent-dark)]/65">Rider Workspace</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
            const isActive =
              item.path === "/delivery"
                ? pathname === "/delivery" || pathname === "/delivery/"
                : pathname === item.path;
            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  isActive
                    ? "border border-[var(--border)] bg-[var(--mint-100)] text-[var(--accent-dark)]"
                    : "text-[var(--accent-dark)]/70 hover:bg-[var(--mint-50)] hover:text-[var(--accent-dark)]",
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border)] p-4">
          <Link
            href="/delivery/register"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[var(--accent-dark)]/70 transition hover:bg-[var(--mint-50)] hover:text-[var(--accent-dark)]"
          >
            Extended onboarding
          </Link>
          <div className="flex w-full items-center justify-between mt-2 pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/delivery/login");
              }}
              className="flex flex-1 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-700/80 transition hover:bg-red-50 hover:text-red-700"
            >
              <LogOut size={18} />
              Sign Out
            </button>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {isOpen && (
        <button
          type="button"
          aria-label="Close menu backdrop"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

