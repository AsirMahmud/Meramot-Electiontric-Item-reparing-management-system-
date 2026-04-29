"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
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

function AcceptedBidSummary({ bid }: { bid?: BidItem | null }) {
  if (!bid) {
    return <p className="mt-2 text-sm text-[#5b7262]">Accepted bid details will appear here once a bid is selected.</p>;
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl bg-white p-4 text-sm text-[#355541]">
        <p className="font-semibold text-[#173726]">Parts</p>
        <p className="mt-2">{formatMoney(bid.partsCost)}</p>
      </div>
      <div className="rounded-2xl bg-white p-4 text-sm text-[#355541]">
        <p className="font-semibold text-[#173726]">Labor</p>
        <p className="mt-2">{formatMoney(bid.laborCost)}</p>
      </div>
      <div className="rounded-2xl bg-white p-4 text-sm text-[#355541]">
        <p className="font-semibold text-[#173726]">Total</p>
        <p className="mt-2">{formatMoney(bid.totalCost)}</p>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState("Loading your requests...");
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

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
      setEmptyMessage(data.length ? "" : "No repair requests yet.");
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
      <main className="min-h-screen bg-[#E4FCD5]">
        <Navbar isLoggedIn={!!session?.user} firstName={firstName} />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[#173726]">Loading your requests...</div>
      </main>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={firstName} />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#58725f]">Orders</p>
            <h1 className="text-3xl font-bold text-[#173726]">Track your repair requests</h1>
            <p className="mt-2 text-sm text-[#5b7262]">
              Review vendor bids, accept or decline them, and respond to final diagnosis and quote once the device is inspected.
            </p>
          </div>
          <Link
            href="/requests/new"
            className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
          >
            New request
          </Link>
        </div>

        {flash ? (
          <div
            className={`mb-6 rounded-3xl px-5 py-4 text-sm ${
              flash.type === "success"
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-700"
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
              <article key={order.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-bold text-[#173726]">{order.title}</h2>
                      <span className="rounded-full bg-[#dff0dc] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-[#355541]">
                      {order.deviceType}
                      {order.brand ? ` • ${order.brand}` : ""}
                      {order.model ? ` • ${order.model}` : ""}
                      {order.issueCategory ? ` • ${order.issueCategory}` : ""}
                    </p>
                    <p className="mt-3 text-sm text-[#5b7262]">{order.problem}</p>
                  </div>

                  <div className="grid gap-3 rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541] lg:min-w-[280px]">
                    <div>
                      <p className="font-semibold text-[#173726]">Request summary</p>
                      <p className="mt-2">Flow: {formatStatus(order.mode)}</p>
                      <p>Pickup preferred: {order.preferredPickup ? "Yes" : "No"}</p>
                      <p>Delivery type: {order.deliveryType ? formatStatus(order.deliveryType) : "—"}</p>
                      <p>Created: {formatDate(order.createdAt)}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-[#173726]">Assigned shop</p>
                      <p className="mt-2">{order.repairJob?.shop.name || "Waiting for vendor selection"}</p>
                      {order.repairJob?.shop.slug ? (
                        <Link
                          href={`/shops/${order.repairJob.shop.slug}`}
                          className="mt-2 inline-block text-sm font-semibold text-[#214c34] underline underline-offset-2"
                        >
                          View shop
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                    <p className="font-semibold text-[#173726]">Bids received</p>
                    <p className="mt-2 text-2xl font-bold text-[#214c34]">{order.bids.length}</p>
                    <p className="mt-2">Final quote: {formatMoney(order.quotedFinalAmount)}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                    <p className="font-semibold text-[#173726]">Repair job</p>
                    <p className="mt-2">{order.repairJob ? formatStatus(order.repairJob.status) : "Not assigned yet"}</p>
                    <p className="mt-2">Customer approval: {order.repairJob?.customerApproved == null ? "Pending / not required" : order.repairJob.customerApproved ? "Approved" : "Declined"}</p>
                  </div>
                  <div className="rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                    <p className="font-semibold text-[#173726]">Latest delivery</p>
                    <p className="mt-2">{order.repairJob?.deliveries[0] ? formatStatus(order.repairJob.deliveries[0].status) : "No delivery assigned yet"}</p>
                    <p className="mt-2">{order.repairJob?.deliveries[0]?.trackingCode || "No tracking code yet"}</p>
                  </div>
                </div>

                {order.status === "BIDDING" ? (
                  <section className="mt-6 rounded-3xl bg-[#f6faf4] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Customer decision</p>
                        <h3 className="mt-1 text-xl font-bold text-[#173726]">Vendor bids</h3>
                      </div>
                      <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                        Accept one bid to assign the repair job
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      {bids.map((bid) => {
                        const isAccepting = pendingKey === `accept-bid:${bid.id}`;
                        const isDeclining = pendingKey === `decline-bid:${bid.id}`;
                        return (
                          <article key={bid.id} className="rounded-3xl bg-white p-5">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <h4 className="text-lg font-bold text-[#173726]">{bid.shop?.name || "Vendor shop"}</h4>
                                  <span className="rounded-full bg-[#eef5ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                                    {formatStatus(bid.status)}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm text-[#5b7262]">
                                  {bid.shop?.specialties?.length
                                    ? bid.shop.specialties.join(", ")
                                    : "No specialties listed"}
                                </p>
                                {bid.notes ? <p className="mt-3 text-sm text-[#355541]">{bid.notes}</p> : null}
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
                                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                                  <p className="font-semibold text-[#173726]">Parts</p>
                                  <p className="mt-2">{formatMoney(bid.partsCost)}</p>
                                </div>
                                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                                  <p className="font-semibold text-[#173726]">Labor</p>
                                  <p className="mt-2">{formatMoney(bid.laborCost)}</p>
                                </div>
                                <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                                  <p className="font-semibold text-[#173726]">Total</p>
                                  <p className="mt-2">{formatMoney(bid.totalCost)}</p>
                                  <p className="mt-2 text-xs text-[#5b7262]">
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
                                  className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isAccepting ? "Accepting..." : "Accept bid"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeclineBid(order.id, bid.id)}
                                  disabled={isAccepting || isDeclining}
                                  className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isDeclining ? "Declining..." : "Decline bid"}
                                </button>
                              </div>
                            ) : null}
                          </article>
                        );
                      })}

                      {!bids.length ? (
                        <div className="rounded-3xl bg-white p-5 text-sm text-[#355541]">
                          No vendor bids yet. Vendors who match the request skill requirements will see this request and can place bids.
                        </div>
                      ) : null}
                    </div>
                  </section>
                ) : null}

                {order.repairJob ? (
                  <section className="mt-6 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                    <div className="rounded-3xl bg-[#f6faf4] p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Assigned repair job</p>
                      <h3 className="mt-1 text-xl font-bold text-[#173726]">Current repair details</h3>

                      <div className="mt-4 rounded-3xl bg-[#eef5ea] p-5">
                        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#58725f]">Accepted vendor</p>
                        <h4 className="mt-1 text-lg font-bold text-[#173726]">{order.repairJob.shop.name}</h4>
                        <AcceptedBidSummary bid={order.repairJob.acceptedBid} />
                      </div>

                      {order.repairJob.diagnosisNotes ? (
                        <div className="mt-4 rounded-3xl bg-white p-5 text-sm text-[#355541]">
                          <p className="font-semibold text-[#173726]">Diagnosis notes</p>
                          <p className="mt-3 whitespace-pre-line">{order.repairJob.diagnosisNotes}</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-3xl bg-[#f6faf4] p-5">
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Final diagnosis and quote</p>
                      <h3 className="mt-1 text-xl font-bold text-[#173726]">Customer approval step</h3>

                      {quoteItems.length ? (
                        <div className="mt-4 space-y-3">
                          {quoteItems.map((item, index) => (
                            <div key={`${order.id}-${item.label}-${index}`} className="rounded-2xl bg-white p-4 text-sm text-[#355541]">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="font-semibold text-[#173726]">{item.label}</p>
                                  {item.description ? <p className="mt-1">{item.description}</p> : null}
                                </div>
                                <p className="font-semibold text-[#214c34]">{formatMoney(item.amount)}</p>
                              </div>
                            </div>
                          ))}

                          <div className="rounded-2xl border border-dashed border-[#cfe0c6] bg-white p-4 text-sm text-[#355541]">
                            <p className="font-semibold text-[#173726]">Total final quote</p>
                            <p className="mt-2 text-2xl font-bold text-[#214c34]">
                              {formatMoney(order.repairJob.finalQuotedAmount ?? order.quotedFinalAmount)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl bg-white p-4 text-sm text-[#355541]">
                          The vendor has not submitted an itemized final quote yet.
                        </div>
                      )}

                      {showFinalQuoteActions ? (
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => void handleFinalQuoteDecision(order.id, "ACCEPT")}
                            disabled={pendingKey === `quote:${order.id}:ACCEPT` || pendingKey === `quote:${order.id}:DECLINE`}
                            className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `quote:${order.id}:ACCEPT` ? "Accepting..." : "Accept final quote"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleFinalQuoteDecision(order.id, "DECLINE")}
                            disabled={pendingKey === `quote:${order.id}:ACCEPT` || pendingKey === `quote:${order.id}:DECLINE`}
                            className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `quote:${order.id}:DECLINE` ? "Declining..." : "Decline final quote"}
                          </button>
                        </div>
                      ) : order.repairJob.customerApproved === true ? (
                        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                          You accepted the final quote on {formatDate(order.approvedAt)}.
                        </div>
                      ) : order.repairJob.customerApproved === false ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
            <div className="rounded-[2rem] bg-white p-8 text-[#355541] shadow-sm">{emptyMessage}</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
