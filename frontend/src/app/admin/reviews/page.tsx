"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

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
        headers: getAuthHeaders(),
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
    fetchReviews();
  }, []);

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
        headers: getAuthHeaders(),
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

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Moderation</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Review Moderation</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Monitor platform-wide reviews and remove inappropriate content.
        </p>
      </div>

      <div className="mb-8">
        <form onSubmit={handleFilterSubmit} className="flex flex-col gap-4 md:flex-row md:items-center">
            <input
                type="text"
                placeholder="Filter by Shop ID"
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                className="w-full rounded-2xl border border-[#D7E2D2] px-4 py-3 text-[#244233] focus:border-[#1F4D2E] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto"
            />
            <input
                type="text"
                placeholder="Filter by User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full rounded-2xl border border-[#D7E2D2] px-4 py-3 text-[#244233] focus:border-[#1F4D2E] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto"
            />
            <button type="submit" className="rounded-2xl bg-[#1F4D2E] px-6 py-3 font-semibold text-white transition hover:bg-[#183D24]">
                Filter
            </button>
        </form>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading reviews...</div>
      ) : (
        <div className="space-y-5">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">
                        {review.shop.name}
                      </p>
                      <span className="rounded-full bg-[#E6F0E2] px-3 py-1 text-xs font-semibold text-[#1F4D2E]">
                          {review.score} / 5
                      </span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-[#1F4D2E] italic">
                      "{review.review || "No written review provided."}"
                  </h3>
                  <p className="mt-4 text-sm font-medium text-[#244233]">
                    By: {review.user.name || review.user.username} ({review.user.email})
                  </p>
                  <p className="mt-1 text-xs text-[#6B7C72]">
                    Posted on: {new Date(review.createdAt).toLocaleDateString()}
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
            <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">
              No reviews found.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
