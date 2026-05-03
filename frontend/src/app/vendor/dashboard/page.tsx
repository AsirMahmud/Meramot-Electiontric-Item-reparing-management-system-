"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import AiSummary from "@/components/shared/AiSummary";
import {
  getVendorDashboard,
  submitVendorBid,
  submitVendorFinalQuote,
  updateVendorJobStatus,
  updateVendorNotificationPreferences,
  acceptPendingOrder,
  rejectPendingOrder,
  getBiddingRequests,
  type BiddingRequestsResponse,
  type FinalQuoteItem,
  type VendorDashboardData,
} from "@/lib/api";

type PartRow = {
  name: string;
  cost: string;
};

type BidDraft = {
  parts: PartRow[];
  laborCost: string;
  estimatedDays: string;
  notes: string;
};

type QuoteRowDraft = {
  label: string;
  description: string;
  amount: string;
};

type FinalQuoteDraft = {
  diagnosisNotes: string;
  items: QuoteRowDraft[];
};

type FlashMessage = {
  type: "success" | "error";
  text: string;
};

type BidConfirmation = {
  requestId: string;
  totalOffer: number;
  message: string;
  variant: "success" | "warning" | "info";
};

const VENDOR_JOB_STATUSES = [
  "AT_SHOP",
  "DIAGNOSING",
  "REPAIRING",
  "COMPLETED",
  "CANCELLED",
] as const;

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

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function getQuoteRows(items?: FinalQuoteItem[] | null): QuoteRowDraft[] {
  if (!Array.isArray(items) || !items.length) {
    return [{ label: "", description: "", amount: "" }];
  }

  return items.map((item) => ({
    label: item.label || "",
    description: item.description || "",
    amount:
      typeof item.amount === "number" && Number.isFinite(item.amount)
        ? String(item.amount)
        : "",
  }));
}

function buildBidDraft(
  dashboard: VendorDashboardData,
  requestItem: any
): BidDraft {
  const existingParts: PartRow[] =
    typeof requestItem.myBid?.partsCost === "number" && requestItem.myBid.partsCost > 0
      ? [{ name: "Parts", cost: String(requestItem.myBid.partsCost) }]
      : [{ name: "", cost: "" }];

  return {
    parts: existingParts,
    laborCost:
      typeof requestItem.myBid?.laborCost === "number"
        ? String(requestItem.myBid.laborCost)
        : dashboard.shop.baseLaborFee != null
          ? String(dashboard.shop.baseLaborFee)
          : "",
    estimatedDays:
      typeof requestItem.myBid?.estimatedDays === "number"
        ? String(requestItem.myBid.estimatedDays)
        : "",
    notes: requestItem.myBid?.notes || "",
  };
}

function buildFinalQuoteDraft(
  dashboard: VendorDashboardData,
  job: VendorDashboardData["assignedJobs"][number]
): FinalQuoteDraft {
  const rows = getQuoteRows(job.finalQuoteItems);

  if (
    rows.length === 1 &&
    !rows[0].label &&
    !rows[0].description &&
    !rows[0].amount
  ) {
    const seeded: QuoteRowDraft[] = [
      {
        label: "Parts",
        description: "Replacement parts and components",
        amount:
          typeof job.acceptedBid?.partsCost === "number"
            ? String(job.acceptedBid.partsCost)
            : "",
      },
      {
        label: "Labor",
        description: "Repair labor and workmanship",
        amount:
          typeof job.acceptedBid?.laborCost === "number"
            ? String(job.acceptedBid.laborCost)
            : dashboard.shop.baseLaborFee != null
              ? String(dashboard.shop.baseLaborFee)
              : "",
      },
    ];

    return {
      diagnosisNotes: job.diagnosisNotes || "",
      items: seeded,
    };
  }

  return {
    diagnosisNotes: job.diagnosisNotes || "",
    items: rows,
  };
}

function canShowFinalQuoteForm(job: VendorDashboardData["assignedJobs"][number]) {
  return job.status !== "COMPLETED" && job.status !== "CANCELLED";
}

