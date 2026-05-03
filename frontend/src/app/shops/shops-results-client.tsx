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
  { label: "Featured", key: "featured" },
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
      className="group flex flex-col rounded-[1.6rem] border border-[var(--border)] bg-[var(--card)] p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:p-4"
    >
      {/* Top row: logo + name/rating */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-lg font-bold text-[var(--accent-dark)] md:h-14 md:w-14 md:text-2xl">
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-xl object-cover" />
          ) : (
            shop.name.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[0.95rem] font-bold leading-tight text-[var(--foreground)] md:text-[1.15rem]">
            {shop.name}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-[var(--muted-foreground)] md:text-xs md:gap-x-2">
            <span>⭐ {(shop.ratingAvg ?? 0).toFixed(1)}</span>
            <span className="opacity-60">·</span>
            <span>{shop.reviewCount} reviews</span>
            {typeof shop.distanceKm === "number" ? (
              <>
                <span className="opacity-60">·</span>
                <span>{shop.distanceKm.toFixed(1)} km</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Price + Labor + ETA row */}
      <div className="mt-2.5 grid grid-cols-3 items-center rounded-xl bg-[var(--mint-50)] px-3 py-2 md:mt-3">
        {/* Left: Inspection / Starting From */}
        <div>
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase text-[var(--muted-foreground)] md:text-[9px]">
            {shop.offerSummary ? (shop.offerSummary.toLowerCase().includes("starting from") ? "Starting from" : "Inspection fee") : "From"}
          </span>
          <div className="text-[1.05rem] font-extrabold leading-tight tracking-tight text-[var(--accent-dark)] md:text-[1.1rem]">
            {shop.offerSummary ? shop.offerSummary.replace(/Starting from |Inspection /i, "") : "৳--"}
          </div>
        </div>

        {/* Middle: Base Labor Fee */}
        <div className="text-center border-x border-[var(--border)]/50 px-3 md:px-6">
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase text-[var(--muted-foreground)] md:text-[9px]">Labor Fee</span>
          <div className="text-[1.05rem] font-extrabold leading-tight tracking-tight text-[var(--accent-dark)] md:text-[1.1rem]">
            {shop.baseLaborFee ? `৳${shop.baseLaborFee.toLocaleString("en-BD")}` : "৳--"}
          </div>
        </div>

        {/* Right: ETA */}
        <div className="text-right">
          <span className="whitespace-nowrap text-[9px] font-semibold uppercase text-[var(--muted-foreground)] md:text-[9px]">ETA</span>
          <div className="text-sm font-bold text-[var(--foreground)] md:text-base">{etaLabel(shop.etaMinutes)}</div>
        </div>
      </div>

      {/* Description */}
      <p className="mt-2 line-clamp-1 text-[11px] text-[var(--muted-foreground)] md:mt-2.5 md:text-xs">
        {shop.description || shop.address}
      </p>

      {/* Badges */}
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-medium text-[var(--accent-dark)] md:mt-2.5 md:gap-2 md:text-[11px]">
        {shop.hasVoucher ? (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 md:px-2.5 md:py-1">
            Voucher
          </span>
        ) : null}
        {shop.freeDelivery ? (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 md:px-2.5 md:py-1">
            Free delivery
          </span>
        ) : null}
        {shop.hasDeals ? (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 md:px-2.5 md:py-1">
            Deal
          </span>
        ) : null}
        <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 md:px-2.5 md:py-1">
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
  const [localFeatured, setLocalFeatured] = useState(urlFeatured);

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
  useEffect(() => { setLocalFeatured(urlFeatured); }, [urlFeatured]);

  const searchState = useMemo(
    () =>
      normalizeSearchState({
        q: searchParams.get("q") ?? defaultSearchState.q,
        category: searchParams.get("category") ?? defaultSearchState.category,
        sort: localSort as any,
        voucher: localVoucher,
        freeDelivery: localFreeDelivery,
        deals: localDeals,
        featured: localFeatured,
        maxDistanceKm: localDistance,
        lat: selectedLocation?.lat,
        lng: selectedLocation?.lng,
      }),
    [searchParams, selectedLocation, localSort, localDistance, localVoucher, localFreeDelivery, localDeals, localFeatured]
  );

  const categoryBrowseMode = Boolean(searchState.category && !searchState.q);

  const [remoteShops, setRemoteShops] = useState<Shop[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiFailed, setApiFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth < 768 ? 10 : 12);
    };
    handleResize(); // set initially
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const apiQueryKey = JSON.stringify({
    q: searchState.q,
    category: searchState.category,
    sort: searchState.sort,
    featured: searchState.featured,
    maxDistanceKm: searchState.maxDistanceKm,
    lat: searchState.lat,
    lng: searchState.lng,
  });

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
  }, [apiQueryKey]); // Only re-fetch when backend-relevant params change

  const visibleShops = useMemo(() => {
    const source = remoteShops.length > 0 ? remoteShops : (fallbackShops as Shop[]);
    return filterAndSortShops(source, searchState);
  }, [remoteShops, searchState]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchState, visibleShops.length]);

  const totalPages = Math.ceil(visibleShops.length / itemsPerPage);
  const paginatedShops = visibleShops.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
    if ("featured" in updates) setLocalFeatured(updates.featured === "true");

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

      <section className="mx-auto max-w-7xl px-5 py-4 md:px-10 md:py-6">
        <div className="mb-4 md:mb-5">
          <h1 className="text-xl font-extrabold leading-tight tracking-tight text-[var(--foreground)] md:text-[2.7rem] md:leading-none flex items-center gap-2">
            {localFeatured ? (
              <>Featured Shops <span className="text-[var(--muted-foreground)] text-base md:text-3xl font-medium">({visibleShops.length})</span></>
            ) : (
              (!searchState.q && !searchState.category) ? `All Shops (${visibleShops.length})` : `${visibleShops.length} matches found`
            )}
          </h1>

          <p className="mt-1 text-sm text-[var(--muted-foreground)] md:mt-2 md:text-[1.7rem]">
            {localFeatured ? "Discover the highest-rated and most reliable repair experts in your area." : (searchState.q || (searchState.category ? categoryLabels[searchState.category] : "Explore reliable repair experts in your area."))}
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
              <div className="mb-2 flex items-center justify-between md:mb-3">
                <span className="text-sm font-semibold text-[var(--foreground)] md:text-lg">
                  Distance
                </span>
                {/* Toggle to enable/disable distance filtering */}
                <button
                  type="button"
                  aria-label="Toggle distance filter"
                  onClick={() => {
                    if (localDistance === 9999) {
                      // Re-enable with default 25km
                      setLocalDistance(25);
                      updateParams({ maxDistanceKm: "25" });
                    } else {
                      // Disable — show all shops
                      setLocalDistance(9999);
                      updateParams({ maxDistanceKm: "9999" });
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    localDistance !== 9999
                      ? "bg-[var(--accent-dark)]"
                      : "bg-[var(--mint-200)]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                      localDistance !== 9999 ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className={`rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm md:p-4 transition-opacity ${localDistance === 9999 ? "opacity-40 pointer-events-none" : ""}`}>
                <div className="mb-2 flex items-center justify-between text-xs text-[var(--muted-foreground)] md:text-sm">
                  <span>Nearby only</span>
                  <span>{localDistance === 9999 ? "Anywhere" : `${localDistance} km`}</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={localDistance === 9999 ? 25 : localDistance}
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
                  const isForcedFeatured = promo.key === "featured" && forceFeatured;
                  const checked = isForcedFeatured ? true : searchState[promo.key];

                  return (
                      <label
                        key={promo.key}
                        className="flex items-center gap-3 text-sm md:text-[1rem] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            if (isForcedFeatured && !event.currentTarget.checked) {
                              router.push("/shops");
                              return;
                            }
                            updateParams({
                              [promo.key]: event.currentTarget.checked
                                ? "true"
                                : null,
                            });
                          }}
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
              {paginatedShops.map((shop) => (
                <ShopResultCard key={shop.id} shop={shop} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 md:mt-8 flex flex-wrap justify-center items-center gap-2 pb-8">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center justify-center rounded-xl border border-[var(--border)] p-2.5 text-[var(--foreground)] hover:bg-[var(--mint-50)] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentPage(i + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold text-sm transition active:scale-95 ${
                      currentPage === i + 1 
                        ? "bg-[var(--accent-dark)] text-white shadow-sm" 
                        : "border border-[var(--border)] hover:bg-[var(--mint-50)] text-[var(--foreground)]"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center justify-center rounded-xl border border-[var(--border)] p-2.5 text-[var(--foreground)] hover:bg-[var(--mint-50)] disabled:opacity-30 disabled:hover:bg-transparent transition active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            )}

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