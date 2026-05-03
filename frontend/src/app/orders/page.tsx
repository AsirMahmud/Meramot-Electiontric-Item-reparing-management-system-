"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import AiSummary from "@/components/shared/AiSummary";
import {
  acceptBid,
  declineBid,
  getMyOrders,
  respondToFinalQuote,
  type BidItem,
  type FinalQuoteItem,
  type OrderItem,
} from "@/lib/api";

type FlashMessage = {
  type: "success" | "error";
  text: string;
};

function formatStatus(value?: string | null) {
  return (value || "UNKNOWN").replaceAll("_", " ");
}

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
  return date.toLocaleString();
}

function getQuoteItems(items?: FinalQuoteItem[] | null) {
  return Array.isArray(items) ? items : [];
}

function getSortedBids(order: OrderItem) {
  return [...order.bids].sort((left, right) => {
    const leftIsActive = left.status === "ACTIVE" ? 0 : 1;
    const rightIsActive = right.status === "ACTIVE" ? 0 : 1;
    if (leftIsActive !== rightIsActive) return leftIsActive - rightIsActive;
    return left.totalCost - right.totalCost;
  });
}

function canRespondToFinalQuote(order: OrderItem) {
  return (
    order.status === "WAITING_APPROVAL" &&
    order.repairJob?.status === "WAITING_APPROVAL" &&
    getQuoteItems(order.repairJob?.finalQuoteItems).length > 0
  );
}

// === NEW COMPONENTS ===

