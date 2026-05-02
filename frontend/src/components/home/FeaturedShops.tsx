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

      {/* Desktop Grid — 2 cols on md, 3 on lg */}
      <div className="hidden md:grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {displayShops.slice(0, 6).map((shop) => (
          <div key={shop.id} className="h-full">
            <ShopCard shop={shop} href={`/shops/${shop.slug}`} compact={false} />
          </div>
        ))}
      </div>

      {/* Mobile Grid — 3 cols, aspect-square compact tiles */}
      <div className="grid grid-cols-3 gap-2 md:hidden">
        {displayShops.slice(0, 6).map((shop) => (
          <Link
            key={shop.id}
            href={`/shops/${shop.slug}`}
            className="relative flex aspect-square flex-col justify-between overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[var(--card)] p-2 shadow-sm transition active:scale-95 active:bg-[var(--mint-50)]"
          >
            {/* Top Row: Logo & Rating */}
            <div className="flex items-start justify-between gap-1">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-[var(--mint-100)] text-[13px] font-bold text-[var(--accent-dark)]">
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-[0.6rem] object-cover" />
                ) : (
                  shop.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex shrink-0 items-center rounded-full bg-[var(--mint-50)] px-1 py-0.5 text-[8.5px] font-bold text-[var(--accent-dark)]">
                ★ {(shop.ratingAvg ?? 0).toFixed(1)}
              </div>
            </div>

            {/* Title */}
            <div className="mt-1 min-w-0">
              <h3 className="line-clamp-2 text-[10.5px] font-extrabold leading-[1.1] tracking-tight text-[var(--foreground)]">
                {shop.name}
              </h3>
            </div>

            {/* Bottom: Price & Badges */}
            <div className="mt-auto pt-1 flex items-end justify-between gap-1">
              {shop.offerSummary ? (
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-bold uppercase text-[var(--muted-foreground)] leading-none truncate">
                    {shop.offerSummary.toLowerCase().includes("starting from") ? "Starting from" : "Inspection fee"}
                  </span>
                  <div className="text-[13px] font-black tracking-tight text-[var(--accent-dark)] leading-none mt-1 truncate">
                    {shop.offerSummary.replace(/Starting from |Inspection /i, "")}
                  </div>
                </div>
              ) : <div />}
              
              {(shop.hasVoucher || shop.freeDelivery) && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {shop.hasVoucher && (
                    <span className="rounded bg-[var(--accent-dark)] px-1.5 py-[2.5px] text-[6px] font-bold uppercase tracking-widest text-[var(--accent-foreground)] leading-none">
                      VOUCHER
                    </span>
                  )}
                  {shop.freeDelivery && (
                    <span className="rounded bg-[var(--mint-100)] px-1.5 py-[2.5px] text-[6px] font-bold uppercase tracking-widest text-[var(--accent-dark)] leading-none">
                      FREE DELIVERY
                    </span>
                  )}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {displayShops.length > 6 && (
        <div className="mt-6 flex justify-center md:mt-8">
          <Link
            href="/featured-shops"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[var(--accent-dark)] bg-transparent px-6 py-2.5 text-sm font-bold text-[var(--accent-dark)] transition-colors hover:bg-[var(--mint-50)] md:px-8 md:py-3 md:text-base"
          >
            Explore More Featured Shops
            <svg className="h-4 w-4 md:h-5 md:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      )}
    </section>
  );
}
