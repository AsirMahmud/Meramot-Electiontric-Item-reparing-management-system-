"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import FeaturedShops from "@/components/home/FeaturedShops";
import Navbar from "@/components/home/Navbar";
import PopularCategories from "@/components/home/PopularCategories";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import SidebarFilters from "@/components/home/SidebarFilters";
import OfferCarousel from "@/components/home/OfferCarousel";
import { getShops, type Shop } from "@/lib/api";

function HomeContent() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsError, setShopsError] = useState<string | null>(null);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const { data: session } = useSession();

  useEffect(() => {
    async function loadShops() {
      try {
        setShopsLoading(true);
        const data = await getShops();
        setShops(data);
        setShopsError(null);
      } catch (err) {
        setShops([]);
        setShopsError("Could not load shops. Check that the backend is running and the API is configured correctly.");
      } finally {
        setShopsLoading(false);
      }
    }
  
    loadShops();
  }, []);

  const firstName = useMemo(() => {
    return (
      session?.user?.name?.trim()?.split(" ")[0] ||
      (session?.user as { username?: string } | undefined)?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [session]);

  return (
    <main className="min-h-screen bg-[#E4FCD5] text-foreground">
      <Navbar
        isLoggedIn={!!session?.user}
        firstName={firstName}
        language={language}
        onLanguageChange={setLanguage}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Suspense fallback={<div className="w-[280px]">Loading filters...</div>}>
          <SidebarFilters targetPath="/shops" />
        </Suspense>

        <div className="space-y-8">
          <OfferCarousel />
          <FeaturedShops shops={shops} />
          <PopularCategories />
          <RecentlyViewed />
        </div>
      </div>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E4FCD5] flex items-center justify-center"><p>Loading...</p></div>}>
      <HomeContent />
    </Suspense>
  );
}