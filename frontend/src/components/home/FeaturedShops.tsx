<<<<<<< HEAD
import type { Shop } from "@/lib/api";
import ShopCard from "@/components/shops/shop-card";

type FeaturedShopsProps = {
  shops: Shop[];
=======
import { useEffect, useState } from "react";
import { type Shop, getFeaturedShops } from "@/lib/api";
import ShopCard from "@/components/shops/shop-card";

type FeaturedShopsProps = {
  shops?: Shop[];
>>>>>>> origin/main
};


export default function FeaturedShops({ shops: initialShops }: FeaturedShopsProps) {
  const [shops, setShops] = useState<Shop[] | undefined>(initialShops);
  const [loading, setLoading] = useState(!initialShops);

  useEffect(() => {
    if (!initialShops) {
      getFeaturedShops()
        .then((data) => {
          setShops(data);
        })
        .catch((err) => {
          console.error("Failed to fetch featured shops:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [initialShops]);

  if (loading) {
    return (
      <div className="mt-10 animate-pulse">
        <div className="mb-4 h-8 w-48 rounded bg-gray-200"></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl bg-gray-100"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!shops || shops.length === 0) {
    return null;
  }

  const featured = shops.slice(0, 6);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-[var(--foreground)]">
        Featured shops
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((shop) => (
          <div key={shop.id}>
            <ShopCard shop={shop} href={`/shops/${shop.slug}`} compact={false} />
          </div>
        ))}
      </div>
    </section>
  );
<<<<<<< HEAD
}
=======
}

>>>>>>> origin/main
