"use client";

import { useEffect, useState } from "react";
import ShopCard from "@/components/shops/shop-card";
import Link from "next/link";

type Shop = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  address: string;
  ratingAvg: number;
  reviewCount: number;
  priceLevel: number;
  hasVoucher: boolean;
  freeDelivery: boolean;
  hasDeals: boolean;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function FeaturedShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await fetch(`${API_URL}/api/shops`);
        const data = await res.json();

        setShops(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchShops();
  }, []);

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-bold text-[#163625] mb-4">
        Recommended repair partners near you
      </h2>

      {loading ? (
        <p className="text-[#4c6354]">Loading shops...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop) => (
            <Link
              key={shop.id}
              href={`/shops?q=${encodeURIComponent(shop.name)}`}
              className="block"
            >
            <ShopCard shop={shop} />
            </Link>
))}
        </div>
      )}
    </section>
  );
}