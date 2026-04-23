"use client";

import { useEffect, useMemo, useState } from "react";
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
        <div className="h-14 w-14 shrink-0 rounded-xl bg-[var(--mint-100)]" />

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

  if (categoryBrowseMode) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

        <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
          {apiFailed ? (
            <p className="mb-5 text-sm text-[var(--muted-foreground)]">
              Showing local fallback results because the backend shop API is not
              responding yet.
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleShops.map((shop) => (
              <ShopResultCard key={shop.id} shop={shop} />
            ))}
          </div>

          {!loading && visibleShops.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)]">
              No shops are currently listed under{" "}
              {categoryLabels[searchState.category] ?? "this category"}.
            </div>
          ) : null}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />

      <section className="mx-auto max-w-7xl px-4 py-5 md:px-6">
        <div className="mb-5">
          <h1 className="text-[2.7rem] font-extrabold leading-none tracking-tight text-[var(--foreground)]">
            {loading ? "Searching..." : `${visibleShops.length} matches found`}
          </h1>

          <p className="mt-2 text-[1.7rem] text-[var(--muted-foreground)]">
            {searchState.q || "Repair results"}
          </p>

          {apiFailed ? (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Showing interactive local fallback results because the backend shop
              API is not responding yet.
            </p>
          ) : null}
        </div>

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="space-y-6 pt-2">
            <div>
              <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Filters
              </h2>

              <div className="space-y-4">
                {sidebarSort.map((item) => {
                  const active = searchState.sort === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => updateParams({ sort: item.value })}
                      className="flex items-center gap-3 text-left text-[1rem] text-[var(--foreground)]"
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
              <div className="mb-3 text-lg font-semibold text-[var(--foreground)]">
                Distance
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted-foreground)]">
                  <span>Nearby only</span>
                  <span>{searchState.maxDistanceKm} km</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={searchState.maxDistanceKm}
                  onChange={(event) =>
                    updateParams({ maxDistanceKm: event.currentTarget.value })
                  }
                  className="w-full accent-[var(--accent-dark)]"
                />
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
                Offers & Promotions
              </h3>

              <div className="space-y-4 text-[var(--foreground)]">
                {promoToggles.map((promo) => {
                  const checked = searchState[promo.key];

                  return (
                    <label
                      key={promo.key}
                      className="flex items-center gap-3 text-[1rem]"
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

          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl bg-[var(--mint-100)] p-2">
              {sortTabs.map((tab) => {
                const active = searchState.sort === tab.value;

                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => updateParams({ sort: tab.value })}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-[var(--accent-dark)] text-white shadow-sm"
                        : "bg-transparent text-[var(--foreground)] hover:bg-[var(--card)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}

              <div className="ml-auto rounded-xl px-3 py-2 text-[var(--muted-foreground)]">
                ≡
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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