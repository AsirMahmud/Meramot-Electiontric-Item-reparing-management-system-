"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SidebarFiltersProps = {
  compact?: boolean;
  targetPath?: string;
};

const sortOptions = [
  { label: "Top rated", value: "topRated" },
  { label: "Relevance", value: "relevance" },
  { label: "Nearest to me", value: "distance" },
  { label: "Lower price", value: "price" },
] as const;

const offerOptions = [
  { label: "Vouchers", value: "voucher" },
  { label: "Free delivery", value: "freeDelivery" },
  { label: "Deals", value: "deals" },
] as const;

function SidebarFiltersInner({
  compact = false,
  targetPath,
}: SidebarFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for immediate visual feedback (avoids Suspense remount issues)
  const urlSort = searchParams.get("sort") ?? "topRated";
  const [localSort, setLocalSort] = useState(urlSort);

  const urlDistance = Number(searchParams.get("maxDistanceKm") ?? 12);
  const [localDistance, setLocalDistance] = useState(urlDistance);

  // Keep local state in sync if URL changes externally (e.g. back button)
  useEffect(() => { setLocalSort(urlSort); }, [urlSort]);
  useEffect(() => { setLocalDistance(urlDistance); }, [urlDistance]);

  const selectedOffers = useMemo(
    () => ({
      voucher: searchParams.get("voucher") === "true",
      freeDelivery: searchParams.get("freeDelivery") === "true",
      deals: searchParams.get("deals") === "true",
    }),
    [searchParams]
  );

  function updateParam(key: string, value?: string | null) {
    if (key === "sort" && value) setLocalSort(value);
    if (key === "maxDistanceKm" && value) setLocalDistance(Number(value));

    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    const nextPath = targetPath ?? pathname;
    router.replace(`${nextPath}?${params.toString()}`, { scroll: false });
  }

  return (
    <aside className="space-y-4 lg:sticky lg:top-28">
      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-4 text-[1.05rem] font-semibold text-[var(--foreground)]">
          Sort shops
        </h3>
        <div className="space-y-3">
          {sortOptions.map((option) => {
            const active = localSort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateParam("sort", option.value)}
                className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left text-sm text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
              >
                <span
                  className={`h-4 w-4 rounded-full border ${
                    active
                      ? "border-[var(--accent-dark)] bg-[var(--accent-dark)]"
                      : "border-[var(--border)] bg-[var(--card)]"
                  }`}
                />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[1.05rem] font-semibold text-[var(--foreground)]">
            Distance
          </h3>
          <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
            Up to {localDistance} km
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={25}
          step={1}
          value={localDistance}
          onChange={(event) => {
            setLocalDistance(Number(event.currentTarget.value));
          }}
          onPointerUp={(event) => {
            updateParam("maxDistanceKm", (event.currentTarget as HTMLInputElement).value);
          }}
          className="w-full accent-[var(--accent-dark)]"
        />

        {!compact && (
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            Limit results to nearby shops and courier coverage.
          </p>
        )}
      </div>

      <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <h3 className="mb-4 text-[1.05rem] font-semibold text-[var(--foreground)]">
          Offers & savings
        </h3>
        <div className="space-y-3">
          {offerOptions.map((option) => {
            const active = selectedOffers[option.value];
            return (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-3 rounded-2xl px-2 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--mint-50)]"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) =>
                    updateParam(
                      option.value,
                      event.currentTarget.checked ? "true" : null
                    )
                  }
                  className="h-4 w-4 rounded border-[var(--border)] accent-[var(--accent-dark)]"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

import { Suspense } from "react";

export default function SidebarFilters(props: SidebarFiltersProps) {
  return (
    <Suspense fallback={<div>Loading filters...</div>}>
      <SidebarFiltersInner {...props} />
    </Suspense>
  );
}