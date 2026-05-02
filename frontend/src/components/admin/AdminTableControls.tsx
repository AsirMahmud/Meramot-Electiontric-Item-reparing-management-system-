"use client";

import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Shared search bar + sort toggle + pagination for every admin list  */
/* ------------------------------------------------------------------ */

type Props = {
  /** placeholder shown inside the search input */
  searchPlaceholder?: string;
  /** current search query (controlled) */
  searchQuery: string;
  onSearchChange: (q: string) => void;

  /** "asc" = oldest-first, "desc" = newest-first */
  sortOrder: "asc" | "desc";
  onSortToggle: () => void;

  /** pagination */
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function AdminTableControls({
  searchPlaceholder = "Search…",
  searchQuery,
  onSearchChange,
  sortOrder,
  onSortToggle,
  currentPage,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <div className="mb-4 space-y-3">
      {/* Row: search + sort */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full rounded-xl border border-[var(--border)] bg-white py-2 pl-9 pr-3 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-dark)] dark:bg-[#1C251F] md:text-sm md:py-2.5"
          />
        </div>

        <button
          type="button"
          onClick={onSortToggle}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-[10px] font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)] dark:bg-[#1C251F] md:px-4 md:py-2.5 md:text-xs"
        >
          <svg className="h-3.5 w-3.5 md:h-4 md:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sortOrder === "desc" ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            )}
          </svg>
          {sortOrder === "desc" ? "Newest first" : "Oldest first"}
        </button>
      </div>

      {/* Pagination — only show when there is more than 1 page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-[var(--muted-foreground)] md:text-xs">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)] disabled:opacity-40 dark:bg-[#1C251F] md:px-3 md:py-1.5 md:text-xs"
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                // Show first, last, current, and neighbors
                if (p === 1 || p === totalPages) return true;
                if (Math.abs(p - currentPage) <= 1) return true;
                return false;
              })
              .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "…" ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-[10px] text-[var(--muted-foreground)] md:text-xs">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onPageChange(item as number)}
                    className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition md:px-3 md:py-1.5 md:text-xs ${
                      currentPage === item
                        ? "bg-[var(--accent-dark)] text-[var(--accent-foreground)]"
                        : "border border-[var(--border)] text-[var(--accent-dark)] hover:bg-[var(--mint-50)] dark:bg-[#1C251F]"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)] disabled:opacity-40 dark:bg-[#1C251F] md:px-3 md:py-1.5 md:text-xs"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
