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
      className="block rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:shadow-md h-full flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-xl font-bold text-[var(--accent-dark)]">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="h-full w-full rounded-xl object-cover" />
            ) : (
              shop.name.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-[var(--foreground)]">
                  {shop.name}
                </h3>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-1">
                  {shop.description || shop.address}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[var(--foreground)]">
                  <span>⭐ {(shop.ratingAvg ?? 0).toFixed(1)}</span>
                  <span className="text-[var(--muted-foreground)]">({shop.reviewCount ?? 0} reviews)</span>
                </div>
                {typeof shop.distanceKm === "number" && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {shop.distanceKm.toFixed(1)} km away
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end pl-2 text-right">
                <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  {shop.offerSummary ? (shop.offerSummary.toLowerCase().includes("starting from") ? "Starting from" : "Inspection fee") : "From"}
                </span>
                <span className="text-base font-extrabold tracking-tight text-[var(--accent-dark)] leading-tight">
                  {shop.offerSummary ? shop.offerSummary.replace(/Starting from |Inspection /i, "") : formatPriceLevel(shop.priceLevel ?? 1)}
                </span>
              </div>
            </div>
          </div>
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