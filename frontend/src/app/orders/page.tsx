"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getMyOrders, acceptBid, createSupportTicket, createDispute, cancelRequest } from "@/lib/api";

type OrderItem = {
  id: string;
  title: string;
  deviceType?: string | null;
  brand?: string | null;
  model?: string | null;
  problem?: string | null;
  status: string;
  mode: string;
  repairJob?: {
    shop?: {
      name: string;
    } | null;
    deliveries?: {
      status?: string | null;
    }[];
  } | null;
  bids?: {
    id: string;
    totalCost: number;
    estimatedDays?: number | null;
    notes?: string | null;
    shop: {
      name: string;
      ratingAvg: number;
      priceLevel: number;
    };
  }[];
};

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [message, setMessage] = useState("Loading your orders...");

  const fetchOrders = async (token: string) => {
    try {
      const data = await getMyOrders(token);
      setOrders(data);
      setMessage(data.length ? "" : "No orders yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load orders.");
    }
  };

  useEffect(() => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) {
      setMessage("Log in to view your orders.");
      return;
    }
    fetchOrders(token);
  }, [session]);

  const handleAcceptBid = async (requestId: string, bidId: string) => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) return;
    try {
      setMessage("Accepting bid...");
      await acceptBid(token, requestId, bidId);
      await fetchOrders(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to accept bid.");
    }
  };

  const handleCreateSupportTicket = async (requestId: string) => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) return;
    const subject = window.prompt("Brief subject of your issue:");
    if (!subject) return;
    const messageContent = window.prompt("Describe the issue in detail:");
    if (!messageContent) return;

    try {
      setMessage("Submitting support ticket...");
      await createSupportTicket(token, requestId, subject, messageContent);
      setMessage("Support ticket submitted successfully. We'll get back to you soon!");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to submit ticket.");
    }
  };

  const handleCreateDispute = async (requestId: string) => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) return;
    const reason = window.prompt("Reason for dispute:");
    if (!reason) return;

    try {
      setMessage("Opening dispute case...");
      await createDispute(token, requestId, reason);
      setMessage("Dispute filed successfully. Support staff will review it shortly.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to file dispute.");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
    if (!token) return;

    if (!window.confirm("Are you sure you want to cancel? If you cancel more than 3 requests this month, an 80 TK penalty will be added to your next order.")) {
      return;
    }

    try {
      setMessage("Cancelling request...");
      await cancelRequest(token, requestId);
      await fetchOrders(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to cancel request.");
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar
        isLoggedIn={!!session?.user}
        firstName={session?.user?.name?.split(" ")[0]}
      />

      <div className="mx-auto max-w-6xl px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Orders
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              Track your requests
            </h1>
          </div>

          <Link
            href="/requests/new"
            className="shrink-0 rounded-full bg-[var(--accent-dark)] px-5 py-2.5 sm:px-6 sm:py-3 text-sm font-semibold text-white"
          >
            New request
          </Link>
        </div>

        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] leading-tight">
                    {order.title}
                  </h2>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
                    {order.deviceType} {order.brand || ""} {order.model || ""}
                  </p>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)] line-clamp-2">
                    {order.problem}
                  </p>
                </div>

                <div className="self-start rounded-full bg-[var(--mint-100)] px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-[var(--accent-dark)] whitespace-nowrap">
                  {order.status.replaceAll("_", " ")}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-3 sm:p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)] text-xs sm:text-sm">Flow</p>
                  <p className="text-xs sm:text-sm mt-0.5">{order.mode.replaceAll("_", " ")}</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-3 sm:p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)] text-xs sm:text-sm">Shop</p>
                  <p className="text-xs sm:text-sm mt-0.5">{order.repairJob?.shop?.name || "Matching in progress"}</p>
                </div>

                <div className="rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-3 sm:p-4 text-sm text-[var(--muted-foreground)]">
                  <p className="font-semibold text-[var(--foreground)] text-xs sm:text-sm">
                    Latest delivery
                  </p>
                  <p className="text-xs sm:text-sm mt-0.5">
                    {order.repairJob?.deliveries?.[0]?.status?.replaceAll(
                      "_",
                      " "
                    ) || "No delivery assigned yet"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center sm:justify-center gap-2 sm:gap-6 md:gap-15">
                {(order.status === "BIDDING" || order.status === "PENDING") && (
                  <Link
                    href={`/requests/${order.id}/bid-status`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--accent-dark)] px-3 py-1.5 sm:px-6 sm:py-2.5 text-sm sm:text-base sm:font-bold font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                    Check Bidding Status
                  </Link>
                )}
                <button
                  onClick={() => handleCreateSupportTicket(order.id)}
                  className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 sm:px-6 sm:py-2.5 text-sm sm:text-base sm:font-bold font-semibold text-[var(--foreground)] hover:bg-[var(--accent)] hover:text-white transition-colors"
                >
                  Raise Support Ticket
                </button>
                {order.status !== "PENDING" && order.status !== "BIDDING" && order.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleCreateDispute(order.id)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 sm:px-6 sm:py-2.5 text-sm sm:text-base sm:font-bold font-semibold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    File Dispute
                  </button>
                )}
                {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                  <button
                    onClick={() => handleCancelRequest(order.id)}
                    className="rounded-full border border-red-200 bg-white px-3 py-1.5 sm:px-6 sm:py-2.5 text-sm sm:text-base sm:font-bold font-semibold text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Cancel Request
                  </button>
                )}
              </div>

              {order.status === "PENDING" && order.bids && order.bids.length > 0 && (
                <div className="mt-5 border-t border-[var(--border)] pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)]">Available Shop Quotes</h3>
                    <Link
                      href={`/requests/${order.id}/bid-status`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-dark)] px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
                      Full Dashboard →
                    </Link>
                  </div>
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {order.bids.map((bid) => (
                      <div key={bid.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 sm:p-4 flex flex-col gap-3">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--foreground)] text-base sm:text-lg truncate">{bid.shop.name}</p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">★ {bid.shop.ratingAvg.toFixed(1)} • {bid.shop.priceLevel || "$$"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-bold text-lg sm:text-xl text-[var(--accent-dark)]">{bid.totalCost.toFixed(2)} ৳</p>
                            {bid.estimatedDays && (
                              <p className="text-xs text-[var(--muted-foreground)]">{bid.estimatedDays}d est.</p>
                            )}
                          </div>
                        </div>
                        {bid.notes && (
                          <div className="rounded-xl bg-[var(--card)] p-3 text-xs sm:text-sm text-[var(--muted-foreground)] border border-[var(--border)] line-clamp-3">
                            &ldquo;{bid.notes}&rdquo;
                          </div>
                        )}
                        <button
                          onClick={() => handleAcceptBid(order.id, bid.id)}
                          className="w-full rounded-full bg-[var(--accent-dark)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        >
                          Accept Quote
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}

          {!orders.length && (
            <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-[var(--muted-foreground)] shadow-sm">
              {message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}