"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getRequestById, acceptBid, type RequestDetail, type RequestBidDetail } from "@/lib/api";

/* ─── helpers ────────────────────────────────────────────── */

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
  return date.toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(s: string) {
  return s.replaceAll("_", " ");
}

function statusColor(s: string) {
  switch (s) {
    case "BIDDING":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "PENDING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "ASSIGNED":
      return "bg-purple-100 text-purple-700 border-purple-200";
    case "COMPLETED":
      return "bg-green-100 text-green-700 border-green-200";
    case "CANCELLED":
      return "bg-red-100 text-red-600 border-red-200";
    default:
      return "bg-[var(--mint-100)] text-[var(--accent-dark)] border-[var(--border)]";
  }
}

function bidRankColor(rank: number) {
  if (rank === 1) return "border-[var(--mint-500)] bg-[var(--mint-50)] ring-2 ring-[var(--mint-300)]";
  if (rank === 2) return "border-[var(--mint-300)] bg-[var(--mint-50)]";
  if (rank === 3) return "border-[var(--border)] bg-[var(--mint-50)]";
  return "border-[var(--border)] bg-[var(--card)]";
}

function rankBadge(rank: number) {
  if (rank === 1) return { label: "🏆 Best Price", cls: "bg-[var(--mint-100)] text-[var(--accent-dark)]" };
  if (rank === 2) return { label: "🥈 2nd", cls: "bg-[var(--mint-100)] text-[var(--accent-dark)]" };
  if (rank === 3) return { label: "🥉 3rd", cls: "bg-[var(--mint-100)] text-[var(--accent-dark)]" };
  return { label: `#${rank}`, cls: "bg-[var(--muted)] text-[var(--muted-foreground)]" };
}

function priceBar(amount: number, maxAmount: number) {
  if (!maxAmount) return 0;
  return Math.max(8, Math.min(100, (amount / maxAmount) * 100));
}

/* ─── page ───────────────────────────────────────────────── */

