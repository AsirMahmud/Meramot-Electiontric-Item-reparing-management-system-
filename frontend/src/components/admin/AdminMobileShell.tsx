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
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 grid-rows-[auto_1fr] gap-3 px-3 py-3 md:grid-rows-1 md:gap-6 md:px-4 md:py-6 md:grid-cols-[260px_1fr]">
        {/* ── Sidebar column ── */}
        <div className="relative flex flex-col md:gap-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={240}
                height={80}
                className="h-[3.5rem] w-auto object-contain md:h-[4.5rem] lg:h-[5rem]"
                priority
              />
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {/* Hamburger — mobile only */}
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--card)] text-lg text-[var(--foreground)] shadow-sm md:hidden"
                aria-label="Toggle admin menu"
              >
                {sidebarOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* Sidebar panel — collapsible overlay on mobile, static on md+ */}
          <aside className={`absolute left-0 right-0 top-full z-50 mt-0 rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl md:static md:rounded-[2rem] md:p-6 md:shadow-sm ${sidebarOpen ? "block mobile-collapse-enter" : "hidden"} md:block`}>
            <div className="mb-4 md:mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)] md:text-sm">
                Meramot
              </p>
              <h1 className="mt-2 text-xl font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">
                Admin Panel
              </h1>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
                Verify vendors, support users, and mediate disputes.
              </p>
            </div>

            <AdminSidebarNav onNavClick={() => setSidebarOpen(false)} />
          </aside>
        </div>

        <main className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm md:rounded-[2rem] md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
