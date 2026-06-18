"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/vendor/Navbar";
import {
  getVendorAnalytics,
  getEarningFeedbackCounts,
  getMyEarningFeedback,
  submitEarningFeedback,
  type VendorAnalyticsData,
  type EarningFeedbackCounts,
  type MyEarningFeedback,
} from "@/lib/api";

type FlashState = {
  type: "error" | "success";
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

  // Earning feedback state
  const [feedbackCounts, setFeedbackCounts] = useState<EarningFeedbackCounts | null>(null);
  const [myFeedback, setMyFeedback] = useState<MyEarningFeedback | null>(null);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

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
        const [result, counts, myFb] = await Promise.all([
          getVendorAnalytics(token!),
          getEarningFeedbackCounts(),
          getMyEarningFeedback(token!),
        ]);
        if (cancelled) return;
        setAnalytics(result);
        setFeedbackCounts(counts);
        setMyFeedback(myFb);
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

  async function handleFeedback(rating: "ADEQUATE" | "INADEQUATE") {
    if (!token || feedbackSubmitting) return;

    setFeedbackSubmitting(true);
    try {
      await submitEarningFeedback(token, { rating });

      // Refresh both counts and my feedback
      const [counts, myFb] = await Promise.all([
        getEarningFeedbackCounts(),
        getMyEarningFeedback(token),
      ]);
      setFeedbackCounts(counts);
      setMyFeedback(myFb);
      setFlash({ type: "success", text: `Marked this month's earnings as ${rating.toLowerCase()}.` });
    } catch (error) {
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not submit feedback.",
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  }

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
            <h1 className="mt-2 text-2xl font-bold text-[#173726] md:text-3xl">Shop owner analytics dashboard</h1>
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
          <div
            className={`mt-6 rounded-3xl border px-5 py-4 text-sm ${
              flash.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
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
                <p className="mt-3 text-2xl font-bold text-[#173726] md:text-4xl">
                  {formatMoney(analytics.summary.totalMonthlyEarnings)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">For {analytics.summary.monthLabel}</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Bids won</p>
                <p className="mt-3 text-2xl font-bold text-[#173726] md:text-4xl">{analytics.summary.bidsWonThisMonth}</p>
                <p className="mt-2 text-sm text-[#5b7262]">Accepted customer decisions this month</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Average customer rating</p>
                <p className="mt-3 text-2xl font-bold text-[#173726] md:text-4xl">
                  {analytics.summary.averageCustomerRating.toFixed(1)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">Based on {analytics.summary.reviewCount} review(s)</p>
              </article>

              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Best recent month</p>
                <p className="mt-3 text-2xl font-bold text-[#173726] md:text-4xl">
                  {formatMoney(analytics.insights.bestMonthEarnings)}
                </p>
                <p className="mt-2 text-sm text-[#5b7262]">Peak month: {analytics.insights.bestMonthLabel}</p>
              </article>
            </section>

            {/* ====== EARNING FEEDBACK SECTION ====== */}
            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              {/* Rate this month's earnings */}
              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
                  Monthly earning feedback
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">
                  Rate your earnings
                </h2>
                <p className="mt-2 text-sm text-[#5b7262]">
                  How do you feel about your earnings for{" "}
                  <span className="font-semibold text-[#173726]">{analytics.summary.monthLabel}</span>?
                </p>

                {myFeedback?.feedback ? (
                  <div className="mt-5 rounded-2xl bg-[#f6faf4] p-5">
                    <p className="text-sm text-[#355541]">
                      You marked this month&apos;s earnings as{" "}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                          myFeedback.feedback.rating === "ADEQUATE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {myFeedback.feedback.rating === "ADEQUATE" ? "✓" : "✕"}{" "}
                        {myFeedback.feedback.rating}
                      </span>
                    </p>
                    <p className="mt-3 text-xs text-[#6b8270]">
                      You can change your selection below.
                    </p>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    id="btn-adequate"
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => handleFeedback("ADEQUATE")}
                    className={`group relative flex-1 overflow-hidden rounded-2xl px-6 py-4 text-sm font-bold transition-all duration-300 ${
                      myFeedback?.feedback?.rating === "ADEQUATE"
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 ring-2 ring-emerald-400"
                        : "border-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-md"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                      </svg>
                      Adequate
                    </span>
                  </button>

                  <button
                    id="btn-inadequate"
                    type="button"
                    disabled={feedbackSubmitting}
                    onClick={() => handleFeedback("INADEQUATE")}
                    className={`group relative flex-1 overflow-hidden rounded-2xl px-6 py-4 text-sm font-bold transition-all duration-300 ${
                      myFeedback?.feedback?.rating === "INADEQUATE"
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-200 ring-2 ring-amber-400"
                        : "border-2 border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100 hover:shadow-md"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                      </svg>
                      Inadequate
                    </span>
                  </button>
                </div>
              </article>

              {/* Global feedback counts */}
              <article className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
                  Community sentiment
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">
                  All vendor feedback
                </h2>
                <p className="mt-2 text-sm text-[#5b7262]">
                  Total count of Adequate and Inadequate selections from all vendors.
                </p>

                {feedbackCounts ? (
                  <div className="mt-5 space-y-4">
                    {/* Adequate bar */}
                    <div className="rounded-2xl bg-[#f6faf4] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          </span>
                          <p className="font-semibold text-[#173726]">Adequate</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-600">
                          {feedbackCounts.adequate}
                        </p>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-white">
                        <div
                          className="h-3 rounded-full bg-emerald-400 transition-all duration-500"
                          style={{
                            width: feedbackCounts.total > 0
                              ? `${Math.round((feedbackCounts.adequate / feedbackCounts.total) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>

                    {/* Inadequate bar */}
                    <div className="rounded-2xl bg-[#fdf8f4] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                          </span>
                          <p className="font-semibold text-[#173726]">Inadequate</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-600">
                          {feedbackCounts.inadequate}
                        </p>
                      </div>
                      <div className="mt-3 h-3 rounded-full bg-white">
                        <div
                          className="h-3 rounded-full bg-amber-400 transition-all duration-500"
                          style={{
                            width: feedbackCounts.total > 0
                              ? `${Math.round((feedbackCounts.inadequate / feedbackCounts.total) * 100)}%`
                              : "0%",
                          }}
                        />
                      </div>
                    </div>

                    {/* Total */}
                    <div className="rounded-2xl border border-[#d9e5d5] p-4 text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">Total responses</p>
                      <p className="mt-2 text-3xl font-bold text-[#173726]">{feedbackCounts.total}</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                    Loading feedback data...
                  </div>
                )}
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

                <div className="mt-6 grid min-h-[200px] grid-cols-3 items-end gap-2 md:mt-8 md:min-h-[280px] md:grid-cols-6 md:gap-3">
                  {analytics.trends.map((item) => {
                    const height = item.earnings > 0 ? Math.max(18, Math.round((item.earnings / maxEarnings) * 220)) : 0;

                    return (
                      <div key={item.key} className="flex h-full flex-col items-center justify-end gap-3">
                        <p className="text-center text-xs font-semibold text-[#355541]">{formatMoney(item.earnings)}</p>
                        <div className="flex h-[220px] items-end">
                          <div
                            className="w-8 rounded-t-2xl bg-[#214c34] shadow-sm transition-all md:w-12 md:rounded-t-3xl"
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
                  <p className="text-4xl font-bold text-[#173726] md:text-5xl">{analytics.summary.averageCustomerRating.toFixed(1)}</p>
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
