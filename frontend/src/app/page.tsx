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
      <SidebarFilters targetPath="/shops" />

        <div className="space-y-8">
          <OfferCarousel />
          <FeaturedShops />
          <PopularCategories />
          <RecentlyViewed />
        </div>
      </div>
    </main>
  );
}
