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
  const [shops, setShops] = useState<Shop[]>(
    initialShops && initialShops.length > 0 ? initialShops : (fallbackShops as Shop[])
  );

  useEffect(() => {
    if (initialShops && initialShops.length > 0) {
      setShops(initialShops);
      return;
    }

    let cancelled = false;

    getFeaturedShops()
      .then((data) => {
        if (!cancelled && data && data.length > 0) {
          setShops(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch featured shops:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [initialShops]);

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
