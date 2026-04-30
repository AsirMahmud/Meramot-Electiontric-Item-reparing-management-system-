"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import FeaturedShops from "@/components/home/FeaturedShops";
import Navbar from "@/components/home/Navbar";
import PopularCategories from "@/components/home/PopularCategories";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import SidebarFilters from "@/components/home/SidebarFilters";
import OfferCarousel from "@/components/home/OfferCarousel";

type SessionUser = {
  name?: string | null;
  username?: string | null;
  email?: string | null;
};

export default function HomePage() {
  const { data: session, status } = useSession();
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sessionUser = session?.user as SessionUser | undefined;
  const isLoggedIn = status === "authenticated" && !!sessionUser;

  const firstName = useMemo(() => {
    const source =
      sessionUser?.name?.trim() ||
      sessionUser?.username?.trim() ||
      sessionUser?.email?.trim() ||
      "User";

    return source.split(/[\s@]+/)[0] || "User";
  }, [sessionUser]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-foreground">
      <Navbar
        isLoggedIn={isLoggedIn}
        firstName={firstName}
        language={language}
        onLanguageChange={setLanguage}
      />

      <div className="mx-auto grid max-w-7xl gap-4 px-3 py-4 md:gap-6 md:px-6 md:py-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <SidebarFilters targetPath="/shops" />
        </div>

        <div className="space-y-6 md:space-y-8">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            aria-expanded={filtersOpen}
            className="mobile-collapse-toggle lg:hidden"
          >
            <span className="flex items-center gap-2">
              <span className="text-xl leading-none">☰</span>
              {filtersOpen ? "Close filters" : "Filters & sort"}
            </span>
            <span className="chevron text-lg leading-none">{filtersOpen ? "✕" : "▼"}</span>
          </button>

          <OfferCarousel />
          <FeaturedShops />
          <PopularCategories />
          <RecentlyViewed />
        </div>
      </div>

      {/* Mobile drawer */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
            className="mobile-sidebar-backdrop"
          />

          <aside className="mobile-sidebar-panel">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--foreground)]">
                Filters & sort
              </h2>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full bg-[var(--mint-100)] px-3 py-1.5 text-xs font-bold text-[var(--accent-dark)]"
              >
                ✕ Close
              </button>
            </div>

            <SidebarFilters targetPath="/shops" />
          </aside>
        </div>
      )}
    </main>
  );
}
