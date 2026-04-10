"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Navbar from "@/components/home/navbar";

type Shop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  city?: string | null;
  area?: string | null;
  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;
  isFeatured: boolean;
  hasVoucher: boolean;
  freeDelivery: boolean;
  hasDeals: boolean;
  categories: string[];
  specialties: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ShopsResultsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const sort = searchParams.get("sort") ?? "topRated";

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);

      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);

      const res = await fetch(`${API_URL}/api/shops?${params.toString()}`);
      const data = await res.json();

      const normalized = Array.isArray(data) ? data : [];

      const filtered = normalized.filter((shop: Shop) => {
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

      setShops(filtered);
      setLoading(false);
    };

    fetchShops();
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

        {q && (
          <p className="mt-2 text-2xl text-[#31483a]">{q}</p>
        )}

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <aside className="w-full rounded-2xl bg-[#eef1e7] p-5 lg:w-64">
            <h2 className="mb-4 text-lg font-semibold text-[#1d3528]">Filters</h2>

            <div className="space-y-4 text-[#233b2d]">
              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Top Rated</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Relevance</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Distance</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Price</span>
              </label>
            </div>

            <h3 className="mt-8 mb-4 text-lg font-semibold text-[#1d3528]">
              Offers & Promotions
            </h3>

            <div className="space-y-4 text-[#233b2d]">
              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Vouchers</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Free Delivery</span>
              </label>

              <label className="flex items-center gap-3">
                <input type="checkbox" />
                <span>Deals</span>
              </label>
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setSort("price")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sort === "price"
                    ? "bg-[#52b76c] text-white"
                    : "bg-white text-[#234733]"
                }`}
              >
                Lowest Price
              </button>

              <button
                onClick={() => setSort("distance")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sort === "distance"
                    ? "bg-[#52b76c] text-white"
                    : "bg-white text-[#234733]"
                }`}
              >
                Nearest Distance
              </button>

              <button
                onClick={() => setSort("topRated")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  sort === "topRated"
                    ? "bg-[#52b76c] text-white"
                    : "bg-white text-[#234733]"
                }`}
              >
                Highest Rating
              </button>
            </div>

            <div className="space-y-4">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="rounded-2xl border border-[#d9e5d5] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#163625]">{shop.name}</h3>
                      <p className="mt-1 text-sm text-[#4c6354]">
                        {shop.description || shop.address}
                      </p>
                      <p className="mt-2 text-sm text-[#2c4637]">
                        ⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="rounded-full bg-[#e8f1e4] px-3 py-1 text-sm font-semibold text-[#234733]">
                        {"$".repeat(shop.priceLevel)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {shop.hasVoucher && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">
                        Voucher
                      </span>
                    )}
                    {shop.freeDelivery && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">
                        Free delivery
                      </span>
                    )}
                    {shop.hasDeals && (
                      <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">
                        Deal
                      </span>
                    )}
                  </div>
                </div>
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