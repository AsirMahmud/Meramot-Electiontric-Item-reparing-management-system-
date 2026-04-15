import type { ApiShop } from "@/lib/api";
import ShopCard from "@/components/shops/shop-card";

type FeaturedShopsProps = {
  shops: ApiShop[];
};

export default function FeaturedShops({ shops }: FeaturedShopsProps) {
  const featured = [...shops]
    .sort((a, b) => b.ratingAvg - a.ratingAvg)
    .slice(0, 5);

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-bold text-[#163625]">Featured shops</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((shop) => (
          <div key={shop.id}>
            <ShopCard shop={shop} href={`/shops/${shop.slug}`} compact={false} />
          </div>
        ))}
      </div>
    </section>
  );
}