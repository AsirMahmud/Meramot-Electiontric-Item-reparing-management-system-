"use client";

import { Home, Map, Wallet, User, Menu, X, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, me } = useDeliveryAuth();
  const [isOpen, setIsOpen] = useState(false);
  const isApprovedPartner = (me?.registrationStatus ?? "APPROVED") === "APPROVED";

  const navItems = [
    { name: "Dashboard", icon: Home, path: "/delivery", restricted: true },
    { name: "Live Map", icon: Map, path: "/delivery/map", restricted: true },
    { name: "Earnings", icon: Wallet, path: "/delivery/earnings", restricted: true },
    { name: "Profile", icon: User, path: "/delivery/profile", restricted: false },
  ];

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        className="fixed left-4 top-4 z-50 rounded-lg border border-[#d9e5d5] bg-white p-2 text-[#163625] shadow-sm md:hidden"
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[85vw] max-w-[300px] flex-col border-r border-[#d9e5d5] bg-white transition-transform duration-300 md:sticky md:top-0 md:w-[280px] md:max-w-none md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="border-b border-[#d9e5d5] px-6 py-6 flex items-center gap-3">
          <div>
            <Image src="/images/meramot.svg" alt="Meramot" width={180} height={60} className="h-11 w-auto" priority />
            <p className="text-xs font-medium text-[#163625]/65">Delivery Workspace</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
          {navItems.map((item) => {
            const isDisabled = item.restricted && !isApprovedPartner;
            const isActive =
              item.path === "/delivery"
                ? pathname === "/delivery" || pathname === "/delivery/"
                : pathname === item.path;
            return (
              <Link
                key={item.name}
                href={isDisabled ? "#" : item.path}
                onClick={(e) => {
                  if (isDisabled) {
                    e.preventDefault();
                    return;
                  }
                  setIsOpen(false);
                }}
                aria-disabled={isDisabled}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition",
                  isDisabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-[#163625]/70",
                  isActive
                    ? "border border-[#d9e5d5] bg-[#eef4ea] text-[#163625]"
                    : "text-[#163625]/70 hover:bg-[#f5f9f2] hover:text-[#163625]",
                )}
              >
                <item.icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          {!isApprovedPartner ? (
            <p className="px-3 pt-2 text-xs font-medium text-[#163625]/65">
              Account pending approval. Only profile is accessible.
            </p>
          ) : null}
        </nav>

        <div className="border-t border-[#d9e5d5] p-4">
          <Link
            href="/delivery/register"
            className="mb-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#163625]/70 transition hover:bg-[#f5f9f2] hover:text-[#163625]"
          >
            Extended onboarding
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/delivery/login");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-700/80 transition hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
            Sign Out
          </button>
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