export default function VendorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [dashboard, setDashboard] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [bidDrafts, setBidDrafts] = useState<Record<string, BidDraft>>({});
  const [jobStatusDrafts, setJobStatusDrafts] = useState<Record<string, string>>({});
  const [finalQuoteDrafts, setFinalQuoteDrafts] = useState<Record<string, FinalQuoteDraft>>({});
  const [bidConfirm, setBidConfirm] = useState<BidConfirmation | null>(null);
  
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [isUpdatingNotifications, setIsUpdatingNotifications] = useState(false);

  const [biddingData, setBiddingData] = useState<BiddingRequestsResponse | null>(null);
  const [biddingPage, setBiddingPage] = useState(1);
  const [biddingFilter, setBiddingFilter] = useState("relevant");
  const [biddingSort, setBiddingSort] = useState("desc");
  const [loadingBidding, setLoadingBidding] = useState(false);

  const loadDashboard = useCallback(async () => {
    if (!token) {
      setDashboard(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getVendorDashboard(token);
      setDashboard(data);
      setFlash(null);

      const nextJobStatuses: Record<string, string> = {};
      const nextFinalQuoteDrafts: Record<string, FinalQuoteDraft> = {};
      for (const job of data.assignedJobs) {
        nextJobStatuses[job.id] = job.status;
        nextFinalQuoteDrafts[job.id] = buildFinalQuoteDraft(data, job);
      }
      setJobStatusDrafts(nextJobStatuses);
      setFinalQuoteDrafts(nextFinalQuoteDrafts);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not load the vendor dashboard.";
      setDashboard(null);
      setFlash({ type: "error", text: message });
    } finally {
      setLoading(false);
      setPendingKey(null);
    }
  }, [token]);

  const loadBiddingRequests = useCallback(async (page: number, filter: string, sort: string, currentDashboard: VendorDashboardData | null) => {
    if (!token || !currentDashboard) return;
    try {
      setLoadingBidding(true);
      const data = await getBiddingRequests(token, page, 5, filter, sort);
      setBiddingData(data);
      
      const nextBidDrafts: Record<string, BidDraft> = {};
      for (const requestItem of data.data) {
        nextBidDrafts[requestItem.id] = buildBidDraft(currentDashboard, requestItem);
      }
      setBidDrafts((prev) => ({ ...prev, ...nextBidDrafts }));
    } catch (error) {
      console.error("Could not load bidding requests:", error);
    } finally {
      setLoadingBidding(false);
    }
  }, [token]);

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

    void loadDashboard();
  }, [loadDashboard, role, router, session, status]);

  useEffect(() => {
    if (dashboard) {
      void loadBiddingRequests(biddingPage, biddingFilter, biddingSort, dashboard);
    }
  }, [dashboard, biddingPage, biddingFilter, biddingSort, loadBiddingRequests]);

  useEffect(() => {
    if (dashboard && dashboard.shop.setupComplete && dashboard.shop.liveNotificationsPrompted === false) {
      setShowNotificationPrompt(true);
    }
  }, [dashboard]);

  async function handleNotificationPreference(enabled: boolean, fromPrompt = false) {
    if (!token) return;
    try {
      setIsUpdatingNotifications(true);
      await updateVendorNotificationPreferences(token, {
        liveNotificationsEnabled: enabled,
        ...(fromPrompt ? { liveNotificationsPrompted: true } : {})
      });
      
      if (fromPrompt) {
        setShowNotificationPrompt(false);
        setFlash({ type: "success", text: "Notification preferences saved." });
      } else {
        setFlash({ type: "success", text: enabled ? "Live notifications turned ON." : "Live notifications turned OFF." });
      }
      void loadDashboard();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to update notification settings." });
    } finally {
      setIsUpdatingNotifications(false);
    }
  }

  const activeRequestCount = dashboard?.stats.relevantRequestCount ?? 0;
  const totalOpenJobs = dashboard?.stats.assignedJobCount ?? 0;
  const waitingApprovalCount = dashboard?.stats.waitingApprovalCount ?? 0;
  const activeBidCount = dashboard?.stats.activeBidCount ?? 0;

  const summaryCards = useMemo(
    () => [
      {
        label: "Relevant requests",
        value: String(activeRequestCount),
        description: "Repair requests that match your current skill tags.",
        scrollTo: "relevant-requests",
      },
      {
        label: "Pending direct orders",
        value: String(dashboard?.stats.pendingOrderCount ?? 0),
        description: "Direct service requests waiting for your approval.",
        scrollTo: "pending-orders",
      },
      {
        label: "Active offers",
        value: String(activeBidCount),
        description: "Offers you can still update while customer decision is pending.",
        href: "/vendor/my-bids",
      },
      {
        label: "Waiting customer approval",
        value: String(waitingApprovalCount),
        description: "Final diagnosis and quote already submitted by you.",
        href: "/vendor/approvals",
      },
      {
        label: "Assigned jobs",
        value: String(totalOpenJobs),
        description: "Jobs currently being handled by your shop.",
        href: "/vendor/jobs",
      },
    ],
    [activeBidCount, activeRequestCount, totalOpenJobs, waitingApprovalCount, dashboard?.stats.pendingOrderCount]
  );

  function handleBidClick(requestId: string) {
    if (!token) {
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }

    const draft = bidDrafts[requestId];
    if (!draft) return;

    const partsCost = draft.parts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const laborCost = Number(draft.laborCost);

    if (partsCost < 0 || draft.parts.some((p) => Number(p.cost) < 0)) {
      setFlash({ type: "error", text: "Part costs cannot be negative." });
      return;
    }

    if (!Number.isFinite(laborCost) || laborCost < 0) {
      setFlash({ type: "error", text: "Enter a valid labor cost." });
      return;
    }

    const estimatedDays = draft.estimatedDays.trim()
      ? Number(draft.estimatedDays)
      : undefined;

    if (
      draft.estimatedDays.trim() &&
      (!Number.isInteger(estimatedDays) || Number(estimatedDays) < 0)
    ) {
      setFlash({ type: "error", text: "Estimated days must be a non-negative whole number." });
      return;
    }

    const totalOffer = partsCost + laborCost;

    // Build contextual message
    const requestItem = biddingData?.data.find((r) => r.id === requestId);
    const bidCount = requestItem?.bidCount ?? 0;
    const lowestBid = requestItem?.lowestBidAmount ?? null;

    let message: string;
    let variant: BidConfirmation["variant"];

    if (bidCount === 0 || (bidCount === 1 && requestItem?.myBid)) {
      // First offer (or only our own previous one)
      message = `🎉 This is the first offer on this request! Your offer of ${formatMoney(totalOffer)} will be the one to beat.`;
      variant = "info";
    } else if (lowestBid !== null && totalOffer <= lowestBid) {
      message = `🏆 Great price! Your offer of ${formatMoney(totalOffer)} is the lowest — the current best is ${formatMoney(lowestBid)}.`;
      variant = "success";
    } else {
      message = `⚠️ Your offer of ${formatMoney(totalOffer)} is higher than the current lowest of ${formatMoney(lowestBid)}. The customer may prefer a lower price.`;
      variant = "warning";
    }

    setBidConfirm({ requestId, totalOffer, message, variant });
  }

  async function handleBidConfirm() {
    if (!bidConfirm || !token) return;

    const { requestId } = bidConfirm;
    const draft = bidDrafts[requestId];
    if (!draft) return;

    const partsCost = draft.parts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
    const laborCost = Number(draft.laborCost);
    const estimatedDays = draft.estimatedDays.trim()
      ? Number(draft.estimatedDays)
      : undefined;

    setBidConfirm(null);

    try {
      setPendingKey(`bid:${requestId}`);
      await submitVendorBid(token, requestId, {
        partsCost,
        laborCost,
        estimatedDays,
        notes: draft.notes.trim() || undefined,
      });
      setFlash({ type: "success", text: "Offer saved successfully." });
      await loadDashboard();
      if (dashboard) void loadBiddingRequests(biddingPage, biddingFilter, biddingSort, dashboard);
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save your offer.",
      });
    }
  }

  async function handleDeclineExplicitRequest(requestId: string) {
    if (!token) return;

    if (!window.confirm("Are you sure you want to decline this request? The customer is explicitly waiting for your answer.")) {
      return;
    }

    try {
      setPendingKey(`decline-explicit:${requestId}`);
      // Using the dynamically imported declineExplicitRequest API function
      await (await import("@/lib/api")).declineExplicitRequest(token, requestId);
      setFlash({ type: "success", text: "Request declined successfully." });
      await loadDashboard();
      if (dashboard) void loadBiddingRequests(biddingPage, biddingFilter, biddingSort, dashboard);
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not decline request.",
      });
    }
  }

  async function handleJobStatusSubmit(jobId: string) {
    if (!token) {
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }

    const nextStatus = jobStatusDrafts[jobId];
    if (!nextStatus) {
      setFlash({ type: "error", text: "Choose a status first." });
      return;
    }

    let reason: string | undefined;
    if (nextStatus === "CANCELLED") {
      const input = window.prompt("Please provide a reason for cancelling this job (required for accountability):");
      if (!input || !input.trim()) {
        return; // Vendor cancelled the prompt or didn't provide a reason
      }
      reason = input.trim();
    }

    try {
      setPendingKey(`job:${jobId}`);
      await updateVendorJobStatus(token, jobId, nextStatus, reason);
      setFlash({ type: "success", text: "Assigned job status updated." });
      await loadDashboard();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not update the job status.",
      });
    }
  }

  async function handleFinalQuoteSubmit(jobId: string) {
    if (!token) {
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }

    const draft = finalQuoteDrafts[jobId];
    if (!draft) return;

    const items = draft.items
      .map((item) => ({
        label: item.label.trim(),
        description: item.description.trim() || undefined,
        amount: Number(item.amount),
      }))
      .filter((item) => item.label || item.description || !Number.isNaN(item.amount));

    if (!draft.diagnosisNotes.trim()) {
      setFlash({ type: "error", text: "Diagnosis notes are required before sending the final quote." });
      return;
    }

    if (!items.length) {
      setFlash({ type: "error", text: "Add at least one final quote item." });
      return;
    }

    if (items.some((item) => !item.label)) {
      setFlash({ type: "error", text: "Each quote item must have a label." });
      return;
    }

    if (items.some((item) => !Number.isFinite(item.amount) || item.amount < 0)) {
      setFlash({ type: "error", text: "Each quote item amount must be a valid non-negative number." });
      return;
    }

    try {
      setPendingKey(`quote:${jobId}`);
      await submitVendorFinalQuote(token, jobId, {
        diagnosisNotes: draft.diagnosisNotes.trim(),
        items,
      });
      setFlash({
        type: "success",
        text: "Final diagnosis and itemized quote sent to the customer for approval.",
      });
      await loadDashboard();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not submit the final quote.",
      });
    }
  }

  async function handleAcceptOrder(orderId: string) {
    if (!token) {
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }
    try {
      setPendingKey(`accept-order:${orderId}`);
      await acceptPendingOrder(token, orderId);
      setFlash({ type: "success", text: "Direct order accepted. The repair job is now active." });
      await loadDashboard();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not accept the order.",
      });
    }
  }

  async function handleRejectOrder(orderId: string) {
    if (!token) {
      setFlash({ type: "error", text: "Please sign in again to continue." });
      return;
    }
    const reason = window.prompt("Reason for declining this order (optional):");
    if (reason === null) return; // cancelled
    
    try {
      setPendingKey(`reject-order:${orderId}`);
      await rejectPendingOrder(token, orderId, reason);
      setFlash({ type: "success", text: "Order declined. Any upfront payments will be refunded." });
      await loadDashboard();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not decline the order.",
      });
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#E4FCD5]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-6xl px-3 py-8 md:px-4 text-[#173726]">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-48 rounded-full bg-[#d3ecc8]" />
            <div className="h-8 w-64 rounded-full bg-[#d3ecc8]" />
          </div>
        </div>
      </main>
    );
  }

  if (!session?.user || role !== "VENDOR") {
    return null;
  }

  if (!dashboard) {
    return (
      <main className="min-h-screen bg-[#E4FCD5]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-4xl px-3 py-8 md:px-4">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor</p>
            <h1 className="mt-2 text-2xl font-bold text-[#173726] md:text-3xl">Vendor dashboard unavailable</h1>
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {flash?.text || "We could not load your vendor workspace right now."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/vendor/setup-shop"
                className="w-full rounded-full bg-[#214c34] px-6 py-3 text-center text-sm font-semibold text-white md:w-auto"
              >
                Complete shop setup
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor dashboard</p>
            <h1 className="mt-1 text-xl font-bold text-[#173726] md:mt-2 md:text-3xl">{dashboard.shop.name}</h1>
            <p className="mt-1 text-xs text-[#5b7262] md:mt-2 md:text-sm">
              Review relevant requests, manage bids, handle assigned repair jobs, and send final diagnosis and quote.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-3">
            <Link
              href="/vendor/analytics"
              className="flex-1 rounded-full border border-[#214c34] bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#214c34] md:flex-none md:px-5 md:py-3"
            >
              View analytics
            </Link>
            <Link
              href="/vendor/setup-shop"
              className="flex-1 rounded-full border border-[#214c34] bg-white px-4 py-2.5 text-center text-sm font-semibold text-[#214c34] md:flex-none md:px-5 md:py-3"
            >
              Edit shop setup
            </Link>
            <Link
              href="/vendor/shop-profile"
              className="flex-1 rounded-full border border-[#214c34] bg-[#214c34] px-4 py-2.5 text-center text-sm font-semibold text-white md:flex-none md:px-5 md:py-3"
            >
              Manage Services & Parts
            </Link>
          </div>
        </div>

        {flash ? (
          <div
            className={`mt-6 rounded-3xl px-5 py-4 text-sm ${
              flash.type === "success"
                ? "border border-green-200 bg-green-50 text-green-800"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {flash.text}
          </div>
        ) : null}

        <section className="mt-4 grid gap-3 grid-cols-2 md:mt-6 md:gap-4 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const inner = (
              <>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6b8270] md:text-xs">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-[#173726] md:mt-3 md:text-4xl">{card.value}</p>
                <p className="mt-1 text-[10px] text-[#5b7262] md:mt-2 md:text-sm">{card.description}</p>
                <p className="mt-3 text-xs font-semibold text-[#214c34]">
                  {card.scrollTo ? "Scroll to section ↓" : "View details →"}
                </p>
              </>
            );

            const cardStyle =
              "block rounded-[1.25rem] bg-white p-4 shadow-sm cursor-pointer md:rounded-[2rem] md:p-6 " +
              "transition-all duration-300 ease-out " +
              "hover:shadow-lg hover:shadow-[#214c34]/10 hover:-translate-y-1 " +
              "hover:ring-2 hover:ring-[#cfe0c6] " +
              "active:translate-y-0 active:shadow-md";

            if (card.href) {
              return (
                <Link key={card.label} href={card.href} className={cardStyle}>
                  {inner}
                </Link>
              );
            }

            return (
              <button
                key={card.label}
                type="button"
                onClick={() => {
                  if (card.scrollTo) {
                    document.getElementById(card.scrollTo)?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                className={cardStyle + " text-left w-full"}
              >
                {inner}
              </button>
            );
          })}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[1.5rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Shop setup</p>
                <h2 className="mt-2 text-2xl font-bold text-[#173726]">Your vendor profile</h2>
              </div>
              <span className="rounded-full bg-[#dff0dc] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                {dashboard.shop.setupComplete ? "Setup complete" : "Setup incomplete"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                <p className="font-semibold text-[#173726]">Services</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dashboard.shop.categories.length ? (
                    dashboard.shop.categories.map((value) => (
                      <span
                        key={value}
                        className="rounded-full border border-[#cfe0c6] bg-white px-3 py-1 text-xs font-semibold capitalize text-[#214c34]"
                      >
                        {formatStatus(value).toLowerCase()}
                      </span>
                    ))
                  ) : (
                    <p className="mt-2 text-[#5b7262]">No services configured</p>
                  )}
                </div>
              </div>
              <div className="rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541]">
                <p className="font-semibold text-[#173726]">Base pricing</p>
                <p className="mt-2">Inspection: {formatMoney(dashboard.shop.inspectionFee)}</p>
                <p>Labor: {formatMoney(dashboard.shop.baseLaborFee)}</p>
                <p>Pickup: {formatMoney(dashboard.shop.pickupFee)}</p>
              </div>
            </div>
          </article>

          <article className="rounded-[1.5rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Skill tags</p>
            <h2 className="mt-2 text-2xl font-bold text-[#173726]">Request matching</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {dashboard.shop.specialties.length ? (
                dashboard.shop.specialties.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#eef5ea] px-4 py-2 text-sm font-medium text-[#214c34]"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <p className="text-sm text-[#5b7262]">No specialties configured yet.</p>
              )}
            </div>
          </article>
        </section>

        {dashboard.pendingOrders?.length > 0 && (
          <section id="pending-orders" className="mt-6 scroll-mt-6 md:mt-8">
            <div className="mb-3 md:mb-4">
              <h2 className="text-xl font-bold text-[#173726] md:text-2xl">Pending direct orders</h2>
              <p className="text-sm text-[#5b7262]">Customers have directly chosen your shop and paid upfront. Accept to begin work, or decline to refund them.</p>
            </div>
            <div className="space-y-4">
              {dashboard.pendingOrders.map(order => {
                const isAccepting = pendingKey === `accept-order:${order.id}`;
                const isRejecting = pendingKey === `reject-order:${order.id}`;
                
                return (
                  <article key={order.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm border border-purple-100 md:rounded-[2rem] md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-[#173726] md:text-xl">{order.title}</h3>
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800">
                            Action required
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-[#355541]">
                          {order.deviceType} {order.brand ? `• ${order.brand}` : ""} {order.model ? `• ${order.model}` : ""}
                        </p>
                        <p className="mt-2 text-sm text-[#5b7262]">{order.problem}</p>
                        
                        <AiSummary 
                          orderId={order.id}
                          deviceType={order.deviceType}
                          brand={order.brand}
                          model={order.model}
                          issueCategory={order.issueCategory}
                          problem={order.problem}
                          initialSummary={order.aiSummary}
                        />
                        
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => handleAcceptOrder(order.id)}
                            disabled={isAccepting || isRejecting}
                            className="rounded-full bg-[#214c34] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {isAccepting ? "Accepting..." : "Accept order"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectOrder(order.id)}
                            disabled={isAccepting || isRejecting}
                            className="rounded-full border border-red-200 bg-red-50 text-red-700 px-6 py-2 text-sm font-semibold disabled:opacity-50"
                          >
                            {isRejecting ? "Declining..." : "Decline order"}
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid gap-3 rounded-2xl bg-purple-50 p-4 text-sm text-[#355541] lg:min-w-[280px]">
                        <div>
                          <p className="font-semibold text-[#173726]">Customer details</p>
                          <p className="mt-1">{order.user.name}</p>
                          <p>{order.user.phone}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-[#173726]">Payment info</p>
                          <p className="mt-1">Initial total: {formatMoney(order.quotedFinalAmount)}</p>
                          <p>Status: {formatStatus(order.payments?.[0]?.status || "PENDING")}</p>
                          <p>Method: {order.payments?.[0]?.method || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        <section id="relevant-requests" className="mt-6 scroll-mt-6 md:mt-8">
          <div className="mb-3 flex flex-col gap-2 md:mb-4 md:flex-row md:items-center md:justify-between md:gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#173726] md:text-2xl">Repair requests</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={biddingFilter}
                  onChange={(e) => {
                    setBiddingPage(1);
                    setBiddingFilter(e.target.value);
                  }}
                  className="rounded-full border border-[#cfe0c6] bg-white px-3 py-1 text-sm outline-none font-medium text-[#214c34]"
                >
                  <option value="all">All Requests</option>
                  <option value="relevant">Relevant to My Skills</option>
                </select>
                <select
                  value={biddingSort}
                  onChange={(e) => {
                    setBiddingPage(1);
                    setBiddingSort(e.target.value);
                  }}
                  className="rounded-full border border-[#cfe0c6] bg-white px-3 py-1 text-sm outline-none font-medium text-[#214c34]"
                >
                  <option value="desc">Newest First</option>
                  <option value="asc">Oldest First</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-full border border-[#cfe0c6]">
                <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                  <input 
                    type="checkbox" 
                    className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer"
                    style={{
                      top: "2px",
                      left: dashboard.shop.liveNotificationsEnabled ? "18px" : "2px",
                      transition: "all 0.3s",
                      borderColor: dashboard.shop.liveNotificationsEnabled ? "#214c34" : "#cbd5e1"
                    }}
                    checked={!!dashboard.shop.liveNotificationsEnabled}
                    onChange={(e) => handleNotificationPreference(e.target.checked)}
                    disabled={isUpdatingNotifications}
                  />
                  <div 
                    className="toggle-label block overflow-hidden h-6 rounded-full cursor-pointer"
                    style={{
                      backgroundColor: dashboard.shop.liveNotificationsEnabled ? "#dff0dc" : "#e2e8f0",
                      transition: "all 0.3s"
                    }}
                  />
                </div>
                <span className="text-sm font-semibold text-[#173726] whitespace-nowrap">
                  Live Notifications
                </span>
              </label>
              <button
                type="button"
                onClick={() => void loadBiddingRequests(biddingPage, biddingFilter, biddingSort, dashboard)}
                disabled={loadingBidding}
                className="w-full rounded-full border border-[#214c34] bg-white px-5 py-2.5 text-sm font-semibold text-[#214c34] sm:w-auto md:py-3 disabled:opacity-50"
              >
                {loadingBidding ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="space-y-5 relative">
            {loadingBidding && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-[2rem]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#214c34] border-t-transparent" />
              </div>
            )}
            {biddingData?.data.map((requestItem) => {
              const draft = bidDrafts[requestItem.id] || buildBidDraft(dashboard, requestItem);
              const isSubmitting = pendingKey === `bid:${requestItem.id}`;
              const partsTotal = draft.parts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
              const totalPreview = partsTotal + (Number(draft.laborCost) || 0);

              return (
                <article key={requestItem.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-bold text-[#173726] md:text-2xl">{requestItem.title}</h3>
                        <span className="rounded-full bg-[#dff0dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                          {formatStatus(requestItem.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#355541]">
                        {requestItem.deviceType}
                        {requestItem.brand ? ` • ${requestItem.brand}` : ""}
                        {requestItem.model ? ` • ${requestItem.model}` : ""}
                        {requestItem.issueCategory ? ` • ${requestItem.issueCategory}` : ""}
                      </p>
                      <p className="mt-3 text-sm text-[#5b7262]">{requestItem.problem}</p>
                      
                      <AiSummary 
                        orderId={requestItem.id}
                        deviceType={requestItem.deviceType}
                        brand={requestItem.brand}
                        model={requestItem.model}
                        issueCategory={requestItem.issueCategory}
                        problem={requestItem.problem}
                        initialSummary={requestItem.aiSummary}
                      />

                      <div className="mt-4 flex flex-wrap gap-2">
                        {requestItem.matchReasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full border border-[#cfe0c6] bg-[#f6faf4] px-3 py-1 text-xs font-medium text-[#355541]"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541] xl:min-w-[260px]">
                      <div>
                        <p className="font-semibold text-[#173726]">Request details</p>
                        <p className="mt-2">Flow: {formatStatus(requestItem.mode)}</p>
                        <p>Pickup preferred: {requestItem.preferredPickup ? "Yes" : "No"}</p>
                        <p>Delivery: {requestItem.deliveryType ? formatStatus(requestItem.deliveryType) : "—"}</p>
                        <p>Existing bids: {requestItem.bidCount}</p>
                        <p>Created: {formatDate(requestItem.createdAt)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#173726]">Your match score</p>
                        <p className="mt-2">{requestItem.relevanceScore}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-[#f6faf4] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Bid workspace</p>
                        <h4 className="mt-1 text-xl font-bold text-[#173726]">
                          {requestItem.myBid ? "Update your offer" : "Make your offer"}
                        </h4>
                      </div>
                      {requestItem.myBid ? (
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                          Current bid {formatStatus(requestItem.myBid.status)}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-3">
                      {/* Parts list */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-[#355541]">Parts / Components</span>
                          <span className="text-sm font-semibold text-[#214c34]">
                            Subtotal: {formatMoney(partsTotal)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {draft.parts.map((part, partIndex) => (
                            <div key={partIndex} className="flex flex-wrap items-center gap-2">
                              {/* + button to insert row below */}
                              <button
                                type="button"
                                title="Add part below"
                                onClick={() => {
                                  const newParts = [...draft.parts];
                                  newParts.splice(partIndex + 1, 0, { name: "", cost: "" });
                                  setBidDrafts((prev) => ({
                                    ...prev,
                                    [requestItem.id]: { ...draft, parts: newParts },
                                  }));
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#214c34] text-white text-lg leading-none hover:bg-[#173726] transition-colors"
                              >
                                +
                              </button>

                              {/* Part name */}
                              <input
                                type="text"
                                value={part.name}
                                onChange={(e) => {
                                  const newParts = [...draft.parts];
                                  newParts[partIndex] = { ...part, name: e.target.value };
                                  setBidDrafts((prev) => ({
                                    ...prev,
                                    [requestItem.id]: { ...draft, parts: newParts },
                                  }));
                                }}
                                className="flex-1 rounded-2xl border border-[#cfe0c6] bg-white px-4 py-2.5 text-sm outline-none"
                                placeholder={`Part ${partIndex + 1} name`}
                              />

                              {/* Part cost */}
                              <div className="relative w-32">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5b7262]">৳</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={part.cost}
                                  onChange={(e) => {
                                    const newParts = [...draft.parts];
                                    newParts[partIndex] = { ...part, cost: e.target.value };
                                    setBidDrafts((prev) => ({
                                      ...prev,
                                      [requestItem.id]: { ...draft, parts: newParts },
                                    }));
                                  }}
                                  className="w-full rounded-2xl border border-[#cfe0c6] bg-white py-2.5 pl-7 pr-3 text-sm outline-none"
                                  placeholder="Cost"
                                />
                              </div>

                              {/* × remove button (only if more than 1 row) */}
                              {draft.parts.length > 1 ? (
                                <button
                                  type="button"
                                  title="Remove part"
                                  onClick={() => {
                                    const newParts = draft.parts.filter((_, i) => i !== partIndex);
                                    setBidDrafts((prev) => ({
                                      ...prev,
                                      [requestItem.id]: { ...draft, parts: newParts },
                                    }));
                                  }}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#5b7262] hover:bg-red-50 hover:text-red-500 transition-colors"
                                >
                                  ×
                                </button>
                              ) : (
                                <div className="w-7 shrink-0" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Labor + Estimated days + Total row */}
                      <div className="grid gap-3 md:gap-4 lg:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[#355541]">Labor cost</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.laborCost}
                            onChange={(event) =>
                              setBidDrafts((prev) => ({
                                ...prev,
                                [requestItem.id]: {
                                  ...draft,
                                  laborCost: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-[#cfe0c6] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="0"
                          />
                        </label>

                        <label className="block">
                          <span className="mb-2 block text-sm font-medium text-[#355541]">Estimated days</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={draft.estimatedDays}
                            onChange={(event) =>
                              setBidDrafts((prev) => ({
                                ...prev,
                                [requestItem.id]: {
                                  ...draft,
                                  estimatedDays: event.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-2xl border border-[#cfe0c6] bg-white px-4 py-3 text-sm outline-none"
                            placeholder="Optional"
                          />
                        </label>

                        <div className="rounded-2xl border border-dashed border-[#cfe0c6] bg-white px-4 py-3 text-sm text-[#355541]">
                          <p className="font-semibold text-[#173726]">Your offer</p>
                          <p className="mt-2 text-2xl font-bold text-[#214c34]">{formatMoney(totalPreview)}</p>
                        </div>
                      </div>
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-[#355541]">Bid notes</span>
                      <textarea
                        rows={3}
                        value={draft.notes}
                        onChange={(event) =>
                          setBidDrafts((prev) => ({
                            ...prev,
                            [requestItem.id]: {
                              ...draft,
                              notes: event.target.value,
                            },
                          }))
                        }
                        className="w-full rounded-2xl border border-[#cfe0c6] bg-white px-4 py-3 text-sm outline-none"
                        placeholder="Mention warranty, likely turnaround, or key conditions."
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#5b7262]">
                        {requestItem.myBid
                          ? `Last updated ${formatDate(requestItem.myBid.updatedAt)}`
                          : "You can revise your bid anytime while the request stays in bidding."}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        {requestItem.isExplicitlyRequested && !requestItem.myBid && (
                          <button
                            type="button"
                            onClick={() => handleDeclineExplicitRequest(requestItem.id)}
                            disabled={isSubmitting || pendingKey === `decline-explicit:${requestItem.id}`}
                            className="rounded-full border border-red-200 bg-white px-6 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {pendingKey === `decline-explicit:${requestItem.id}` ? "Declining..." : "Decline request"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleBidClick(requestItem.id)}
                          disabled={isSubmitting}
                          className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isSubmitting
                            ? "Saving..."
                            : requestItem.myBid
                              ? "Update offer"
                              : "Make offer"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}

            {(!biddingData?.data || !biddingData.data.length) ? (
              <div className="rounded-[1.5rem] bg-white p-5 text-sm text-[#355541] shadow-sm md:rounded-[2rem] md:p-8">
                No repair requests currently match your filters.
              </div>
            ) : null}

            {biddingData && biddingData.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={biddingPage === 1 || loadingBidding}
                  onClick={() => setBiddingPage(biddingPage - 1)}
                  className="rounded-full border border-[#cfe0c6] bg-white px-4 py-2 text-sm font-semibold text-[#214c34] disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-medium text-[#355541]">
                  Page {biddingPage} of {biddingData.totalPages}
                </span>
                <button
                  type="button"
                  disabled={biddingPage === biddingData.totalPages || loadingBidding}
                  onClick={() => setBiddingPage(biddingPage + 1)}
                  className="rounded-full border border-[#cfe0c6] bg-white px-4 py-2 text-sm font-semibold text-[#214c34] disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-[#173726] md:text-2xl">Assigned jobs and final quote</h2>
          </div>

          <div className="space-y-5">
            {dashboard.assignedJobs.map((job) => {
              const statusDraft = jobStatusDrafts[job.id] || job.status;
              const quoteDraft = finalQuoteDrafts[job.id] || buildFinalQuoteDraft(dashboard, job);
              const quoteTotal = quoteDraft.items.reduce((sum, item) => {
                const amount = Number(item.amount);
                return sum + (Number.isFinite(amount) ? amount : 0);
              }, 0);
              const isStatusSaving = pendingKey === `job:${job.id}`;
              const isQuoteSaving = pendingKey === `quote:${job.id}`;
              const waitingForApproval = job.status === "WAITING_APPROVAL";

              return (
                <article key={job.id} className="rounded-[1.5rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-bold text-[#173726] md:text-2xl">{job.repairRequest.title}</h3>
                        <span className="rounded-full bg-[#dff0dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                          {formatStatus(job.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-[#355541]">
                        {job.repairRequest.deviceType}
                        {job.repairRequest.brand ? ` • ${job.repairRequest.brand}` : ""}
                        {job.repairRequest.model ? ` • ${job.repairRequest.model}` : ""}
                        {job.repairRequest.issueCategory ? ` • ${job.repairRequest.issueCategory}` : ""}
                      </p>
                      <p className="mt-3 text-sm text-[#5b7262]">{job.repairRequest.problem}</p>
                      
                      <AiSummary 
                        orderId={job.repairRequest.id}
                        deviceType={job.repairRequest.deviceType}
                        brand={job.repairRequest.brand}
                        model={job.repairRequest.model}
                        issueCategory={job.repairRequest.issueCategory}
                        problem={job.repairRequest.problem}
                        initialSummary={job.repairRequest.aiSummary}
                      />
                    </div>

                    <div className="grid gap-3 rounded-3xl bg-[#f6faf4] p-5 text-sm text-[#355541] xl:min-w-[280px]">
                      <div>
                        <p className="font-semibold text-[#173726]">Accepted bid</p>
                        <p className="mt-2">Parts: {formatMoney(job.acceptedBid?.partsCost)}</p>
                        <p>Labor: {formatMoney(job.acceptedBid?.laborCost)}</p>
                        <p>Total: {formatMoney(job.acceptedBid?.totalCost)}</p>
                        <p>
                          ETA: {typeof job.acceptedBid?.estimatedDays === "number" ? `${job.acceptedBid.estimatedDays} day(s)` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold text-[#173726]">Current final quote</p>
                        <p className="mt-2">{formatMoney(job.finalQuotedAmount)}</p>
                        <p>
                          Customer approval: {job.customerApproved === null ? "Pending" : job.customerApproved ? "Approved" : "Declined"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                    <section className="rounded-3xl bg-[#f6faf4] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Job progress</p>
                          <h4 className="mt-1 text-xl font-bold text-[#173726]">Manage assigned job</h4>
                        </div>
                        {waitingForApproval ? (
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                            Waiting for customer decision
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-[#355541]">
                        <p>Request status: {formatStatus(job.repairRequest.status)}</p>
                        <p>Created: {formatDate(job.createdAt)}</p>
                        <p>Updated: {formatDate(job.updatedAt)}</p>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 md:flex-row">
                        <select
                          value={statusDraft}
                          onChange={(event) =>
                            setJobStatusDrafts((prev) => ({
                              ...prev,
                              [job.id]: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-[#cfe0c6] bg-white px-4 py-3 text-sm outline-none"
                        >
                          {VENDOR_JOB_STATUSES.map((statusOption) => (
                            <option
                              key={statusOption}
                              value={statusOption}
                              disabled={
                                statusOption === "REPAIRING" &&
                                job.finalQuotedAmount != null &&
                                job.customerApproved !== true
                              }
                            >
                              {formatStatus(statusOption)}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleJobStatusSubmit(job.id)}
                          disabled={isStatusSaving}
                          className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isStatusSaving ? "Saving..." : "Update job status"}
                        </button>
                      </div>
                    </section>

                    <section className="rounded-3xl bg-[#f6faf4] p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Final diagnosis</p>
                          <h4 className="mt-1 text-xl font-bold text-[#173726]">Send itemized final quote</h4>
                        </div>
                        <div className="rounded-2xl border border-dashed border-[#cfe0c6] bg-white px-4 py-3 text-sm text-[#355541]">
                          <p className="font-semibold text-[#173726]">Quote total</p>
                          <p className="mt-1 text-2xl font-bold text-[#214c34]">{formatMoney(quoteTotal)}</p>
                        </div>
                      </div>

                      <label className="mt-4 block">
                        <span className="mb-2 block text-sm font-medium text-[#355541]">Diagnosis notes</span>
                        <textarea
                          rows={4}
                          value={quoteDraft.diagnosisNotes}
                          onChange={(event) =>
                            setFinalQuoteDrafts((prev) => ({
                              ...prev,
                              [job.id]: {
                                ...quoteDraft,
                                diagnosisNotes: event.target.value,
                              },
                            }))
                          }
                          className="w-full rounded-2xl border border-[#cfe0c6] bg-white px-4 py-3 text-sm outline-none"
                          placeholder="Write your inspection findings, root cause, and recommended work."
                        />
                      </label>

                      <div className="mt-4 space-y-3">
                        {quoteDraft.items.map((item, index) => (
                          <div key={`${job.id}-${index}`} className="rounded-2xl border border-[#d9e5d5] bg-white p-4">
                            <div className="grid gap-3 md:grid-cols-[1fr_1.3fr_0.7fr_auto] md:items-start">
                              <input
                                value={item.label}
                                onChange={(event) =>
                                  setFinalQuoteDrafts((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...quoteDraft,
                                      items: quoteDraft.items.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, label: event.target.value }
                                          : row
                                      ),
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-[#cfe0c6] px-4 py-3 text-sm outline-none"
                                placeholder="Item label"
                              />
                              <input
                                value={item.description}
                                onChange={(event) =>
                                  setFinalQuoteDrafts((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...quoteDraft,
                                      items: quoteDraft.items.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, description: event.target.value }
                                          : row
                                      ),
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-[#cfe0c6] px-4 py-3 text-sm outline-none"
                                placeholder="Description"
                              />
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.amount}
                                onChange={(event) =>
                                  setFinalQuoteDrafts((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...quoteDraft,
                                      items: quoteDraft.items.map((row, rowIndex) =>
                                        rowIndex === index
                                          ? { ...row, amount: event.target.value }
                                          : row
                                      ),
                                    },
                                  }))
                                }
                                className="rounded-2xl border border-[#cfe0c6] px-4 py-3 text-sm outline-none"
                                placeholder="Amount"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFinalQuoteDrafts((prev) => ({
                                    ...prev,
                                    [job.id]: {
                                      ...quoteDraft,
                                      items:
                                        quoteDraft.items.length > 1
                                          ? quoteDraft.items.filter((_, rowIndex) => rowIndex !== index)
                                          : [{ label: "", description: "", amount: "" }],
                                    },
                                  }))
                                }
                                className="rounded-full border border-[#214c34] px-4 py-3 text-sm font-semibold text-[#214c34]"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setFinalQuoteDrafts((prev) => ({
                              ...prev,
                              [job.id]: {
                                ...quoteDraft,
                                items: [
                                  ...quoteDraft.items,
                                  { label: "", description: "", amount: "" },
                                ],
                              },
                            }))
                          }
                          className="rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
                        >
                          Add line item
                        </button>

                        {canShowFinalQuoteForm(job) ? (
                          <button
                            type="button"
                            onClick={() => void handleFinalQuoteSubmit(job.id)}
                            disabled={isQuoteSaving}
                            className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isQuoteSaving ? "Sending..." : waitingForApproval ? "Update final quote" : "Submit final quote"}
                          </button>
                        ) : null}
                      </div>
                    </section>
                  </div>
                </article>
              );
            })}

            {!dashboard.assignedJobs.length ? (
              <div className="rounded-[1.5rem] bg-white p-5 text-sm text-[#355541] shadow-sm md:rounded-[2rem] md:p-8">
                No assigned jobs yet. Once a customer accepts one of your bids, the job will appear here for inspection, diagnosis, and final quote handling.
              </div>
            ) : null}
          </div>
        </section>
      </div>
      {/* ── Bid Confirmation Modal ─────────────────────────────── */}
      {bidConfirm ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setBidConfirm(null)}
        >
          <div
            className="mx-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[#173726]">Confirm your offer</h3>

            <div
              className={`mt-4 rounded-2xl p-4 text-sm leading-relaxed ${
                bidConfirm.variant === "warning"
                  ? "border border-amber-200 bg-amber-50 text-amber-800"
                  : bidConfirm.variant === "success"
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              {bidConfirm.message}
            </div>

            <p className="mt-4 text-center text-2xl font-bold text-[#214c34]">
              {formatMoney(bidConfirm.totalOffer)}
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setBidConfirm(null)}
                className="flex-1 rounded-full border border-[#cfe0c6] px-5 py-3 text-sm font-semibold text-[#355541] hover:bg-[#f6faf4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBidConfirm()}
                className="flex-1 rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white hover:bg-[#173726] transition-colors"
              >
                Confirm offer
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Notification Prompt Modal ─────────────────────────────── */}
      {showNotificationPrompt ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4 transition-opacity"
          onClick={() => setShowNotificationPrompt(false)}
        >
          <div
            className="w-full max-w-sm rounded-t-[2rem] bg-white p-6 shadow-2xl sm:rounded-[2rem] md:p-8 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#dff0dc] text-3xl">
              🔔
            </div>
            <h3 className="text-xl font-bold text-[#173726] md:text-2xl">Enable live notifications?</h3>
            <p className="mt-3 text-sm leading-relaxed text-[#5b7262]">
              Do you want to receive instant emails and SMS alerts when a new repair request matches your skills? You can change this later.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <button
                type="button"
                disabled={isUpdatingNotifications}
                onClick={() => handleNotificationPreference(true, true)}
                className="w-full rounded-full bg-[#214c34] px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#173726] disabled:opacity-50"
              >
                {isUpdatingNotifications ? "Saving..." : "Yes, turn them on"}
              </button>
              <button
                type="button"
                disabled={isUpdatingNotifications}
                onClick={() => handleNotificationPreference(false, true)}
                className="w-full rounded-full border border-[#cfe0c6] bg-transparent px-5 py-3.5 text-sm font-semibold text-[#355541] transition-colors hover:bg-[#f6faf4] disabled:opacity-50"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
