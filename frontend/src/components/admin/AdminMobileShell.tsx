"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/theme/ThemeToggle";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export default function AdminMobileShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/*
       * Outer flex row — fills the full viewport height.
       * On desktop (md+): sidebar + main side by side.
       * On mobile: sidebar is a hidden overlay, only main is shown.
       */}
      <div className="flex min-h-screen max-w-7xl mx-auto">

        {/* ── Desktop sidebar — always visible, full height ─────── */}
        <aside
          style={{ width: "260px", minWidth: "260px" }}
          className="hidden md:flex flex-col min-h-screen sticky top-0 border-r border-[var(--border)] bg-[var(--card)] overflow-y-auto p-6"
        >
          {/* Header Row: Logo & Theme Toggle */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={200}
                height={70}
                className="h-[4rem] w-auto object-contain"
                priority
              />
            </Link>
            <ThemeToggle />
          </div>

          {/* Title */}
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
              Meramot
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--accent-dark)]">
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Verify vendors, support users, and mediate disputes.
            </p>
          </div>

          <AdminSidebarNav />
        </aside>

        {/* ── Right side: mobile header + content ──────────────── */}
        <div className="flex flex-col flex-1 min-w-0">

          {/* Mobile top bar */}
          <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)]">
            <Link href="/" className="inline-block">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={140}
                height={48}
                className="h-[2.8rem] w-auto object-contain"
                priority
              />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-lg text-[var(--foreground)] shadow-sm"
                aria-label="Toggle admin menu"
              >
                {sidebarOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Mobile dropdown nav */}
          {sidebarOpen && (
            <div className="md:hidden border-b border-[var(--border)] bg-[var(--card)] px-4 py-4 shadow-lg">
              <AdminSidebarNav onNavClick={() => setSidebarOpen(false)} />
            </div>
          )}



          {/* Page content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <div className="rounded-[1.5rem] md:rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 md:p-6 lg:p-8 shadow-sm min-h-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
