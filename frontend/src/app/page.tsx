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

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <SidebarFilters targetPath="/shops" />
        </div>

        <div className="space-y-8">
          {/* Mobile filter button */}
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] shadow-sm lg:hidden"
          >
            <span className="text-lg leading-none">☰</span>
            {filtersOpen ? "Close filters" : "Filters & sort"}
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
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
          />

          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto border-r border-[var(--border)] bg-[var(--background)] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--foreground)]">
                Filters & sort
              </h2>

              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-bold text-[var(--accent-dark)]"
              >
                ☰ Close
              </button>
            </div>

            <SidebarFilters targetPath="/shops" />
          </aside>
        </div>
      )}
    </main>
  );
}
