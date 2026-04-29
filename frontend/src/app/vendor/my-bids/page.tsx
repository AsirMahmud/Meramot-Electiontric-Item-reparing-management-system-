"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";

/* ─── types ─────────────────────────────────────────────────────────── */

type BidEntry = {
  id: string;
  rank: number;
  shopName: string;
  partsCost: number;
  laborCost: number;
  totalCost: number;
  estimatedDays?: number | null;
  notes?: string | null;
  status: string;
  shopRating: number;
  shopReviews: number;
  isOwn: boolean;
  createdAt: string;
};

type BidRequest = {
  id: string;
  title: string;
  deviceType: string;
  brand?: string | null;
  model?: string | null;
  issueCategory?: string | null;
  status: string;
  createdAt: string;
  totalBids: number;
  myRank: number | null;
  bids: BidEntry[];
};

/* ─── helpers ───────────────────────────────────────────────────────── */

function formatMoney(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

function formatStatus(value?: string | null) {
  return (value || "UNKNOWN").replaceAll("_", " ");
}

function rankLabel(rank: number | null, total: number) {
  if (rank === null) return "—";
  if (rank === 1) return "🏆 1st";
  if (rank === 2) return "🥈 2nd";
  if (rank === 3) return "🥉 3rd";
  return `#${rank} of ${total}`;
}

function rankColor(rank: number | null) {
  if (rank === 1) return "text-green-700 bg-green-50 border-green-200";
  if (rank === 2) return "text-blue-700 bg-blue-50 border-blue-200";
  if (rank === 3) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

/* ─── page ──────────────────────────────────────────────────────────── */

export default function VendorMyBidsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [requests, setRequests] = useState<BidRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadBids = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api"}/vendor/requests/my-bids`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed to load bids");
      const data = await res.json();
      setRequests(data.requests);
    } catch (err) {
      console.error("loadBids error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/login"); return; }
    if (role !== "VENDOR") { router.replace("/"); return; }
    void loadBids();
  }, [loadBids, role, router, session, status]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#f6faf4]">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-3xl bg-white/60" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6faf4]">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/vendor/dashboard"
              className="-ml-3 mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe0c6] bg-white px-4 py-2 text-sm font-semibold text-[#355541] transition-all hover:bg-[#f6faf4] hover:shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-[#173726]">My Offers</h1>
            <p className="mt-1 text-[#5b7262]">
              All repair requests where you&apos;ve placed offers. Click a tile to see your ranking.
            </p>
          </div>

          <button
            onClick={() => void loadBids()}
            className="rounded-full bg-[#214c34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173726] transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* No bids */}
        {!requests.length ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#173726]">No offers yet</p>
            <p className="mt-2 text-[#5b7262]">
              Visit your{" "}
              <Link href="/vendor/dashboard" className="font-medium text-[#214c34] underline">
                dashboard
              </Link>{" "}
              to find repair requests and make offers.
            </p>
          </div>
        ) : null}

        {/* Request tiles */}
        <div className="mt-6 space-y-4">
          {requests.map((req) => {
            const isOpen = expanded.has(req.id);

            return (
              <article key={req.id} className="rounded-3xl bg-white shadow-sm overflow-hidden">
                {/* Collapsed tile — always visible */}
                <button
                  type="button"
                  onClick={() => toggleExpand(req.id)}
                  className="w-full px-6 py-5 text-left transition-colors hover:bg-[#f6faf4]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[#173726] truncate">{req.title}</h3>
                        <span className="shrink-0 rounded-full bg-[#dff0dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#214c34]">
                          {formatStatus(req.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5b7262]">
                        {req.deviceType}
                        {req.brand ? ` • ${req.brand}` : ""}
                        {req.model ? ` • ${req.model}` : ""}
                        {req.issueCategory ? ` • ${req.issueCategory}` : ""}
                        {" · "}{formatDate(req.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {/* Total bids badge */}
                      <div className="text-center">
                        <p className="text-2xl font-bold text-[#173726]">{req.totalBids}</p>
                        <p className="text-xs text-[#5b7262]">offers</p>
                      </div>

                      {/* Rank badge */}
                      <div className={`rounded-2xl border px-4 py-2 text-center ${rankColor(req.myRank)}`}>
                        <p className="text-lg font-bold">{rankLabel(req.myRank, req.totalBids)}</p>
                        <p className="text-xs">your rank</p>
                      </div>

                      {/* Chevron */}
                      <span className={`text-xl text-[#5b7262] transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        ▾
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded — all bids */}
                {isOpen ? (
                  <div className="border-t border-[#e8f0e5] px-6 pb-6 pt-4">
                    <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#58725f]">
                      All offers — sorted by price (lowest first)
                    </p>

                    <div className="space-y-2">
                      {req.bids.map((bid) => (
                        <div
                          key={bid.id}
                          className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                            bid.isOwn
                              ? "border-[#214c34] bg-[#f0f7ee] ring-1 ring-[#214c34]/20"
                              : "border-[#e8f0e5] bg-white"
                          }`}
                        >
                          {/* Rank */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dff0dc] text-sm font-bold text-[#214c34]">
                            #{bid.rank}
                          </div>

                          {/* Shop info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-[#173726] truncate">
                                {bid.shopName}
                                {bid.isOwn ? (
                                  <span className="ml-2 inline-block rounded-full bg-[#214c34] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                    You
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs text-[#5b7262]">
                              ★ {bid.shopRating.toFixed(1)} ({bid.shopReviews} reviews)
                              {bid.estimatedDays ? ` · ${bid.estimatedDays} day${bid.estimatedDays !== 1 ? "s" : ""}` : ""}
                              {bid.notes ? ` · "${bid.notes.slice(0, 60)}${bid.notes.length > 60 ? "…" : ""}"` : ""}
                            </p>
                          </div>

                          {/* Price breakdown */}
                          <div className="shrink-0 text-right">
                            <p className="text-lg font-bold text-[#173726]">{formatMoney(bid.totalCost)}</p>
                            <p className="text-xs text-[#5b7262]">
                              Parts {formatMoney(bid.partsCost)} + Labor {formatMoney(bid.laborCost)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick insight */}
                    {req.myRank !== null && req.totalBids > 1 ? (
                      <div className={`mt-4 rounded-2xl p-4 text-sm ${
                        req.myRank === 1
                          ? "border border-green-200 bg-green-50 text-green-800"
                          : req.myRank <= Math.ceil(req.totalBids / 2)
                            ? "border border-blue-200 bg-blue-50 text-blue-800"
                            : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}>
                        {req.myRank === 1
                          ? "🏆 You have the best price! You're most likely to win this bid."
                          : `Your offer ranks #${req.myRank} out of ${req.totalBids}. Consider lowering your price to improve your chances.`}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
