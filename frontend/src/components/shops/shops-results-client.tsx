"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/home/Navbar";
import { getShops, type Shop } from "@/lib/api";
import { fallbackShops } from "@/lib/mock-data";

export default function ShopsResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "topRated";

  const [shops, setShops] = useState<Shop[]>(fallbackShops as Shop[]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      try {
        const data = await getShops({ q, category, sort, take: 24 });
        setShops(data);
      } catch (error) {
        console.error("Failed to load shops:", error);
        const filteredFallback = (fallbackShops as Shop[]).filter((shop) => {
          const haystack = [
            shop.name,
            shop.description ?? "",
            shop.address,
            ...(shop.specialties ?? []),
          ]
            .join(" ")
            .toLowerCase();

          return q ? haystack.includes(q.toLowerCase()) : true;
        });
        setShops(filteredFallback);
      } finally {
        setLoading(false);
      }
    };

    void fetchShops();
  }, [q, category, sort]);

  const sortLabel = useMemo(() => {
    if (sort === "price") return "Lowest Price";
    if (sort === "distance") return "Nearest Distance";
    return "Highest Rating";
  }, [sort]);

  const setSort = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    router.push(`/shops?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <h1 className="text-4xl font-bold text-[var(--foreground)]">
          {loading ? "Loading..." : `${shops.length} matches found`}
        </h1>

        {q && (
          <p className="mt-2 text-2xl text-[var(--muted-foreground)]">
            Search: {q}
          </p>
        )}

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Sorted by {sortLabel}
        </p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 lg:w-64">
            <h2 className="mb-4 text-lg font-semibold text-[var(--foreground)]">
              Quick filters
            </h2>

            <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
              <p>{category ? `Category: ${category}` : "All categories"}</p>
              <p>{q ? `Keyword: ${q}` : "No keyword filter"}</p>
              <p>Open a shop to see menu-style services and direct order options.</p>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex flex-wrap gap-3">
              {[
                ["price", "Lowest Price"],
                ["distance", "Nearest Distance"],
                ["topRated", "Highest Rating"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSort(value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    sort === value
                      ? "bg-[var(--accent-dark)] text-white"
                      : "bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {shops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/shops/${shop.slug}`}
                  className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--foreground)]">
                        {shop.name}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {shop.description || shop.address}
                      </p>
                      <p className="mt-2 text-sm text-[var(--foreground)]">
                        ⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
                        {"$".repeat(Math.max(1, shop.priceLevel))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {shop.hasVoucher && (
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                        Voucher
                      </span>
                    )}
                    {shop.freeDelivery && (
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                        Free delivery
                      </span>
                    )}
                    {shop.hasDeals && (
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                        Deal
                      </span>
                    )}
                    {shop.acceptsDirectOrders && (
                      <span className="rounded-full bg-[var(--mint-50)] px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                        Direct services
                      </span>
                    )}
                  </div>
                </Link>
              ))}

              {!loading && shops.length === 0 && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)] shadow-sm">
                  No matching shops found.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}