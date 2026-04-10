import FeaturedShops from "@/components/home/FeaturedShops";
import Navbar from "@/components/Navbar";
import PopularCategories from "@/components/home/PopularCategories";
import RecentlyViewed from "@/components/home/RecentlyViewed";
import SidebarFilters from "@/components/home/SidebarFilters";
import OfferCarousel from "@/components/home/OfferCarousel";
import { getShops } from "@/lib/api";
import { fallbackShops } from "@/lib/mock-data";

export default async function HomePage() {
  let shops = fallbackShops;

  try {
    shops = await getShops();
  } catch {
    shops = fallbackShops;
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Navbar />
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarFilters />

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