function OrderProgressModal({ order, onClose }: { order: OrderItem; onClose: () => void }) {
  const steps = [
    { key: "PENDING", label: "Created" },
    { key: "ASSIGNED", label: "Assigned" },
    { key: "PICKED_UP", label: "In Transit" },
    { key: "AT_SHOP", label: "At Shop" },
    { key: "DIAGNOSING", label: "Inspecting" },
    { key: "REPAIRING", label: "Repairing" },
    { key: "COMPLETED", label: "Completed" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === order.status);
  const activeIdx = currentIdx >= 0 ? currentIdx : order.status === "BIDDING" ? 0 : steps.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[2rem] bg-[var(--background)] p-6 shadow-2xl md:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Order Progress</h2>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-[var(--mint-50)] text-[var(--muted-foreground)]">&times;</button>
        </div>
        <div className="mt-8 space-y-6">
          {steps.map((step, idx) => {
            const isCompleted = idx < activeIdx;
            const isCurrent = idx === activeIdx;
            return (
              <div key={step.key} className="flex items-center gap-4">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                  isCompleted ? "bg-[var(--accent-dark)] text-white" : isCurrent ? "border-2 border-[var(--accent-dark)] text-[var(--accent-dark)]" : "bg-[var(--mint-50)] text-[var(--muted-foreground)]"
                }`}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <div className={isCurrent ? "font-bold text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                  {step.label}
                </div>
              </div>
            );
          })}
        </div>
        
        {order.repairJob?.deliveries?.length ? (
          <div className="mt-8 rounded-2xl bg-[var(--mint-50)] p-4 text-sm">
            <p className="font-semibold text-[var(--foreground)]">Delivery Info</p>
            {order.repairJob.deliveries.map(d => (
              <div key={d.id} className="mt-2 text-[var(--muted-foreground)]">
                <p>Status: {formatStatus(d.status)}</p>
                {d.riderName && <p>Rider: {d.riderName} ({d.riderPhone})</p>}
                {d.trackingCode && <p>Tracking: {d.trackingCode}</p>}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderFinancials({ order }: { order: OrderItem }) {
  if (!order.payments?.length) return null;
  const payment = order.payments[0];

  return (
    <div className="rounded-3xl bg-[var(--mint-50)] p-5 text-sm text-[var(--muted-foreground)] mt-4">
      <p className="font-semibold text-[var(--foreground)]">Financial Details</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[var(--card)] p-4 border border-[var(--border)]">
          <p className="font-semibold text-[var(--foreground)]">Payment</p>
          <p className="mt-1">Method: {payment.method || "N/A"}</p>
          <p>Status: {formatStatus(payment.status)}</p>
          <p>Amount: {formatMoney(payment.amount)}</p>
          {payment.transactionRef && <p className="text-xs break-all">Txn: {payment.transactionRef}</p>}
        </div>
        
        {payment.refunds?.length > 0 && (
          <div className="rounded-2xl bg-[var(--card)] p-4 border border-red-100 dark:border-red-900">
            <p className="font-semibold text-red-600 dark:text-red-400">Refund</p>
            {payment.refunds.map(r => (
              <div key={r.id} className="mt-1">
                <p>Amount: {formatMoney(r.amount)}</p>
                <p>Status: {formatStatus(r.status)}</p>
                {r.reason && <p className="text-xs mt-1">"{r.reason}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderSupport({ order }: { order: OrderItem }) {
  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
      <Link 
        href={`/support/new?orderId=${order.id}`}
        className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
      >
        Raise Support Ticket
      </Link>
      
      {order.supportTickets?.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
          {order.supportTickets.length} active ticket(s)
        </span>
      )}
      
      {order.disputeCases?.length > 0 && (
        <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
          Dispute {formatStatus(order.disputeCases[0].status)}
        </span>
      )}
    </div>
  );
}

// === EXISTING COMPONENTS MODIFIED ===

function AcceptedBidSummary({ bid }: { bid?: BidItem | null }) {
  if (!bid) {
    return <p className="mt-2 text-sm text-[var(--muted-foreground)]">Accepted bid details will appear here once a bid is selected.</p>;
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
        <p className="font-semibold text-[var(--foreground)]">Parts</p>
        <p className="mt-2">{formatMoney(bid.partsCost)}</p>
      </div>
      <div className="rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
        <p className="font-semibold text-[var(--foreground)]">Labor</p>
        <p className="mt-2">{formatMoney(bid.laborCost)}</p>
      </div>
      <div className="rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
        <p className="font-semibold text-[var(--foreground)]">Total</p>
        <p className="mt-2">{formatMoney(bid.totalCost)}</p>
      </div>
    </div>
  );
}

function OrdersPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState("Loading your requests...");
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [selectedOrderForProgress, setSelectedOrderForProgress] = useState<OrderItem | null>(null);

  const createdFlag = searchParams.get("created") === "1";

  const loadOrders = useCallback(async () => {
    if (!token) {
      setOrders([]);
      setEmptyMessage("Sign in to view your requests.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getMyOrders(token);
      setOrders(data);
      setEmptyMessage(data.length ? "" : "No repair requests or orders yet.");
    } catch (error) {
      setOrders([]);
      setEmptyMessage(
        error instanceof Error ? error.message : "Failed to load your requests."
      );
    } finally {
      setLoading(false);
      setPendingKey(null);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (createdFlag) {
      setFlash({
        type: "success",
        text: "Repair request submitted successfully. Vendors can now bid if it is a marketplace request.",
      });
    }

    void loadOrders();
  }, [createdFlag, loadOrders, router, session, status]);

  const firstName = useMemo(() => session?.user?.name?.split(" ")[0] || "User", [session]);

  async function handleCancelRequest(orderId: string) {
    if (!token) return;

    if (!window.confirm("Are you sure you want to cancel this order? If you paid online, a refund will be initiated automatically.")) {
      return;
    }

    try {
      setPendingKey(`cancel:${orderId}`);
      // Dynamic import to avoid circular dependencies if any, though it should be fine
      const { cancelRequest } = await import("@/lib/api");
      const res = await cancelRequest(token, orderId);
      setFlash({ type: "success", text: res.message || "Order cancelled successfully." });
      await loadOrders();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not cancel the order.",
      });
    }
  }

  async function handleDeleteRequest(orderId: string) {
    if (!token) return;

    if (!window.confirm("Are you sure you want to completely delete this order from your history? This action cannot be undone.")) {
      return;
    }

    try {
      setPendingKey(`delete:${orderId}`);
      const { deleteRequest } = await import("@/lib/api");
      const res = await deleteRequest(token, orderId);
      setFlash({ type: "success", text: res.message || "Order deleted successfully." });
      await loadOrders();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not delete the order.",
      });
    }
  }

  async function handleAcceptBid(orderId: string, bidId: string) {
    if (!token) return;

    try {
      setPendingKey(`accept-bid:${bidId}`);
      await acceptBid(token, orderId, bidId);
      setFlash({ type: "success", text: "Bid accepted and the job has been assigned to that vendor." });
      await loadOrders();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not accept the bid.",
      });
    }
  }

  async function handleDeclineBid(orderId: string, bidId: string) {
    if (!token) return;

    try {
      setPendingKey(`decline-bid:${bidId}`);
      await declineBid(token, orderId, bidId);
      setFlash({ type: "success", text: "Bid declined." });
      await loadOrders();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not decline the bid.",
      });
    }
  }

  async function handleFinalQuoteDecision(orderId: string, action: "ACCEPT" | "DECLINE") {
    if (!token) return;

    try {
      setPendingKey(`quote:${orderId}:${action}`);
      await respondToFinalQuote(token, orderId, action);
      setFlash({
        type: "success",
        text:
          action === "ACCEPT"
            ? "Final quote accepted. The vendor can continue the repair."
            : "Final quote declined. The repair job has been closed.",
      });
      await loadOrders();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not submit your final quote decision.",
      });
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar isLoggedIn={!!session?.user} firstName={firstName} />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[var(--foreground)]">Loading your requests...</div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />
      
      {selectedOrderForProgress && (
        <OrderProgressModal order={selectedOrderForProgress} onClose={() => setSelectedOrderForProgress(null)} />
      )}

      <div className="mx-auto max-w-6xl px-3 py-4 md:px-4 md:py-8">
        <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-center md:justify-between md:gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Orders & Requests</p>
            <h1 className="text-xl font-bold text-[var(--foreground)] md:text-3xl">Track your orders</h1>
            <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
              View your service orders, accept marketplace bids, and track repair progress.
            </p>
          </div>
          <Link
            href="/requests/new"
            className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            New request
          </Link>
        </div>

        {flash ? (
          <div
            className={`mb-6 rounded-3xl px-5 py-4 text-sm ${
              flash.type === "success"
                ? "border border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300"
                : "border border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
            }`}
          >
            {flash.text}
          </div>
        ) : null}

        <div className="space-y-5">
          {orders.map((order) => {
            const bids = getSortedBids(order);
            const quoteItems = getQuoteItems(order.repairJob?.finalQuoteItems);
            const showFinalQuoteActions = canRespondToFinalQuote(order);

            return (
              <article key={order.id} className="rounded-[1.25rem] bg-[var(--card)] p-4 shadow-sm border border-[var(--border)] md:rounded-[2rem] md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold capitalize text-[var(--foreground)] md:text-2xl">{order.title}</h2>
                      <span className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] ${order.status === "BIDDING" ? "bg-[var(--mint-100)] text-[var(--accent-dark)]" : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"}`}>
                        {formatStatus(order.status)}
                      </span>
                      {order.source === "DIRECT_SERVICE" && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          Cart Order
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[var(--muted-foreground)]">
                      {order.deviceType}
                      {order.brand ? ` • ${order.brand}` : ""}
                      {order.model ? ` • ${order.model}` : ""}
                      {order.issueCategory ? ` • ${order.issueCategory}` : ""}
                    </p>
                    <p className="mt-3 text-sm text-[var(--muted-foreground)]">{order.problem}</p>
                    
                    <AiSummary 
                      orderId={order.id}
                      deviceType={order.deviceType}
                      brand={order.brand}
                      model={order.model}
                      issueCategory={order.issueCategory}
                      problem={order.problem}
                      initialSummary={order.aiSummary}
                    />
                    
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <button 
                        onClick={() => setSelectedOrderForProgress(order)}
                        className="inline-flex items-center justify-center rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-200)]"
                      >
                        View Progress Timeline &rarr;
                      </button>
                      
                      {(order.status === "PENDING" || order.status === "BIDDING") && (
                        <button
                          onClick={() => handleCancelRequest(order.id)}
                          disabled={pendingKey === `cancel:${order.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          {pendingKey === `cancel:${order.id}` ? "Cancelling..." : "Cancel Order"}
                        </button>
                      )}

                      {(order.status === "CANCELLED" || order.status === "COMPLETED" || order.status === "REJECTED" || order.status === "RETURNED_TO_CUSTOMER") && (
                        <button
                          onClick={() => handleDeleteRequest(order.id)}
                          disabled={pendingKey === `delete:${order.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          {pendingKey === `delete:${order.id}` ? "Deleting..." : "Delete Order History"}
                        </button>
                      )}
                    </div>
                    
                    <OrderFinancials order={order} />
                    <OrderSupport order={order} />
                  </div>

                  <div className="grid gap-3 rounded-3xl bg-[var(--mint-50)] p-5 text-sm text-[var(--muted-foreground)] lg:min-w-[280px]">
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">Request summary</p>
                      <p className="mt-2">Flow: {formatStatus(order.mode)}</p>
                      <p>Pickup preferred: {order.preferredPickup ? "Yes" : "No"}</p>
                      <p>Delivery type: {order.deliveryType ? formatStatus(order.deliveryType) : "—"}</p>
                      <p>Created: {formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--foreground)]">Assigned shop</p>
                      <p className="mt-2">{order.repairJob?.shop.name || (order.status === "PENDING" ? "Waiting for vendor to accept" : "Waiting for vendor selection")}</p>
                      {order.repairJob?.shop.slug ? (
                        <Link
                          href={`/shops/${order.repairJob.shop.slug}`}
                          className="mt-2 inline-block text-sm font-semibold text-[var(--accent-dark)] underline underline-offset-2"
                        >
                          View shop
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-5 md:grid-cols-3">
                  <div className="rounded-3xl bg-[var(--mint-50)] p-5 text-sm text-[var(--muted-foreground)]">
                    <p className="font-semibold text-[var(--foreground)]">Bids received</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--accent-dark)]">{order.bids?.length || 0}</p>
                    <p className="mt-2">Final quote: {formatMoney(order.quotedFinalAmount)}</p>
                  </div>
                  <div className="rounded-3xl bg-[var(--mint-50)] p-5 text-sm text-[var(--muted-foreground)]">
                    <p className="font-semibold text-[var(--foreground)]">Repair job</p>
                    <p className="mt-2">{order.repairJob ? formatStatus(order.repairJob.status) : "Not assigned yet"}</p>
                    <p className="mt-2">Customer approval: {order.repairJob?.customerApproved == null ? "Pending / not required" : order.repairJob.customerApproved ? "Approved" : "Declined"}</p>
                  </div>
                  <div className="rounded-3xl bg-[var(--mint-50)] p-5 text-sm text-[var(--muted-foreground)]">
                    <p className="font-semibold text-[var(--foreground)]">Latest delivery</p>
                    <p className="mt-2">{order.repairJob?.deliveries?.[0] ? formatStatus(order.repairJob.deliveries[0].status) : "No delivery assigned yet"}</p>
                    <p className="mt-2">{order.repairJob?.deliveries?.[0]?.trackingCode || "No tracking code yet"}</p>
                  </div>
                </div>

                {order.status === "BIDDING" ? (
                  <section className="mt-6 rounded-3xl bg-[var(--mint-50)] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Customer decision</p>
                        <h3 className="mt-1 text-xl font-bold text-[var(--foreground)]">Vendor bids</h3>
                      </div>
                      <span className="rounded-full bg-[var(--card)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-dark)]">
                        Accept one bid to assign the repair job
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {bids.map((bid) => {
                        const isAccepting = pendingKey === `accept-bid:${bid.id}`;
                        const isDeclining = pendingKey === `decline-bid:${bid.id}`;
                        return (
                          <article key={bid.id} className="rounded-3xl bg-[var(--card)] p-5 border border-[var(--border)]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-lg font-bold text-[var(--foreground)]">{bid.shop?.name || "Vendor shop"}</h4>
                                  <span className="rounded-full bg-[var(--mint-100)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-dark)]">
                                    {formatStatus(bid.status)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                                  {bid.shop?.specialties?.length
                                    ? bid.shop.specialties.join(", ")
                                    : "No specialties listed"}
                                </p>
                                {bid.notes ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{bid.notes}</p> : null}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                                <div className="rounded-2xl bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                                  <p className="font-semibold text-[var(--foreground)]">Parts</p>
                                  <p className="mt-2">{formatMoney(bid.partsCost)}</p>
                                </div>
                                <div className="rounded-2xl bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                                  <p className="font-semibold text-[var(--foreground)]">Labor</p>
                                  <p className="mt-2">{formatMoney(bid.laborCost)}</p>
                                </div>
                                <div className="rounded-2xl bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)]">
                                  <p className="font-semibold text-[var(--foreground)]">Total</p>
                                  <p className="mt-2">{formatMoney(bid.totalCost)}</p>
                                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                                    {typeof bid.estimatedDays === "number"
                                      ? `${bid.estimatedDays} day(s)`
                                      : "ETA not provided"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {bid.status === "ACTIVE" ? (
                              <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                  type="button"
                                  onClick={() => void handleAcceptBid(order.id, bid.id)}
                                  disabled={isAccepting || isDeclining}
                                  className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isAccepting ? "Accepting..." : "Accept bid"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeclineBid(order.id, bid.id)}
                                  disabled={isAccepting || isDeclining}
                                  className="rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeclining ? "Declining..." : "Decline bid"}
                                </button>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}

                      {!bids.length ? (
                        <div className="rounded-3xl bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] border border-[var(--border)]">
                          No vendor bids yet. Vendors who match the request skill requirements will see this request and can place bids.
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {order.repairJob ? (
                  <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl bg-[var(--mint-50)] p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Assigned repair job</p>
                      <h3 className="mt-1 text-xl font-bold text-[var(--foreground)]">Current repair details</h3>

                      <div className="mt-4 rounded-3xl bg-[var(--mint-100)] p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Accepted vendor</p>
                        <h4 className="mt-1 text-lg font-bold text-[var(--foreground)]">{order.repairJob.shop.name}</h4>
                        <AcceptedBidSummary bid={order.repairJob.acceptedBid} />
                      </div>

                      {order.repairJob.diagnosisNotes ? (
                        <div className="mt-4 rounded-3xl bg-[var(--card)] p-5 text-sm text-[var(--muted-foreground)] border border-[var(--border)]">
                          <p className="font-semibold text-[var(--foreground)]">Diagnosis notes</p>
                          <p className="mt-3 whitespace-pre-line">{order.repairJob.diagnosisNotes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl bg-[var(--mint-50)] p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Final diagnosis and quote</p>
                      <h3 className="mt-1 text-xl font-bold text-[var(--foreground)]">Customer approval step</h3>

                      {quoteItems.length ? (
                        <div className="mt-4 space-y-3">
                          {quoteItems.map((item, index) => (
                            <div key={`${order.id}-${item.label}-${index}`} className="rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)] border border-[var(--border)]">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="font-semibold text-[var(--foreground)]">{item.label}</p>
                                  {item.description ? <p className="mt-1">{item.description}</p> : null}
                                </div>
                                <p className="font-semibold text-[var(--accent-dark)]">{formatMoney(item.amount)}</p>
                              </div>
                            </div>
                          ))}

                          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
                            <p className="font-semibold text-[var(--foreground)]">Total final quote</p>
                            <p className="mt-2 text-2xl font-bold text-[var(--accent-dark)]">
                              {formatMoney(order.repairJob.finalQuotedAmount ?? order.quotedFinalAmount)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)] border border-[var(--border)]">
                          The vendor has not submitted an itemized final quote yet.
                        </div>
                      )}

                      {showFinalQuoteActions ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleFinalQuoteDecision(order.id, "ACCEPT")}
                            disabled={pendingKey === `quote:${order.id}:ACCEPT` || pendingKey === `quote:${order.id}:DECLINE`}
                            className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `quote:${order.id}:ACCEPT` ? "Accepting..." : "Accept final quote"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleFinalQuoteDecision(order.id, "DECLINE")}
                            disabled={pendingKey === `quote:${order.id}:ACCEPT` || pendingKey === `quote:${order.id}:DECLINE`}
                            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `quote:${order.id}:DECLINE` ? "Declining..." : "Decline final quote"}
                          </button>
                        </div>
                      ) : order.repairJob.customerApproved === true ? (
                        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
                          You accepted the final quote on {formatDate(order.approvedAt)}.
                        </div>
                      ) : order.repairJob.customerApproved === false ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                          You declined the final quote on {formatDate(order.rejectedAt)}.
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}
              </article>
            );
          })}

          {!orders.length ? (
            <div className="rounded-[2rem] bg-[var(--card)] p-8 text-[var(--muted-foreground)] shadow-sm border border-[var(--border)]">{emptyMessage}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center"><p>Loading orders...</p></div>}>
      <OrdersPageInner />
    </Suspense>
  );
}
