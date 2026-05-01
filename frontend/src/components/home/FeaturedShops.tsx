"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Shop, getFeaturedShops } from "@/lib/api";
import ShopCard from "@/components/shops/shop-card";
import { fallbackShops } from "@/lib/mock-data";

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
        <div className="mb-4 h-8 w-48 rounded bg-[var(--mint-100)] dark:bg-[var(--mint-300)] opacity-50" />
        <div className="grid gap-2 grid-cols-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-[120px] md:h-[280px] rounded-xl md:rounded-xl bg-[var(--mint-100)] dark:bg-[var(--card)] opacity-50 border border-[var(--border)]" />
          ))}
        </div>
      </section>
    );
  }

  const displayShops = shops && shops.length > 0 ? shops : (fallbackShops as Shop[]);

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-bold text-[var(--foreground)] md:mb-4 md:text-2xl">
        Featured shops
      </h2>

      <div className="grid gap-2 grid-cols-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayShops.slice(0, 6).map((shop) => (
          <div key={shop.id} className="h-full">
            {/* Desktop Card */}
            <div className="hidden h-full md:block">
              <ShopCard shop={shop} href={`/shops/${shop.slug}`} compact={false} />
            </div>
            
            {/* Mobile Compact Tile */}
            <Link
              href={`/shops/${shop.slug}`}
              className="flex h-[120px] flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm transition active:bg-[var(--mint-100)] md:hidden"
            >
              <div className="min-w-0">
                <h3 className="line-clamp-2 text-[11px] font-bold leading-tight text-[var(--foreground)]">
                  {shop.name}
                </h3>
                <p className="mt-1 text-[10px] font-medium text-[var(--accent-dark)]">
                  ★ {(shop.ratingAvg ?? 0).toFixed(1)}
                </p>
                {typeof shop.distanceKm === "number" && (
                  <p className="mt-0.5 text-[9px] text-[var(--muted-foreground)]">
                    {shop.distanceKm.toFixed(1)} km
                  </p>
                )}
              </div>
              
              {(shop.hasVoucher || shop.freeDelivery) && (
                <div className="flex flex-wrap gap-0.5 pt-1">
                  {shop.hasVoucher && (
                    <span className="rounded bg-[var(--mint-100)] px-1 py-px text-[8px] font-medium text-[var(--accent-dark)]">
                      Voucher
                    </span>
                  )}
                  {shop.freeDelivery && (
                    <span className="rounded bg-[var(--mint-100)] px-1 py-px text-[8px] font-medium text-[var(--accent-dark)]">
                      Free
                    </span>
                  )}
                </div>
              )}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
