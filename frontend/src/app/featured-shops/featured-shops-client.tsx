"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { type Shop, getShops } from "@/lib/api";
import Link from "next/link";
import { formatPriceLevel } from "@/lib/shop-search";

function etaLabel(minutes?: number | null) {
  if (!minutes) return "Next day";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hour`;
  return "Next day";
}

function FeaturedShopCard({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="group rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-[var(--mint-100)]" />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[1.15rem] font-bold text-[var(--foreground)]">
                {shop.name}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>⭐ {(shop.ratingAvg ?? 0).toFixed(1)}</span>
                <span>({shop.reviewCount})</span>
                {typeof shop.distanceKm === "number" ? (
                  <span>{shop.distanceKm.toFixed(1)} km away</span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 text-right flex flex-col items-end">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                {shop.offerSummary ? (shop.offerSummary.toLowerCase().includes("starting from") ? "Starting from" : "Inspection fee") : "From"}
              </span>
              <div className="text-[1.25rem] font-extrabold leading-none text-[var(--accent-dark)] mt-0.5">
                {shop.offerSummary ? shop.offerSummary.replace(/Starting from |Inspection /i, "") : "৳--"}
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[var(--muted-foreground)]">
                ETA: {etaLabel(shop.etaMinutes)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 line-clamp-1 text-xs text-[var(--muted-foreground)]">
        {shop.description || shop.address}
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--accent-dark)]">
        {shop.hasVoucher ? (
          <span className="rounded-full bg-[var(--mint-50)] px-2.5 py-1">
            Voucher
          </span>
        ) : null}
        {shop.freeDelivery ? (
          <span className="rounded-full bg-[var(--mint-50)] px-2.5 py-1">
            Free delivery
          </span>
        ) : null}
        {shop.hasDeals ? (
          <span className="rounded-full bg-[var(--mint-50)] px-2.5 py-1">
            Deal
          </span>
        ) : null}
        <span className="rounded-full bg-[var(--mint-50)] px-2.5 py-1">
          {formatPriceLevel(shop.priceLevel ?? 1)}
        </span>
      </div>
    </Link>
  );
}

export default function FeaturedShopsClient() {
  const { data: session } = useSession();
  const [remoteShops, setRemoteShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  const firstName = session?.user?.name?.trim()?.split(" ")[0] || (session?.user as any)?.username?.trim()?.split(" ")[0] || "User";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getShops({ featured: true, take: 100 })
      .then((data) => {
        if (cancelled) return;
        setRemoteShops(data);
      })
      .catch((err) => {
        console.error("Failed to load featured shops:", err);
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] md:text-5xl">
            Featured Shops
          </h1>
          <p className="mt-3 text-sm text-[var(--muted-foreground)] md:text-lg">
            Discover the highest-rated and most reliable repair experts in your area.
          </p>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-lg font-medium animate-pulse text-[var(--muted-foreground)]">Loading featured shops...</div>
          </div>
        ) : remoteShops.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-12 text-center text-[var(--muted-foreground)]">
            No featured shops available at the moment.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {remoteShops.map((shop) => (
              <FeaturedShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
