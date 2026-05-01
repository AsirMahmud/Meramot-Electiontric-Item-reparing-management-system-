"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import { type Shop, getShops } from "@/lib/api";
import { fallbackShops } from "@/lib/mock-data";
import {
  defaultSearchState,
  filterAndSortShops,
  formatPriceLevel,
  normalizeSearchState,
  toShopQuery,
} from "@/lib/shop-search";
import { useSelectedLocation } from "@/components/location/useSelectedLocation";

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
      className="group rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-2xl font-bold text-[var(--accent-dark)]">
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-xl object-cover" />
          ) : (
            shop.name.charAt(0).toUpperCase()
          )}
        </div>

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

function ShopsResultsClientInner({ forceFeatured }: { forceFeatured?: boolean }) {
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

  const { selectedLocation } = useSelectedLocation(!!session?.user);

  // Local state for immediate visual feedback (avoids Suspense remount issues)
  const urlSort = (searchParams.get("sort") as any) || defaultSearchState.sort;
  const [localSort, setLocalSort] = useState<string>(urlSort);

  const urlDistance = forceFeatured ? 9999 : Number(searchParams.get("maxDistanceKm") ?? defaultSearchState.maxDistanceKm);
  const [localDistance, setLocalDistance] = useState<number>(urlDistance);

  const urlVoucher = searchParams.get("voucher") === "true";
  const urlFreeDelivery = searchParams.get("freeDelivery") === "true";
  const urlDeals = searchParams.get("deals") === "true";
  const urlFeatured = forceFeatured || searchParams.get("featured") === "true";
  const [localVoucher, setLocalVoucher] = useState(urlVoucher);
  const [localFreeDelivery, setLocalFreeDelivery] = useState(urlFreeDelivery);
  const [localDeals, setLocalDeals] = useState(urlDeals);

  // Keep local state in sync if URL changes externally (e.g. back button)
  useEffect(() => {
    setLocalSort(urlSort);
  }, [urlSort]);
  useEffect(() => {
    setLocalDistance(urlDistance);
  }, [urlDistance]);
  useEffect(() => { setLocalVoucher(urlVoucher); }, [urlVoucher]);
  useEffect(() => { setLocalFreeDelivery(urlFreeDelivery); }, [urlFreeDelivery]);
  useEffect(() => { setLocalDeals(urlDeals); }, [urlDeals]);

  const searchState = useMemo(
    () =>
      normalizeSearchState({
        q: searchParams.get("q") ?? defaultSearchState.q,
        category: searchParams.get("category") ?? defaultSearchState.category,
        sort: localSort as any,
        voucher: localVoucher,
        freeDelivery: localFreeDelivery,
        deals: localDeals,
        featured: urlFeatured,
        maxDistanceKm: localDistance,
        lat: selectedLocation?.lat,
        lng: selectedLocation?.lng,
      }),
    [searchParams, selectedLocation, localSort, localDistance, localVoucher, localFreeDelivery, localDeals, urlFeatured]
  );

  const categoryBrowseMode = Boolean(searchState.category && !searchState.q);

  const [remoteShops, setRemoteShops] = useState<Shop[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    // Update local state immediately for instant visual feedback
    if (updates.sort) {
      setLocalSort(updates.sort);
    }
    if (updates.maxDistanceKm) {
      setLocalDistance(Number(updates.maxDistanceKm));
    }
    if ("voucher" in updates) setLocalVoucher(updates.voucher === "true");
    if ("freeDelivery" in updates) setLocalFreeDelivery(updates.freeDelivery === "true");
    if ("deals" in updates) setLocalDeals(updates.deals === "true");

    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };


  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

      <section className="mx-auto max-w-7xl px-3 py-4 md:px-6 md:py-5">
        <div className="mb-4 md:mb-5">
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] md:text-[2.7rem] md:leading-none flex items-center gap-2">
            {forceFeatured ? (
              <>Featured Shops {!loading && <span className="text-[var(--muted-foreground)] text-xl md:text-3xl font-medium">({visibleShops.length})</span>}</>
            ) : (
              loading ? "Searching..." : `${visibleShops.length} matches found`
            )}
          </h1>

          <p className="mt-1 text-lg text-[var(--muted-foreground)] md:mt-2 md:text-[1.7rem]">
            {forceFeatured ? "Discover the highest-rated and most reliable repair experts in your area." : (searchState.q || (searchState.category ? categoryLabels[searchState.category] : "Repair results"))}
          </p>

          {apiFailed ? (
            <p className="mt-2 text-xs text-[var(--muted-foreground)] md:text-sm">
              Showing interactive local fallback results because the backend shop
              API is not responding yet.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 md:gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <div className="lg:hidden">
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex w-full items-center justify-between rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] px-4 py-3.5 text-sm font-bold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--mint-50)]"
            >
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5 text-[var(--accent-dark)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                <span>Filters & Sorting</span>
              </div>
              <svg className={`h-5 w-5 text-[var(--muted-foreground)] transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>

          {/* Sidebar */}
          <aside className={`space-y-6 pt-2 ${filtersOpen ? "block" : "hidden lg:block"}`}>
            <div>
              <h2 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:mb-4 md:text-lg">
                Filters & Sorting
              </h2>

              <div className="space-y-2 md:space-y-4">
                {sidebarSort.map((item) => {
                  const active = searchState.sort === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateParams({ sort: item.value })}
                      className="flex items-center gap-3 text-left text-sm text-[var(--foreground)] md:text-[1rem]"
                    >
                      <span
                        className={`h-4 w-4 rounded-full ${
                          active
                            ? "bg-[var(--accent-dark)]"
                            : "bg-[var(--mint-200)]"
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-[var(--foreground)] md:mb-3 md:text-lg">
                Distance
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm md:p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted-foreground)] md:text-sm">
                  <span>Nearby only</span>
                  <span>{localDistance === 9999 ? "Anywhere" : `${localDistance} km`}</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={localDistance}
                  onChange={(event) => {
                    setLocalDistance(Number(event.currentTarget.value));
                  }}
                  onPointerUp={(event) => {
                    updateParams({ maxDistanceKm: (event.currentTarget as HTMLInputElement).value });
                  }}
                  className="w-full accent-[var(--accent-dark)]"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-[var(--foreground)] md:mb-4 md:text-lg">
                Offers & Promotions
              </h3>

              <div className="space-y-2 text-[var(--foreground)] md:space-y-4">
                {promoToggles.map((promo) => {
                  const checked = searchState[promo.key];

                  return (
                    <label
                      key={promo.key}
                      className="flex items-center gap-3 text-sm md:text-[1rem]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) =>
                          updateParams({
                            [promo.key]: event.currentTarget.checked
                              ? "true"
                              : null,
                          })
                        }
                        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent-dark)]"
                      />
                      <span>{promo.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide rounded-xl bg-[var(--mint-100)] p-1.5 md:mb-4 md:gap-2 md:rounded-2xl md:p-2">
              {sortTabs.map((tab) => {
                const active = searchState.sort === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateParams({ sort: tab.value })}
                    className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-semibold transition md:rounded-xl md:px-4 md:py-2 md:text-sm ${
                      active
                        ? "bg-[var(--accent-dark)] text-[var(--accent-foreground)] shadow-sm"
                        : "bg-transparent text-[var(--foreground)] hover:bg-[var(--card)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleShops.map((shop) => (
                <ShopResultCard key={shop.id} shop={shop} />
              ))}
            </div>

            {!loading && visibleShops.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]">
                No matching shops found for this search. Try increasing the
                distance or removing one promotion filter.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

import { Suspense } from "react";

export default function ShopsResultsClient({ forceFeatured }: { forceFeatured?: boolean }) {
  return (
    <Suspense fallback={<div>Loading shops...</div>}>
      <ShopsResultsClientInner forceFeatured={forceFeatured} />
    </Suspense>
  );
}