export default function BidStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const [requestId, setRequestId] = useState("");
  const [data, setData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [expandedBid, setExpandedBid] = useState<string | null>(null);

  const { data: session } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    params.then((v) => setRequestId(v.id));
  }, [params]);

  useEffect(() => {
    if (!requestId || !token) return;
    loadRequest();
  }, [requestId, token]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  async function loadRequest() {
    if (!token || !requestId) return;
    try {
      setLoading(true);
      setError("");
      const result = await getRequestById(token, requestId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptBid(bidId: string) {
    if (!token || !requestId) return;
    try {
      setAcceptingBidId(bidId);
      await acceptBid(token, requestId, bidId);
      setFlash({ type: "success", text: "Bid accepted! The shop will begin working on your repair." });
      await loadRequest();
    } catch (e) {
      setFlash({ type: "error", text: e instanceof Error ? e.message : "Failed to accept bid." });
    } finally {
      setAcceptingBidId(null);
    }
  }

  const bids = data?.bids ?? [];
  const maxBidAmount = Math.max(...bids.map((b) => b.totalCost), 1);
  const lowestBid = bids.length ? Math.min(...bids.map((b) => b.totalCost)) : 0;
  const highestBid = bids.length ? Math.max(...bids.map((b) => b.totalCost)) : 0;
  const avgBid = bids.length ? bids.reduce((s, b) => s + b.totalCost, 0) / bids.length : 0;
  const canAccept = data?.status === "PENDING" || data?.status === "BIDDING";

  /* ─── render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded-full bg-[var(--mint-100)]" />
            <div className="h-40 rounded-[2rem] bg-[var(--mint-50)]" />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-56 rounded-[2rem] bg-[var(--mint-50)]" />
              <div className="h-56 rounded-[2rem] bg-[var(--mint-50)]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-3xl px-4 py-12">
          <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-center">
            <p className="text-lg font-semibold text-[var(--foreground)]">{error || "Request not found."}</p>
            <Link href="/orders" className="mt-4 inline-block rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)]">
              Back to orders
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      {/* Flash toast */}
      {flash && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
          <div className={`pointer-events-auto rounded-2xl px-5 py-3 text-sm font-medium shadow-xl ${
            flash.type === "success" ? "bg-green-700 text-white" : "bg-red-600 text-white"
          }`}>
            {flash.text}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5 md:py-10">
        {/* ── Breadcrumb ─────────────────────── */}
        <div className="mb-6 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
          <Link href="/orders" className="hover:text-[var(--accent-dark)] transition-colors">Orders</Link>
          <span>›</span>
          <span className="text-[var(--foreground)] font-medium truncate">{data.title}</span>
          <span>›</span>
          <span className="text-[var(--accent-dark)] font-semibold">Bidding Status</span>
        </div>

        {/* ── Request Summary Card ────────────── */}
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] md:text-3xl leading-tight">{data.title}</h1>
                <span className={`shrink-0 rounded-full border px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-[0.1em] ${statusColor(data.status)}`}>
                  {statusLabel(data.status)}
                </span>
              </div>
              <p className="mt-1.5 text-xs sm:text-sm text-[var(--muted-foreground)]">
                {data.deviceType}
                {data.brand ? ` • ${data.brand}` : ""}
                {data.model ? ` • ${data.model}` : ""}
                {data.issueCategory ? ` • ${data.issueCategory}` : ""}
              </p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)] leading-relaxed line-clamp-3 md:line-clamp-none">{data.problem}</p>
            </div>

            <button
              type="button"
              onClick={() => void loadRequest()}
              className="self-start shrink-0 rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-2 sm:px-5 sm:py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--mint-50)]"
            >
              ↻ Refresh
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-4 sm:mt-6 grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-4">
            <div className="rounded-2xl bg-[var(--mint-50)] border border-[var(--border)] p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-[var(--accent-dark)]">{bids.length}</p>
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--muted-foreground)]">Total Bids</p>
            </div>
            <div className="rounded-2xl bg-[var(--mint-50)] border border-[var(--border)] p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-green-700 truncate">{formatMoney(lowestBid)}</p>
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--muted-foreground)]">Lowest Bid</p>
            </div>
            <div className="rounded-2xl bg-[var(--mint-50)] border border-[var(--border)] p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-[var(--foreground)] truncate">{formatMoney(avgBid)}</p>
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--muted-foreground)]">Average Bid</p>
            </div>
            <div className="rounded-2xl bg-[var(--mint-50)] border border-[var(--border)] p-3 sm:p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-amber-600 truncate">{formatMoney(highestBid)}</p>
              <p className="mt-1 text-[10px] sm:text-xs text-[var(--muted-foreground)]">Highest Bid</p>
            </div>
          </div>
        </section>

        {/* ── Assigned Shop (if accepted) ─────── */}
        {data.repairJob && (
          <section className="mt-6 rounded-[2rem] border border-[var(--mint-300)] bg-[var(--mint-100)] p-5 shadow-sm md:p-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mint-200)] text-lg">✅</div>
              <div>
                <p className="font-bold text-[var(--foreground)]">Bid Accepted — Job Assigned</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Shop: <strong>{data.repairJob.shop.name}</strong> • Status: {statusLabel(data.repairJob.status)}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ── Bids List ──────────────────────── */}
        <section className="mt-8">
          <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] md:text-2xl">
                {canAccept ? "Shop Offers" : "Bid History"}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)]">
                {canAccept
                  ? "Review quotes from shops and accept the best one."
                  : "These bids were submitted for this request."}
              </p>
            </div>
          </div>

          {bids.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[var(--border)] bg-[var(--card)] p-10 text-center">
              <p className="text-lg font-semibold text-[var(--foreground)]">No bids yet</p>
              <p className="mt-2 text-[var(--muted-foreground)]">
                Vendors are reviewing your request. Bids will appear here as they arrive.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map((bid, index) => {
                const rank = index + 1;
                const badge = rankBadge(rank);
                const isExpanded = expandedBid === bid.id;

                return (
                  <article
                    key={bid.id}
                    className={`rounded-[1.5rem] border p-4 sm:p-5 shadow-sm transition-all duration-200 md:rounded-[2rem] md:p-6 ${bidRankColor(rank)}`}
                  >
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      {/* Rank badge */}
                      <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-dark)] text-xs sm:text-sm font-bold text-[var(--accent-foreground)] shadow-md">
                        #{rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-[var(--foreground)] truncate">{bid.shop.name}</h3>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 sm:px-2.5 text-[10px] font-bold uppercase tracking-wider ${badge.cls}`}>
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs sm:text-sm text-[var(--muted-foreground)] line-clamp-1">
                          ★ {bid.shop.ratingAvg.toFixed(1)} ({bid.shop.reviewCount} reviews)
                          {bid.shop.address ? ` • ${bid.shop.address}` : ""}
                        </p>
                      </div>

                      {/* Price — always top-right */}
                      <div className="shrink-0 text-right">
                        <p className="text-lg sm:text-2xl font-bold text-[var(--accent-dark)] leading-tight">{formatMoney(bid.totalCost)}</p>
                        <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">
                          {bid.estimatedDays ? `${bid.estimatedDays}d est.` : "No ETA"}
                        </p>
                      </div>
                    </div>

                    {/* Price breakdown bar */}
                    <div className="mt-4">
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
                        <span>Price relative to others:</span>
                        <div className="flex-1 h-2.5 rounded-full bg-[var(--mint-100)] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              rank === 1 ? "bg-[var(--mint-500)]" : rank === 2 ? "bg-[var(--mint-500)]" : rank === 3 ? "bg-[var(--mint-300)]" : "bg-[var(--muted)]"
                            }`}
                            style={{ width: `${priceBar(bid.totalCost, maxBidAmount)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cost breakdown */}
                    <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-3">
                      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Parts</p>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">{formatMoney(bid.partsCost)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Labor</p>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[var(--foreground)] truncate">{formatMoney(bid.laborCost)}</p>
                      </div>
                      <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-2 sm:p-3 text-center">
                        <p className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">Total</p>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm font-bold text-[var(--accent-dark)] truncate">{formatMoney(bid.totalCost)}</p>
                      </div>
                    </div>

                    {/* Expandable details */}
                    <button
                      type="button"
                      onClick={() => setExpandedBid(isExpanded ? null : bid.id)}
                      className="mt-4 flex w-full items-center justify-between rounded-xl bg-[var(--card)] px-4 py-2.5 text-sm text-[var(--muted-foreground)] transition-colors hover:bg-[var(--mint-100)]"
                    >
                      <span>
                        {isExpanded ? "Hide details" : "Show shop details & notes"}
                      </span>
                      <span className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Shop specialties */}
                        {bid.shop.specialties?.length > 0 && (
                          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Specialties</p>
                            <div className="flex flex-wrap gap-1.5">
                              {bid.shop.specialties.map((s) => (
                                <span key={s} className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-medium text-[var(--accent-dark)]">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {bid.notes && (
                          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Vendor Notes</p>
                            <p className="text-sm text-[var(--foreground)] leading-relaxed italic">"{bid.notes}"</p>
                          </div>
                        )}

                        {/* Timestamps */}
                        <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">
                          <p>Bid placed: {formatDate(bid.createdAt)}</p>
                          <p>Last updated: {formatDate(bid.updatedAt)}</p>
                          <p>Price level: {"💰".repeat(Math.min(bid.shop.priceLevel || 1, 4))}</p>
                        </div>
                      </div>
                    )}

                    {/* Accept button */}
                    {canAccept && (
                      <div className="mt-4 flex sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void handleAcceptBid(bid.id)}
                          disabled={acceptingBidId === bid.id}
                          className="w-full sm:w-auto rounded-full bg-[var(--accent-dark)] px-6 sm:px-7 py-2.5 sm:py-3 text-sm font-semibold text-[var(--accent-foreground)] transition-all shadow-sm hover:opacity-90 disabled:opacity-50"
                        >
                          {acceptingBidId === bid.id
                            ? "Accepting..."
                            : rank === 1
                              ? "✓ Accept Best Offer"
                              : "Accept This Offer"}
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Back link ──────────────────────── */}
        <div className="mt-8 text-center">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--mint-50)]"
          >
            ← Back to all orders
          </Link>
        </div>
      </div>
    </main>
  );
}
