"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import SidebarFilters from "@/components/home/SidebarFilters";
import { type Shop, getShops } from "@/lib/api";
import { fallbackShops } from "@/lib/mock-data";
import {
  defaultSearchState,
  filterAndSortShops,
  formatPriceLevel,
  normalizeSearchState,
  toShopQuery,
} from "@/lib/shop-search";

const sortTabs = [
  { label: "Lowest Price", value: "price" },
  { label: "Nearest Distance", value: "distance" },
  { label: "Highest Rating", value: "topRated" },
  { label: "Best Match", value: "relevance" },
] as const;

const sidebarSort = [
  { label: "Top Rated", value: "topRated" },
  { label: "Relevance", value: "relevance" },
  { label: "Distance", value: "distance" },
  { label: "Price", value: "price" },
] as const;

const promoToggles = [
  { label: "Vouchers", key: "voucher" },
  { label: "Free Delivery", key: "freeDelivery" },
  { label: "Deals", key: "deals" },
] as const;

const categoryLabels: Record<string, string> = {
  COURIER_PICKUP: "Courier Pickup",
  IN_SHOP_REPAIR: "In-shop Repair",
  SPARE_PARTS: "Spare Parts",
};

function etaLabel(minutes?: number | null) {
  if (!minutes) return "Next day";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hour`;
  return "Next day";
}

function ShopResultCard({ shop }: { shop: Shop }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="group rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-2.5 sm:p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        {shop.logoUrl ? (
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--mint-100)] border border-[var(--border)]">
            <Image src={shop.logoUrl} alt={shop.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl bg-[var(--mint-100)] border border-[var(--border)] flex items-center justify-center">
            <span className="text-xl font-bold text-[var(--accent-dark)] opacity-50">
              {shop.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[1.15rem] font-bold text-[var(--foreground)]">
                {shop.name}
              </h3>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>⭐ {shop.ratingAvg.toFixed(1)}</span>
                <span>({shop.reviewCount})</span>
                {typeof shop.distanceKm === "number" ? (
                  <span>{shop.distanceKm.toFixed(1)} km away</span>
                ) : null}
                <span>{etaLabel(shop.etaMinutes)}</span>
              </div>
            </div>

            <div className="shrink-0 text-right">
              <div className="text-2xl font-extrabold leading-none text-[var(--accent-dark)]">
                {shop.offerSummary ?? "৳--"}
              </div>
              <div className="mt-1 text-xs font-semibold text-[var(--muted-foreground)]">
                {etaLabel(shop.etaMinutes)}
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
          {formatPriceLevel(shop.priceLevel)}
        </span>
      </div>
    </Link>
  );
}

export default function ShopsResultsClient() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const firstName = useMemo(() => {
    return (
      session?.user?.name?.trim()?.split(" ")[0] ||
      (session?.user as any)?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [session]);

  const searchState = useMemo(
    () =>
      normalizeSearchState({
        q: searchParams.get("q") ?? defaultSearchState.q,
        category: searchParams.get("category") ?? defaultSearchState.category,
        sort: (searchParams.get("sort") as any) ?? defaultSearchState.sort,
        voucher: searchParams.get("voucher") === "true",
        freeDelivery: searchParams.get("freeDelivery") === "true",
        deals: searchParams.get("deals") === "true",
        maxDistanceKm: Number(
          searchParams.get("maxDistanceKm") ?? defaultSearchState.maxDistanceKm
        ),
      }),
    [searchParams]
  );

  const categoryBrowseMode = Boolean(searchState.category && !searchState.q);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remoteShops, setRemoteShops] = useState<Shop[]>([]);
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);

    getShops(toShopQuery(searchState))
      .then((data) => {
        if (cancelled) return;
        setRemoteShops(data);
        setApiFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        setRemoteShops([]);
        setApiFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchState]);

  const visibleShops = useMemo(() => {
    const source = remoteShops.length > 0 ? remoteShops : (fallbackShops as Shop[]);
    return filterAndSortShops(source, searchState);
  }, [remoteShops, searchState]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-foreground">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6">

        {/* HEADER & SORT TABS CONTAINER */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[2.7rem] font-extrabold leading-none tracking-tight">
              {loading
                ? "Searching..."
                : categoryBrowseMode
                  ? `${visibleShops.length} shops`
                  : `${visibleShops.length} matches found`}
            </h1>

            <p className="mt-2 text-[1.7rem] text-[var(--muted-foreground)]">
              {searchState.q ||
                categoryLabels[searchState.category] ||
                "Repair results"}
            </p>
          </div>

          {/* MOBILE FILTER BUTTON */}
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="mb-8 self-start inline-flex items-center gap-2 rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-white shadow-sm lg:hidden"
          >
            <span className="text-lg leading-none">☰</span>
            {filtersOpen ? "Close filters" : "Filters & sort"}
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {sortTabs.map((tab) => {
              const active = searchState.sort === tab.value;

              return (
                <button
                  key={tab.value}
                  onClick={() => updateParams({ sort: tab.value })}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${active
                    ? "bg-[var(--accent-dark)] text-white shadow-sm"
                    : "bg-[var(--card)] hover:bg-[var(--mint-50)]"
                    }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* LAYOUT */}
        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">

          {/* DESKTOP SIDEBAR */}
          <aside className="hidden lg:block">
            <SidebarFilters targetPath="/shops" />
          </aside>

          {/* RESULTS */}
          <div>
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              {visibleShops.map((shop) => (
                <ShopResultCard key={shop.id} shop={shop} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MOBILE DRAWER */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden">
          <button
            onClick={() => setFiltersOpen(false)}
            className="absolute inset-0 bg-black/25 backdrop-blur-sm transition-opacity"
            aria-label="Close filters"
          />

          <aside className="absolute left-0 top-0 h-full w-[86vw] max-w-[340px] overflow-y-auto bg-[var(--background)] p-6 shadow-2xl">
            <SidebarFilters targetPath="/shops" />
          </aside>
        </div>
      )}
    </main>
  );
}