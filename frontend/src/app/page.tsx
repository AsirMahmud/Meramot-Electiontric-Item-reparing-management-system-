"use client";

import { useEffect, useMemo, useState } from "react";
import FeaturedShops from "@/components/home/FeaturedShops";
import Navbar from "@/components/home/Navbar";
import PopularCategories from "@/components/home/PopularCategories";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import SidebarFilters from "@/components/home/SidebarFilters";
import OfferCarousel from "@/components/home/OfferCarousel";

type StoredUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function HomePage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [language, setLanguage] = useState<"en" | "bn">("en");

  useEffect(() => {
    function syncUserFromStorage() {
      const rawUser = localStorage.getItem("meramot.user");
  
      if (!rawUser) {
        setUser(null);
        return;
      }
  
      try {
        setUser(JSON.parse(rawUser));
      } catch {
        localStorage.removeItem("meramot.user");
        setUser(null);
      }
    }
  
    syncUserFromStorage();
  
    window.addEventListener("meramot-auth-changed", syncUserFromStorage);
  
    return () => {
      window.removeEventListener("meramot-auth-changed", syncUserFromStorage);
    };
  }, []);

  const firstName = useMemo(() => {
    return (
      user?.name?.trim()?.split(" ")[0] ||
      user?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [user]);

  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-[var(--background)] text-foreground">
=======
    <main className="min-h-screen bg-background text-foreground">
>>>>>>> origin/main
      <Navbar
        isLoggedIn={!!user}
        firstName={firstName}
        language={language}
        onLanguageChange={setLanguage}
      />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarFilters />

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
