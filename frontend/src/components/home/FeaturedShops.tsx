"use client";

import { useEffect, useState } from "react";
import { type Shop, getFeaturedShops } from "@/lib/api";
import ShopCard from "@/components/shops/shop-card";

type FeaturedShopsProps = {
  shops?: Shop[];
};

export default function FeaturedShops({ shops: initialShops }: FeaturedShopsProps) {
  const [shops, setShops] = useState<Shop[] | undefined>(initialShops);
  const [loading, setLoading] = useState(!initialShops);

  useEffect(() => {
    if (initialShops) {
      setShops(initialShops);
      setLoading(false);
      return;
    }

    let cancelled = false;

    getFeaturedShops()
      .then((data) => {
        if (!cancelled) setShops(data);
      })
      .catch((err) => {
        console.error("Failed to fetch featured shops:", err);
        if (!cancelled) setShops([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialShops]);

  if (loading) {
    return (
      <section className="mt-10 animate-pulse">
        <div className="mb-4 h-8 w-48 rounded bg-gray-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    );
  }

  if (!shops || shops.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-[var(--foreground)]">
        Featured shops
      </h2>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.slice(0, 6).map((shop) => (
          <ShopCard key={shop.id} shop={shop} href={`/shops/${shop.slug}`} compact={false} />
        ))}
      </div>
    </section>
  );
}
