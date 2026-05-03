"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  getVendorDashboard,
  type FinalQuoteItem,
  type VendorDashboardData,
} from "@/lib/api";

/* ─── helpers ───────────────────────────────────────────────────────── */

function formatMoney(v?: number | null) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(v);
}

function formatDate(v?: string | Date | null) {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmt(s?: string | null) {
  return (s || "UNKNOWN").replaceAll("_", " ");
}

/* ─── page ──────────────────────────────────────────────────────────── */

export default function VendorApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [dashboard, setDashboard] = useState<VendorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getVendorDashboard(token);
      setDashboard(data);
    } catch {
      console.error("Failed to load dashboard");
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

  function toggleExpand(id: string) {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // Filter to jobs that are waiting for customer approval
  const waitingJobs = (dashboard?.assignedJobs ?? []).filter(
    (job) => job.status === "WAITING_APPROVAL" || job.customerApproved !== null
  );

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen bg-[#f6faf4]">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-3xl bg-white/60" />)}
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
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link href="/vendor/dashboard" className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#cfe0c6] bg-white px-4 py-2 text-sm font-semibold text-[#355541] transition-all hover:bg-[#f6faf4] hover:shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Back to dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-[#173726] md:text-3xl">Customer Approval Status</h1>
            <p className="mt-1 text-sm text-[#5b7262]">Track the approval status of your submitted final quotes.</p>
          </div>
          <button onClick={() => void load()} className="w-full rounded-full bg-[#214c34] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173726] transition-colors md:w-auto">
            Refresh
          </button>
        </div>

        {/* Empty */}
        {!waitingJobs.length ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-[#173726]">No pending approvals</p>
            <p className="mt-2 text-[#5b7262]">
              Submit a final quote from your{" "}
              <Link href="/vendor/jobs" className="font-medium text-[#214c34] underline">assigned jobs</Link>{" "}
              to see approval status here.
            </p>
          </div>
        ) : null}

        {/* Job cards */}
        <div className="mt-6 space-y-4">
          {waitingJobs.map((job) => {
            const isOpen = expanded.has(job.id);

            const approvalStatus =
              job.customerApproved === true
                ? { label: "Approved", color: "bg-green-50 text-green-700 border-green-200", icon: "✅" }
                : job.customerApproved === false
                  ? { label: "Declined", color: "bg-red-50 text-red-700 border-red-200", icon: "❌" }
                  : { label: "Pending", color: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: "⏳" };

            const quoteItems = (job.finalQuoteItems ?? []) as FinalQuoteItem[];

            return (
              <article key={job.id} className="rounded-3xl bg-white shadow-sm overflow-hidden">
                {/* Collapsed */}
                <button type="button" onClick={() => toggleExpand(job.id)} className="w-full px-4 py-4 text-left transition-colors hover:bg-[#f6faf4] md:px-6 md:py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-bold text-[#173726] truncate md:text-lg">{job.repairRequest.title}</h3>
                        <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] ${approvalStatus.color}`}>
                          {approvalStatus.icon} {approvalStatus.label}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#5b7262]">
                        {job.repairRequest.deviceType}
                        {job.repairRequest.brand ? ` • ${job.repairRequest.brand}` : ""}
                        {job.repairRequest.model ? ` • ${job.repairRequest.model}` : ""}
                        {" · Submitted "}{formatDate(job.updatedAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 md:gap-4">
                      <div className="text-right">
                        <p className="text-base font-bold text-[#173726] md:text-lg">{formatMoney(job.finalQuotedAmount)}</p>
                        <p className="text-xs text-[#5b7262]">quoted</p>
                      </div>
                      <span className={`text-xl text-[#5b7262] transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </div>
                </button>

                {/* Expanded */}
                {isOpen ? (
                  <div className="border-t border-[#e8f0e5] px-4 pb-5 pt-4 space-y-4 md:px-6 md:pb-6">
                    {/* Quote breakdown */}
                    {quoteItems.length ? (
                      <div>
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.15em] text-[#58725f]">Final quote breakdown</p>
                        <div className="space-y-2">
                          {quoteItems.map((item, i) => (
                            <div key={i} className="flex items-center justify-between rounded-2xl border border-[#e8f0e5] bg-[#f6faf4] px-4 py-3">
                              <div>
                                <p className="font-medium text-[#173726]">{item.label}</p>
                                {item.description ? <p className="text-xs text-[#5b7262]">{item.description}</p> : null}
                              </div>
                              <p className="font-bold text-[#173726]">{formatMoney(typeof item.amount === "number" ? item.amount : Number(item.amount))}</p>
                            </div>
                          ))}
                          <div className="flex items-center justify-between rounded-2xl border-2 border-dashed border-[#cfe0c6] px-4 py-3">
                            <p className="font-semibold text-[#173726]">Total</p>
                            <p className="text-xl font-bold text-[#214c34]">{formatMoney(job.finalQuotedAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {/* Diagnosis notes */}
                    {job.diagnosisNotes ? (
                      <div className="rounded-2xl bg-[#f6faf4] p-4 text-sm text-[#355541]">
                        <p className="font-semibold text-[#173726]">Diagnosis Notes</p>
                        <p className="mt-2">{job.diagnosisNotes}</p>
                      </div>
                    ) : null}

                    {/* Approval message */}
                    <div className={`rounded-2xl border p-4 text-sm ${approvalStatus.color}`}>
                      {job.customerApproved === true
                        ? "The customer has approved this final quote. You may proceed with the repair and mark the job as completed when done."
                        : job.customerApproved === false
                          ? "The customer declined this quote. Go to your Assigned Jobs page to revise and resubmit."
                          : "Waiting for the customer to review your final quote. You will be notified once they respond."}
                    </div>

                    {/* Action links */}
                    <div className="flex gap-3">
                      <Link
                        href="/vendor/jobs"
                        className="rounded-full border border-[#cfe0c6] px-5 py-2.5 text-sm font-semibold text-[#355541] hover:bg-[#f6faf4] transition-colors"
                      >
                        Go to assigned jobs
                      </Link>
                    </div>
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
