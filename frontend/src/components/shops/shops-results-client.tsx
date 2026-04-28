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

  const [shops, setShops] = useState<Shop[]>(fallbackShops);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      try {
        const data = await getShops({ q, category, sort, take: 24 });
        setShops(data);
      } catch (error) {
        console.error("Failed to load shops:", error);
        const filteredFallback = fallbackShops.filter((shop) => {
          const haystack = [shop.name, shop.description ?? "", shop.address, ...(shop.specialties ?? [])]
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
    <main className="min-h-screen bg-[#f7f8f3]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <h1 className="text-4xl font-bold text-[#123324]">
          {loading ? "Loading..." : `${shops.length} matches found`}
        </h1>

        {q && <p className="mt-2 text-2xl text-[#31483a]">Search: {q}</p>}
        <p className="mt-2 text-sm text-[#516758]">Sorted by {sortLabel}</p>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="w-full rounded-2xl bg-[#eef1e7] p-5 lg:w-64">
            <h2 className="mb-4 text-lg font-semibold text-[#1d3528]">Quick filters</h2>

            <div className="space-y-4 text-[#233b2d] text-sm">
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
                    sort === value ? "bg-[#52b76c] text-white" : "bg-white text-[#234733]"
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
                  className="block rounded-2xl border border-[#d9e5d5] bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#163625]">{shop.name}</h3>
                      <p className="mt-1 text-sm text-[#4c6354]">{shop.description || shop.address}</p>
                      <p className="mt-2 text-sm text-[#2c4637]">
                        ⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="rounded-full bg-[#e8f1e4] px-3 py-1 text-sm font-semibold text-[#234733]">
                        {"$".repeat(Math.max(1, shop.priceLevel))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {shop.hasVoucher && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">Voucher</span>
                    )}
                    {shop.freeDelivery && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">Free delivery</span>
                    )}
                    {shop.hasDeals && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">Deal</span>
                    )}
                    {shop.acceptsDirectOrders && (
                      <span className="rounded-full bg-[#eef5ea] px-3 py-1 text-xs font-medium text-[#215235]">Direct services</span>
                    )}
                  </div>
                </Link>
              ))}

              {!loading && shops.length === 0 && (
                <div className="rounded-2xl bg-white p-8 text-center text-[#476050] shadow-sm">
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
