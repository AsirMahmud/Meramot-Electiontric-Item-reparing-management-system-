"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

type Review = {
  id: string;
  score: number;
  review: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string;
    email: string;
  };
  shop: {
    id: string;
    name: string;
    slug: string;
  };
};

export default function AdminReviewsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReviewText, setSelectedReviewText] = useState<string | null>(null);

  // Filters
  const [shopId, setShopId] = useState("");
  const [userId, setUserId] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (shopId) queryParams.append("shopId", shopId);
      if (userId) queryParams.append("userId", userId);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reviews?${queryParams.toString()}`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReviews();
    }
  }, [token]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReviews();
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this review? This action cannot be undone and will recalculate the shop's rating.")) {
        return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/reviews/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(token),
      });

      if (res.ok) {
        setReviews((prev) => prev.filter((review) => review.id !== id));
      } else {
          const errData = await res.json();
          alert(errData.message || "Failed to delete review");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred while deleting the review.");
    }
  };

  const [sortBy, setSortBy] = useState<"date" | "rating">("date");

  const customSortFn = sortBy === "rating"
    ? (a: Review, b: Review, order: "asc" | "desc") => {
        return order === "desc" ? b.score - a.score : a.score - b.score;
      }
    : undefined;

  const table = useAdminTableState(reviews, ["review", "user", "shop", "id"] as any, "createdAt", customSortFn);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Moderation</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="mt-3 text-4xl font-bold text-[var(--accent-dark)]">Review Moderation</h2>
          <div className="mt-3 rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-bold text-[var(--accent-dark)]">
            {reviews.length} Total Reviews
          </div>
        </div>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
          Monitor platform-wide reviews and remove inappropriate content.
        </p>
      </div>

      <div className="mb-8">
        <form onSubmit={handleFilterSubmit} className="flex flex-col gap-4 md:flex-row md:items-center flex-wrap">
            <input
                type="text"
                placeholder="Filter by Shop ID"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto"
            />
            <input
                type="text"
                placeholder="Filter by User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto"
            />
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "rating")}
                className="w-full rounded-2xl border border-[var(--border)] px-4 py-3 text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto bg-white dark:bg-[#1C251F]"
            >
                <option value="date">Sort by Date</option>
                <option value="rating">Sort by Rating</option>
            </select>
            <button type="submit" className="rounded-2xl bg-[var(--accent-dark)] px-6 py-3 font-semibold text-[var(--accent-foreground)] transition hover:opacity-90">
                Filter
            </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading reviews...</div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search reviews by text, user, shop name…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            sortLabelDesc={sortBy === "rating" ? "Highest rating first" : "Newest first"}
            sortLabelAsc={sortBy === "rating" ? "Lowest rating first" : "Oldest first"}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="space-y-5">
            {table.paged.map((review) => (
              <div
                key={review.id}
                className="rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)] p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                          {review.shop.name}
                        </p>
                        <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                            {review.score} / 5
                        </span>
                    </div>
                    {review.review ? (
                      <div
                        className="mt-3 cursor-pointer rounded-xl bg-[var(--card)] p-3 transition hover:bg-[var(--mint-100)] active:scale-[0.99]"
                        onClick={() => setSelectedReviewText(review.review!)}
                      >
                        <h3 className="line-clamp-3 text-lg font-medium text-[var(--accent-dark)] italic">
                          &quot;{review.review}&quot;
                        </h3>
                        <p className="mt-1 text-[11px] font-bold uppercase text-[var(--accent-dark)] opacity-80">
                          Read full review
                        </p>
                      </div>
                    ) : (
                      <h3 className="mt-3 text-lg font-medium text-[var(--accent-dark)] italic">
                        &quot;No written review provided.&quot;
                      </h3>
                    )}
                    <p className="mt-4 text-sm font-medium text-[var(--foreground)]">
                      By: {review.user.name || review.user.username} ({review.user.email})
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Posted on: {new Date(review.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="rounded-full border border-[#B8C8B5] px-5 py-3 text-sm font-semibold text-[#6A3F3F] transition hover:bg-[#F5ECEC]"
                    >
                      Delete Review
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {!reviews.length && (
              <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">
                No reviews found.
              </div>
            )}
          </div>
        </>
      )}

      {selectedReviewText && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setSelectedReviewText(null)}>
          <div className="w-full max-w-md rounded-3xl bg-[var(--background)] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-xl font-bold text-[var(--foreground)]">Review Details</h3>
              <button
                onClick={() => setSelectedReviewText(null)}
                className="rounded-full bg-[var(--mint-100)] p-2 text-[var(--accent-dark)] transition hover:bg-[var(--accent-dark)] hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2">
              <p className="leading-7 text-[var(--foreground)] whitespace-pre-wrap italic">
                &quot;{selectedReviewText}&quot;
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
