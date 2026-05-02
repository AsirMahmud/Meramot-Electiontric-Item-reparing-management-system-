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

      {/* Mobile Grid — 2 cols, natural height tiles */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {displayShops.slice(0, 6).map((shop) => (
          <Link
            key={shop.id}
            href={`/shops/${shop.slug}`}
            className="relative flex flex-col justify-between overflow-hidden rounded-[1rem] border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition active:scale-95 active:bg-[var(--mint-50)] min-h-[140px]"
          >
            {/* Top Row: Logo & Rating */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-[var(--mint-100)] text-sm font-bold text-[var(--accent-dark)]">
                {shop.logoUrl ? (
                  <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-[0.75rem] object-cover" />
                ) : (
                  shop.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex shrink-0 items-center rounded-full bg-[var(--mint-50)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-dark)]">
                ★ {(shop.ratingAvg ?? 0).toFixed(1)}
              </div>
            </div>

            {/* Title */}
            <div className="mt-2 min-w-0">
              <h3 className="line-clamp-2 text-xs font-bold leading-tight tracking-tight text-[var(--foreground)]">
                {shop.name}
              </h3>
            </div>

            {/* Bottom: Price & Badges */}
            <div className="mt-auto pt-2 flex items-end justify-between gap-1">
              {shop.offerSummary ? (
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold uppercase text-[var(--muted-foreground)] leading-none truncate">
                    Starting from
                  </span>
                  <div className="text-sm font-black tracking-tight text-[var(--accent-dark)] leading-none mt-1.5 truncate">
                    {shop.offerSummary.replace(/Starting from |Inspection /i, "")}
                  </div>
                </div>
              ) : <div />}
              
              <div className="flex flex-col items-end gap-1 shrink-0">
                {shop.hasVoucher && (
                  <span className="rounded bg-[var(--accent-dark)] px-1.5 py-[3px] text-[7px] font-bold uppercase tracking-widest text-[var(--accent-foreground)] leading-none">
                    VOUCHER
                  </span>
                )}
                {shop.freeDelivery && (
                  <span className="rounded bg-[var(--mint-100)] px-1.5 py-[3px] text-[7px] font-bold uppercase tracking-widest text-[var(--accent-dark)] leading-none">
                    FREE
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

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
    </section>
  );
}
