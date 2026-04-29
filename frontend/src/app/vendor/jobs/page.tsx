"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  getVendorDashboard,
  submitVendorFinalQuote,
  updateVendorJobStatus,
  type FinalQuoteItem,
  type VendorDashboardData,
} from "@/lib/api";

/* ─── types ─────────────────────────────────────────────────────────── */

type QuoteRowDraft = { label: string; description: string; amount: string };
type FinalQuoteDraft = { diagnosisNotes: string; items: QuoteRowDraft[] };
type FlashMessage = { type: "success" | "error"; text: string };

const JOB_STATUSES = ["AT_SHOP", "DIAGNOSING", "REPAIRING", "COMPLETED", "CANCELLED"] as const;

/* ─── helpers ───────────────────────────────────────────────────────── */

function formatMoney(v?: number | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(v);
}

function formatDate(v?: string | Date | null) {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
}

function fmt(s?: string | null) {
  return (s || "UNKNOWN").replaceAll("_", " ");
}

function getQuoteRows(items?: FinalQuoteItem[] | null): QuoteRowDraft[] {
  if (!Array.isArray(items) || !items.length) return [{ label: "", description: "", amount: "" }];
  return items.map((i) => ({
    label: i.label || "",
    description: i.description || "",
    amount: typeof i.amount === "number" && Number.isFinite(i.amount) ? String(i.amount) : "",
  }));
}

function buildQuoteDraft(
  dashboard: VendorDashboardData,
  job: VendorDashboardData["assignedJobs"][number]
): FinalQuoteDraft {
  const rows = getQuoteRows(job.finalQuoteItems);
  if (!rows.length || (rows.length === 1 && !rows[0].label && !rows[0].amount)) {
    const seed: QuoteRowDraft[] = [];
    if (typeof job.acceptedBid?.partsCost === "number")
      seed.push({ label: "Parts", description: "Replacement parts and components", amount: String(job.acceptedBid.partsCost) });
    if (typeof job.acceptedBid?.laborCost === "number")
      seed.push({ label: "Labor", description: "Repair labor charges", amount: String(job.acceptedBid.laborCost) });
    if (typeof dashboard.shop.inspectionFee === "number")
      seed.push({ label: "Inspection", description: "Device inspection fee", amount: String(dashboard.shop.inspectionFee) });
    if (!seed.length) seed.push({ label: "", description: "", amount: "" });
    return { diagnosisNotes: job.diagnosisNotes || "", items: seed };
  }
  return { diagnosisNotes: job.diagnosisNotes || "", items: rows };
}

