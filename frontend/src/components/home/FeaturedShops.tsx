"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ShopCard from "@/components/shops/shop-card";
import { getFeaturedShops, type ShopSummary } from "@/lib/api";

type FeaturedShopsProps = {
  shops?: ShopSummary[];
};

export default function FeaturedShops({ shops: initialShops }: FeaturedShopsProps) {
  const [shops, setShops] = useState<ShopSummary[]>(initialShops ?? []);
  const [loading, setLoading] = useState(!initialShops || initialShops.length === 0);

  useEffect(() => {
    if (initialShops && initialShops.length > 0) {
      setShops(initialShops);
      setLoading(false);
      return;
    }

    const fetchShops = async () => {
      try {
        const data = await getFeaturedShops();
        setShops(data.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch featured shops:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchShops();
  }, [initialShops]);

  const featured = useMemo(() => shops.slice(0, 6), [shops]);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-[#163625]">Featured shops</h2>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl border border-[#d9e5d5] bg-white p-4 shadow-sm"
            >
              <div className="h-5 w-2/3 rounded bg-[#e7efe2]" />
              <div className="mt-3 h-4 w-full rounded bg-[#eef4ea]" />
              <div className="mt-2 h-4 w-5/6 rounded bg-[#eef4ea]" />
              <div className="mt-4 h-4 w-1/3 rounded bg-[#e7efe2]" />
              <div className="mt-5 flex gap-2">
                <div className="h-6 w-20 rounded-full bg-[#e3efdc]" />
                <div className="h-6 w-24 rounded-full bg-[#e3efdc]" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((shop) => (
            <Link key={shop.id} href={`/shops/${shop.slug}`} className="block">
              <ShopCard shop={shop} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
