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
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--foreground)]">
            {shop.name}
          </h3>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {shop.description || shop.address}
          </p>
          <p className="mt-2 text-sm text-[var(--foreground)]">
            ⭐ {(shop.ratingAvg ?? 0).toFixed(1)} ({shop.reviewCount ?? 0} reviews)
          </p>
          {typeof shop.distanceKm === "number" && (
            <p className="mt-1 text-sm text-[var(--foreground)]">
              {shop.distanceKm.toFixed(1)} km away
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end pl-2 text-right">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">
            {shop.offerSummary ? (shop.offerSummary.toLowerCase().includes("starting from") ? "Starting from" : "Inspection fee") : "From"}
          </span>
          <span className="text-lg font-extrabold tracking-tight text-[var(--accent-dark)] leading-tight">
            {shop.offerSummary ? shop.offerSummary.replace(/Starting from |Inspection /i, "") : formatPriceLevel(shop.priceLevel ?? 1)}
          </span>
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
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          {shop.specialties.slice(0, 2).join(" • ")}
        </p>
      ) : null}
    </Link>
  );
}