"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  getVendorAnalytics,
  type VendorAnalyticsData,
} from "@/lib/api";

type FlashState = {
  type: "error";
  text: string;
} | null;

function formatMoney(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function renderStars(score: number) {
  const safeScore = Math.max(0, Math.min(5, Math.round(score)));
  return `${"★".repeat(safeScore)}${"☆".repeat(5 - safeScore)}`;
}

export default function VendorAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [analytics, setAnalytics] = useState<VendorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<FlashState>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (role !== "VENDOR") {
      router.replace("/");
      return;
    }

    if (!token) {
      setLoading(false);
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        const result = await getVendorAnalytics(token!);
        if (cancelled) return;
        setAnalytics(result);
        setFlash(null);
      } catch (error) {
        if (cancelled) return;
        setAnalytics(null);
        setFlash({
          type: "error",
          text: error instanceof Error ? error.message : "Could not load analytics.",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [role, router, session, status, token]);

  const maxEarnings = useMemo(() => {
    return Math.max(1, ...(analytics?.trends.map((item) => item.earnings) ?? [0]));
  }, [analytics]);

  const maxBidsWon = useMemo(() => {
    return Math.max(1, ...(analytics?.trends.map((item) => item.bidsWon) ?? [0]));
  }, [analytics]);

  if (!session?.user || role !== "VENDOR") {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor analytics</p>
            <h1 className="mt-2 text-3xl font-bold text-[#173726]">Shop owner analytics dashboard</h1>
            <p className="mt-2 text-sm text-[#5b7262]">
              Monitor monthly earnings, bids won, and customer sentiment for {analytics?.shop.name || "your shop"}.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/vendor/dashboard"
              className="rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
            >
              Back to dashboard
            </Link>
            <Link
              href="/vendor/setup-shop"
              className="rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white"
            >
              Edit shop setup
            </Link>
          </div>
        </div>

        {flash ? (
          <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {flash.text}
          </div>
        ) : null}

        {loading ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-[2rem] bg-white/70" />
            ))}
          </section>
        ) : null}

        {!loading && analytics ? (
          <>
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Monthly earnings</p>
                <p className="mt-3 text-4xl font-bold text-[#173726]">
                  {formatMoney(analytics.summary.totalMonthlyEarnings)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">For {analytics.summary.monthLabel}</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Bids won</p>
                <p className="mt-3 text-4xl font-bold text-[#173726]">{analytics.summary.bidsWonThisMonth}</p>
                <p className="mt-2 text-sm text-[#5b7262]">Accepted customer decisions this month</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Average customer rating</p>
                <p className="mt-3 text-4xl font-bold text-[#173726]">
                  {analytics.summary.averageCustomerRating.toFixed(1)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">Based on {analytics.summary.reviewCount} review(s)</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Best recent month</p>
                <p className="mt-3 text-4xl font-bold text-[#173726]">
                  {formatMoney(analytics.insights.bestMonthEarnings)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">Peak month: {analytics.insights.bestMonthLabel}</p>
              </article>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_0.6fr]">
              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Earnings trend</p>
                    <h2 className="mt-2 text-2xl font-bold text-[#173726]">Last 6 months</h2>
                  </div>
                  <div className="rounded-full bg-[#f3f8f0] px-4 py-2 text-sm text-[#355541]">
                    6-month bids won: <span className="font-semibold text-[#173726]">{analytics.insights.sixMonthBidsWon}</span>
                  </div>
                </div>

                <div className="mt-8 grid min-h-[280px] grid-cols-6 items-end gap-3">
                  {analytics.trends.map((item) => {
                    const height = item.earnings > 0 ? Math.max(18, Math.round((item.earnings / maxEarnings) * 220)) : 0;

                    return (
                      <div key={item.key} className="flex h-full flex-col items-center justify-end gap-3">
                        <p className="text-center text-xs font-semibold text-[#355541]">{formatMoney(item.earnings)}</p>
                        <div className="flex h-[220px] items-end">
                          <div
                            className="w-12 rounded-t-3xl bg-[#214c34] shadow-sm transition-all"
                            style={{ height: `${height}px` }}
                            title={`${item.label}: ${formatMoney(item.earnings)}`}
                          />
                        </div>
                        <p className="text-center text-xs font-semibold text-[#6b8270]">{item.label}</p>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Performance snapshot</p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">This month</h2>

                <div className="mt-6 space-y-5">
                  {analytics.trends.map((item) => {
                    const bidWidth = item.bidsWon > 0 ? Math.max(12, Math.round((item.bidsWon / maxBidsWon) * 100)) : 0;

                    return (
                      <div key={item.key} className="rounded-3xl bg-[#f6faf4] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-[#173726]">{item.label}</p>
                          <p className="text-sm text-[#5b7262]">{item.bidsWon} bids won</p>
                        </div>
                        <div className="mt-3 h-3 rounded-full bg-white">
                          <div
                            className="h-3 rounded-full bg-[#8fcf92]"
                            style={{ width: `${bidWidth}%` }}
                          />
                        </div>
                        <p className="mt-3 text-sm text-[#355541]">{item.completedJobs} completed job(s)</p>
                      </div>
                    );
                  })}
                </div>
              </article>
            </section>

            <section className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Customer rating</p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">Rating overview</h2>

                <div className="mt-6 rounded-[2rem] bg-[#f6faf4] p-6 text-center">
                  <p className="text-5xl font-bold text-[#173726]">{analytics.summary.averageCustomerRating.toFixed(1)}</p>
                  <p className="mt-3 text-lg tracking-[0.2em] text-[#214c34]">
                    {renderStars(analytics.summary.averageCustomerRating)}
                  </p>
                  <p className="mt-3 text-sm text-[#5b7262]">
                    {analytics.summary.reviewCount} review(s) submitted by customers
                  </p>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-3xl border border-[#d9e5d5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">6-month wins</p>
                    <p className="mt-2 text-2xl font-bold text-[#173726]">{analytics.insights.sixMonthBidsWon}</p>
                  </div>
                  <div className="rounded-3xl border border-[#d9e5d5] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">6-month completed jobs</p>
                    <p className="mt-2 text-2xl font-bold text-[#173726]">{analytics.insights.sixMonthCompletedJobs}</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Recent customer feedback</p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">Latest ratings</h2>

                <div className="mt-6 space-y-4">
                  {analytics.recentRatings.length ? (
                    analytics.recentRatings.map((rating) => (
                      <div key={rating.id} className="rounded-[1.75rem] bg-[#f6faf4] p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#173726]">{rating.customerName}</p>
                            <p className="mt-1 text-sm text-[#214c34]">
                              {renderStars(rating.score)} · {rating.score.toFixed(1)} / 5
                            </p>
                          </div>
                          <p className="text-sm text-[#5b7262]">{formatDate(rating.createdAt)}</p>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-[#355541]">
                          {rating.review?.trim() || "Customer left a score without written feedback."}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.75rem] bg-[#f6faf4] p-5 text-sm text-[#355541]">
                      No customer ratings yet. Completed jobs and review submissions will start appearing here automatically.
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
