import Link from "next/link";
import Image from "next/image";
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
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 sm:p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex flex-row items-start justify-between gap-2 sm:gap-4">
        <div className="flex flex-row items-start gap-3 w-full min-w-0">
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

          <div className="min-w-0 w-full">
            <h3 className="text-[0.95rem] leading-snug sm:text-lg font-bold text-[var(--foreground)] truncate">
              {shop.name}
            </h3>
            <p className="mt-1 text-[11px] leading-tight sm:text-sm text-[var(--muted-foreground)] line-clamp-2">
              {shop.description || shop.address}
            </p>
            <p className="mt-1.5 sm:mt-2 flex items-center gap-1 text-[11px] sm:text-sm text-[var(--foreground)]">
              ⭐ {shop.ratingAvg.toFixed(1)} <span className="text-[var(--muted-foreground)]">({shop.reviewCount})</span>
            </p>
            {typeof shop.distanceKm === "number" && (
              <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-sm text-[var(--foreground)]">
                {shop.distanceKm.toFixed(1)} km away
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 self-start rounded-full bg-[var(--mint-100)] px-2 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-sm font-semibold text-[var(--foreground)]">
          {formatPriceLevel(shop.priceLevel)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
        {shop.hasVoucher && (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-[var(--accent-dark)]">
            Voucher
          </span>
        )}
        {shop.freeDelivery && (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-[var(--accent-dark)]">
            Free delivery
          </span>
        )}
        {shop.hasDeals && (
          <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs text-[var(--accent-dark)]">
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