function statusColor(s: string) {
  switch (s) {
    case "AT_SHOP": return "bg-blue-50 text-blue-700 border-blue-200";
    case "DIAGNOSING": return "bg-purple-50 text-purple-700 border-purple-200";
    case "REPAIRING": return "bg-amber-50 text-amber-700 border-amber-200";
    case "COMPLETED": return "bg-green-50 text-green-700 border-green-200";
    case "CANCELLED": return "bg-red-50 text-red-700 border-red-200";
    case "WAITING_APPROVAL": return "bg-yellow-50 text-yellow-700 border-yellow-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

/* ─── page ──────────────────────────────────────────────────────────── */

export default function VendorJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [dashboard, setDashboard] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [jobStatusDrafts, setJobStatusDrafts] = useState<Record<string, string>>({});
  const [quoteDrafts, setQuoteDrafts] = useState<Record<string, FinalQuoteDraft>>({});

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getVendorDashboard(token);
      setDashboard(data);

      const statuses: Record<string, string> = {};
      const quotes: Record<string, FinalQuoteDraft> = {};
      for (const job of data.assignedJobs) {
        statuses[job.id] = job.status;
        quotes[job.id] = buildQuoteDraft(data, job);
      }
      setJobStatusDrafts(statuses);
      setQuoteDrafts(quotes);
    } catch {
      setFlash({ type: "error", text: "Failed to load jobs." });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.replace("/login"); return; }
    if (role !== "VENDOR") { router.replace("/"); return; }
    void load();
  }, [load, role, router, session, status]);

  async function handleStatusUpdate(jobId: string) {
    if (!token) return;
    const newStatus = jobStatusDrafts[jobId];
    if (!newStatus) return;
    try {
      setPendingKey(`job:${jobId}`);
      await updateVendorJobStatus(token, jobId, newStatus);
      setFlash({ type: "success", text: "Job status updated." });
      await load();
    } catch (e) {
      setFlash({ type: "error", text: e instanceof Error ? e.message : "Update failed." });
    } finally {
      setPendingKey(null);
    }
  }

  async function handleQuoteSubmit(jobId: string) {
    if (!token) return;
    const draft = quoteDrafts[jobId];
    if (!draft) return;

    const items = draft.items
      .filter((i) => i.label.trim() || i.amount.trim())
      .map((i) => ({ label: i.label.trim(), description: i.description.trim() || null, amount: Number(i.amount) }));

    if (!items.length) { setFlash({ type: "error", text: "Add at least one quote item." }); return; }
    if (items.some((i) => !i.label || !Number.isFinite(i.amount) || i.amount < 0)) {
      setFlash({ type: "error", text: "Check quote items — names and valid amounts required." });
      return;
    }

    try {
      setPendingKey(`quote:${jobId}`);
      await submitVendorFinalQuote(token, jobId, { diagnosisNotes: draft.diagnosisNotes.trim() || undefined, items });
      setFlash({ type: "success", text: "Final quote submitted." });
      await load();
    } catch (e) {
      setFlash({ type: "error", text: e instanceof Error ? e.message : "Quote submission failed." });
    } finally {
      setPendingKey(null);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const jobs = dashboard?.assignedJobs ?? [];

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#f6faf4]">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-3xl bg-white/60" />)}
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
            <Link href="/vendor/dashboard" className="-ml-6 mb-4 inline-flex items-center gap-2 rounded-full border border-[#cfe0c6] bg-white px-4 py-2 text-sm font-semibold text-[#355541] transition-all hover:bg-[#f6faf4] hover:shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-[#173726]">Assigned Jobs</h1>
            <p className="mt-1 text-[#5b7262]">Manage repair jobs assigned to your shop. Update status, diagnose, and submit final quotes.</p>
          </div>
          <button onClick={() => void load()} className="rounded-full bg-[#214c34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173726] transition-colors">
            Refresh
          </button>
        </div>

        {/* Flash */}
        {flash ? (
          <div className={`mt-4 rounded-2xl p-4 text-sm ${flash.type === "success" ? "border border-green-200 bg-green-50 text-green-800" : "border border-red-200 bg-red-50 text-red-800"}`}>
            {flash.text}
            <button onClick={() => setFlash(null)} className="float-right font-bold">×</button>
          </div>
        ) : null}

        {/* Empty state */}
        {!jobs.length ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#173726]">No assigned jobs yet</p>
            <p className="mt-2 text-[#5b7262]">Once a customer accepts your offer, the job will appear here.</p>
          </div>
        ) : null}

        {/* Job list */}
        <div className="mt-6 space-y-4">
          {jobs.map((job) => {
            const isOpen = expanded.has(job.id);
            const statusDraft = jobStatusDrafts[job.id] || job.status;
            const quoteDraft = quoteDrafts[job.id] || buildQuoteDraft(dashboard!, job);
            const quoteTotal = quoteDraft.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
            const isStatusSaving = pendingKey === `job:${job.id}`;
            const isQuoteSaving = pendingKey === `quote:${job.id}`;
            const waitingForApproval = job.status === "WAITING_APPROVAL";
            const canShowQuoteForm = job.status !== "COMPLETED" && job.status !== "CANCELLED";

            return (
              <article key={job.id} className="rounded-3xl bg-white shadow-sm overflow-hidden">
                {/* Tile header */}
                <button type="button" onClick={() => toggleExpand(job.id)} className="w-full px-6 py-5 text-left transition-colors hover:bg-[#f6faf4]">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-[#173726] truncate">{job.repairRequest.title}</h3>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${statusColor(job.status)}`}>
                          {fmt(job.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5b7262]">
                        {job.repairRequest.deviceType}
                        {job.repairRequest.brand ? ` • ${job.repairRequest.brand}` : ""}
                        {job.repairRequest.model ? ` • ${job.repairRequest.model}` : ""}
                        {" · "}{formatDate(job.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#173726]">{formatMoney(job.acceptedBid?.totalCost)}</p>
                        <p className="text-xs text-[#5b7262]">accepted bid</p>
                      </div>
                      <span className={`text-xl text-[#5b7262] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </div>
                </button>

                {/* Expanded */}
                {isOpen ? (
                  <div className="border-t border-[#e8f0e5] px-6 pb-6 pt-4 space-y-5">
                    {/* Device + bid info */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                        <p className="font-semibold text-[#173726]">Device & Issue</p>
                        <p className="mt-2">{job.repairRequest.deviceType} · {job.repairRequest.brand} · {job.repairRequest.model}</p>
                        <p className="mt-1 text-[#5b7262]">{job.repairRequest.problem}</p>
                      </div>
                      <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                        <p className="font-semibold text-[#173726]">Accepted Bid</p>
                        <p className="mt-2">Parts: {formatMoney(job.acceptedBid?.partsCost)} · Labor: {formatMoney(job.acceptedBid?.laborCost)}</p>
                        <p>ETA: {typeof job.acceptedBid?.estimatedDays === "number" ? `${job.acceptedBid.estimatedDays} day(s)` : "—"}</p>
                        <p>Total: <span className="font-bold">{formatMoney(job.acceptedBid?.totalCost)}</span></p>
                      </div>
                    </div>

                    {/* Status update */}
                    {!waitingForApproval && job.status !== "COMPLETED" && job.status !== "CANCELLED" ? (
                      <div className="rounded-2xl border border-[#cfe0c6] bg-white p-4">
                        <p className="mb-3 text-sm font-semibold text-[#173726]">Update Job Status</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <select
                            value={statusDraft}
                            onChange={(e) => setJobStatusDrafts((p) => ({ ...p, [job.id]: e.target.value }))}
                            className="rounded-2xl border border-[#cfe0c6] bg-white px-4 py-2.5 text-sm outline-none"
                          >
                            {JOB_STATUSES.map((s) => <option key={s} value={s}>{fmt(s)}</option>)}
                          </select>
                          <button
                            onClick={() => void handleStatusUpdate(job.id)}
                            disabled={isStatusSaving || statusDraft === job.status}
                            className="rounded-full bg-[#214c34] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            {isStatusSaving ? "Saving..." : "Update status"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {/* Approval status */}
                    {waitingForApproval ? (
                      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                        ⏳ Final quote submitted — waiting for customer to approve or decline.
                        {job.finalQuotedAmount != null ? ` Quoted: ${formatMoney(job.finalQuotedAmount)}` : ""}
                      </div>
                    ) : null}

                    {job.customerApproved === true ? (
                      <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                        ✅ Customer approved the final quote of {formatMoney(job.finalQuotedAmount)}.
                      </div>
                    ) : job.customerApproved === false ? (
                      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                        ❌ Customer declined the final quote. You may submit a revised quote.
                      </div>
                    ) : null}

                    {/* Final quote form */}
                    {canShowQuoteForm ? (
                      <div className="rounded-2xl border border-[#cfe0c6] bg-white p-4">
                        <p className="mb-3 text-sm font-semibold text-[#173726]">Final Quote</p>

                        <label className="block mb-3">
                          <span className="mb-1 block text-sm font-medium text-[#355541]">Diagnosis notes</span>
                          <textarea
                            rows={2}
                            value={quoteDraft.diagnosisNotes}
                            onChange={(e) => setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, diagnosisNotes: e.target.value } }))}
                            className="w-full rounded-2xl border border-[#cfe0c6] bg-[#f6faf4] px-4 py-2.5 text-sm outline-none"
                            placeholder="Describe the diagnosis findings..."
                          />
                        </label>

                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-[#355541]">Quote items</span>
                          <span className="text-sm font-semibold text-[#214c34]">Total: {formatMoney(quoteTotal)}</span>
                        </div>

                        <div className="space-y-2">
                          {quoteDraft.items.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const items = [...quoteDraft.items];
                                  items.splice(idx + 1, 0, { label: "", description: "", amount: "" });
                                  setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, items } }));
                                }}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#214c34] text-white text-lg hover:bg-[#173726] transition-colors"
                              >+</button>
                              <input
                                type="text" value={item.label}
                                onChange={(e) => { const items = [...quoteDraft.items]; items[idx] = { ...item, label: e.target.value }; setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, items } })); }}
                                className="flex-1 rounded-2xl border border-[#cfe0c6] bg-[#f6faf4] px-3 py-2 text-sm outline-none"
                                placeholder={`Item ${idx + 1}`}
                              />
                              <input
                                type="text" value={item.description}
                                onChange={(e) => { const items = [...quoteDraft.items]; items[idx] = { ...item, description: e.target.value }; setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, items } })); }}
                                className="w-40 rounded-2xl border border-[#cfe0c6] bg-[#f6faf4] px-3 py-2 text-sm outline-none"
                                placeholder="Description"
                              />
                              <div className="relative w-28">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5b7262]">৳</span>
                                <input
                                  type="number" min="0" value={item.amount}
                                  onChange={(e) => { const items = [...quoteDraft.items]; items[idx] = { ...item, amount: e.target.value }; setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, items } })); }}
                                  className="w-full rounded-2xl border border-[#cfe0c6] bg-[#f6faf4] py-2 pl-7 pr-3 text-sm outline-none"
                                  placeholder="0"
                                />
                              </div>
                              {quoteDraft.items.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => { const items = quoteDraft.items.filter((_, i) => i !== idx); setQuoteDrafts((p) => ({ ...p, [job.id]: { ...quoteDraft, items } })); }}
                                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#5b7262] hover:bg-red-50 hover:text-red-500 transition-colors"
                                >×</button>
                              ) : <div className="w-7 shrink-0" />}
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => void handleQuoteSubmit(job.id)}
                            disabled={isQuoteSaving}
                            className="rounded-full bg-[#214c34] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#173726] disabled:opacity-50 transition-colors"
                          >
                            {isQuoteSaving ? "Submitting..." : "Submit final quote"}
                          </button>
                        </div>
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
