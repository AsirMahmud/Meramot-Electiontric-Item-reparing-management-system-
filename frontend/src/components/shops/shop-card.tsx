import Link from "next/link";
import type { Shop } from "@/lib/api";
import { formatPriceLevel } from "@/lib/shop-search";

type ShopCardProps = {
  shop: Shop;
  href?: string;
  compact?: boolean;
};

export default function ShopCard({
  shop,
  href = `/shops/${shop.slug}`,
  compact = false,
}: ShopCardProps) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 sm:p-3 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {shop.name}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] line-clamp-2">
            {shop.description || shop.address}
          </p>
          <p className="mt-2 text-xs sm:text-sm text-[var(--muted-foreground)] line-clamp-2">
            ⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)
          </p>
          {typeof shop.distanceKm === "number" && (
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] line-clamp-2">
              {shop.distanceKm.toFixed(1)} km away
            </p>
          )}
        </div>

        <div className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-sm font-semibold text-[var(--foreground)]">
          {formatPriceLevel(shop.priceLevel)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {shop.hasVoucher && (
          <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs text-[var(--accent-dark)]">
            Voucher
          </span>
        )}
        {shop.freeDelivery && (
          <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs text-[var(--accent-dark)]">
            Free delivery
          </span>
        )}
        {shop.hasDeals && (
          <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs text-[var(--accent-dark)]">
            Deal
          </span>
        )}
      </div>

      {!compact && shop.specialties?.length ? (
        <p className="mt-3 text-sm text-[var(--muted-foreground)] line-clamp-1">
          {shop.specialties.slice(0, 2).join(" • ")}
        </p>
      ) : null}
    </Link>
  );
}