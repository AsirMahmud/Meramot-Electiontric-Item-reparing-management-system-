"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import FeaturedShops from "@/components/home/FeaturedShops";
import Navbar from "@/components/home/Navbar";
import PopularCategories from "@/components/home/PopularCategories";
import RecentlyViewed from "@/components/home/RecentlyViewed";

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

      <div className="mx-auto max-w-[1600px] px-4 pt-4 md:px-6 md:pt-6">
        <OfferCarousel />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6 md:space-y-8">
          <FeaturedShops />
          <PopularCategories />
          <RecentlyViewed />
        </div>
      </div>
    </main>
  );
}
