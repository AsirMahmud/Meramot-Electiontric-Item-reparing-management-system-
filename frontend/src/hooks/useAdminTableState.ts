import { useMemo, useState } from "react";

const PAGE_SIZE = 10;

/**
 * Generic hook that adds client-side search, sort-by-date, and pagination
 * to any admin list page.
 *
 * @param items       – the full, unfiltered list from the API
 * @param searchKeys  – which string keys of T to match the search against
 * @param dateKey     – which key holds the ISO date string for sorting
 */
export function useAdminTableState<T extends Record<string, any>>(
  items: T[],
  searchKeys: (keyof T)[],
  dateKey: keyof T = "createdAt" as keyof T,
) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // 1) Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key];
        if (val == null) return false;
        if (typeof val === "object") {
          // search nested object values (e.g. user.name, user.email)
          return Object.values(val).some(
            (v) => typeof v === "string" && v.toLowerCase().includes(q),
          );
        }
        return String(val).toLowerCase().includes(q);
      }),
    );
  }, [items, searchQuery, searchKeys]);

  // 2) Sort by date
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const da = new Date(a[dateKey] as string).getTime();
      const db = new Date(b[dateKey] as string).getTime();
      return sortOrder === "desc" ? db - da : da - db;
    });
  }, [filtered, sortOrder, dateKey]);

  // 3) Paginate
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, safePage]);

  // Reset page to 1 whenever search changes
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  };

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    sortOrder,
    toggleSort: handleSortToggle,
    currentPage: safePage,
    totalPages,
    setCurrentPage,
    paged,
    totalFiltered: sorted.length,
  };
}
