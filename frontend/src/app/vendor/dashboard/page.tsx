"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  getVendorDashboard,
  submitVendorBid,
  submitVendorFinalQuote,
  updateVendorJobStatus,
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
  requestItem: VendorDashboardData["relevantRequests"][number]
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

      const nextBidDrafts: Record<string, BidDraft> = {};
      for (const requestItem of data.relevantRequests) {
        nextBidDrafts[requestItem.id] = buildBidDraft(data, requestItem);
      }
      setBidDrafts(nextBidDrafts);

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
      },
      {
        label: "Active bids",
        value: String(activeBidCount),
        description: "Bids you can still update while customer decision is pending.",
      },
      {
        label: "Assigned jobs",
        value: String(totalOpenJobs),
        description: "Jobs currently being handled by your shop.",
      },
      {
        label: "Waiting customer approval",
        value: String(waitingApprovalCount),
        description: "Final diagnosis and quote already submitted by you.",
      },
    ],
    [activeBidCount, activeRequestCount, totalOpenJobs, waitingApprovalCount]
  );

  async function handleBidSubmit(requestId: string) {
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

    try {
      setPendingKey(`bid:${requestId}`);
      await submitVendorBid(token, requestId, {
        partsCost,
        laborCost,
        estimatedDays,
        notes: draft.notes.trim() || undefined,
      });
      setFlash({ type: "success", text: "Bid saved successfully." });
      await loadDashboard();
    } catch (error) {
      setPendingKey(null);
      setFlash({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save your bid.",
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

    try {
      setPendingKey(`job:${jobId}`);
      await updateVendorJobStatus(token, jobId, nextStatus);
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

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#E4FCD5]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="mx-auto max-w-6xl px-4 py-10 text-[#173726]">Loading vendor dashboard...</div>
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
        <div className="mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-[2rem] bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor</p>
            <h1 className="mt-2 text-3xl font-bold text-[#173726]">Vendor dashboard unavailable</h1>
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {flash?.text || "We could not load your vendor workspace right now."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/vendor/setup-shop"
                className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
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

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-[#173726]">{dashboard.shop.name}</h1>
            <p className="mt-2 text-sm text-[#5b7262]">
              Review relevant requests, manage bids, handle assigned repair jobs, and send final diagnosis and quote.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/vendor/analytics"
              className="rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
            >
              View analytics
            </Link>
            <Link
              href="/vendor/setup-shop"
              className="rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
            >
              Edit shop setup
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

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="rounded-[2rem] bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">{card.label}</p>
              <p className="mt-3 text-4xl font-bold text-[#173726]">{card.value}</p>
              <p className="mt-2 text-sm text-[#5b7262]">{card.description}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-[2rem] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
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

          <article className="rounded-[2rem] bg-white p-6 shadow-sm">
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

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#173726]">Relevant repair requests</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard()}
              className="rounded-full border border-[#214c34] bg-white px-5 py-3 text-sm font-semibold text-[#214c34]"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-5">
            {dashboard.relevantRequests.map((requestItem) => {
              const draft = bidDrafts[requestItem.id] || buildBidDraft(dashboard, requestItem);
              const isSubmitting = pendingKey === `bid:${requestItem.id}`;
              const partsTotal = draft.parts.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
              const totalPreview = partsTotal + (Number(draft.laborCost) || 0);

              return (
                <article key={requestItem.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold text-[#173726]">{requestItem.title}</h3>
                        <span className="rounded-full bg-[#dff0dc] px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                          {formatStatus(requestItem.status)}
                        </span>
                      </div>
                      <p className="mt-2 text-[#355541]">
                        {requestItem.deviceType}
                        {requestItem.brand ? ` • ${requestItem.brand}` : ""}
                        {requestItem.model ? ` • ${requestItem.model}` : ""}
                        {requestItem.issueCategory ? ` • ${requestItem.issueCategory}` : ""}
                      </p>
                      <p className="mt-3 text-sm text-[#5b7262]">{requestItem.problem}</p>

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
                          {requestItem.myBid ? "Update your bid" : "Place your bid"}
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
                            <div key={partIndex} className="flex items-center gap-2">
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
                      <div className="grid gap-4 lg:grid-cols-3">
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
                          <p className="font-semibold text-[#173726]">Bid total</p>
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
                      <button
                        type="button"
                        onClick={() => void handleBidSubmit(requestItem.id)}
                        disabled={isSubmitting}
                        className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSubmitting
                          ? "Saving..."
                          : requestItem.myBid
                            ? "Update bid"
                            : "Place bid"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}

            {!dashboard.relevantRequests.length ? (
              <div className="rounded-[2rem] bg-white p-8 text-[#355541] shadow-sm">
                No repair requests currently match your configured skill tags. Update your specialties if you want to broaden what you see.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-[#173726]">Assigned jobs and final quote</h2>
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
                <article key={job.id} className="rounded-[2rem] bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-3xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-2xl font-bold text-[#173726]">{job.repairRequest.title}</h3>
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
              <div className="rounded-[2rem] bg-white p-8 text-[#355541] shadow-sm">
                No assigned jobs yet. Once a customer accepts one of your bids, the job will appear here for inspection, diagnosis, and final quote handling.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Bid history</p>
            <h2 className="text-2xl font-bold text-[#173726]">My bids</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {dashboard.myBids.map((bid) => (
              <article key={bid.id} className="rounded-[2rem] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-[#173726]">{bid.repairRequest?.title || "Repair request"}</h3>
                  <span className="rounded-full bg-[#eef5ea] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#214c34]">
                    {formatStatus(bid.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#355541]">
                  {bid.repairRequest?.deviceType}
                  {bid.repairRequest?.brand ? ` • ${bid.repairRequest.brand}` : ""}
                  {bid.repairRequest?.model ? ` • ${bid.repairRequest.model}` : ""}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#5b7262]">
                  Updated {formatDate(bid.updatedAt)}
                  {typeof bid.estimatedDays === "number" ? ` • ETA ${bid.estimatedDays} day(s)` : ""}
                </p>
              </article>
            ))}

            {!dashboard.myBids.length ? (
              <div className="rounded-[2rem] bg-white p-8 text-[#355541] shadow-sm">
                You have not placed any bids yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
