"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

type RepairBid = {
  id: string;
  totalCost: number;
  partsCost: number;
  laborCost: number;
  notes: string | null;
  status: string;
  createdAt: string;
  shop: { id: string; name: string; slug: string; area: string; city: string };
};

type RepairJob = {
  id: string;
  status: string;
  finalQuotedAmount: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  shop: { id: string; name: string; slug: string; area: string; city: string };
};

type RepairRequest = {
  id: string;
  title: string;
  deviceType: string;
  problem: string;
  mode: string;
  status: string;
  quotedFinalAmount: number | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name?: string | null; username: string; email: string };
  repairJobs: RepairJob[];
  bids: RepairBid[];
};

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  OPEN: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  BIDDING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  ACCEPTED: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  IN_PROGRESS: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  COMPLETED: "bg-[var(--mint-100)] text-[var(--accent-dark)]",
  CANCELLED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

const jobStatusLabels: Record<string, string> = {
  PENDING: "Awaiting Start",
  IN_PROGRESS: "Under Repair",
  COMPLETED: "Repair Done",
  CANCELLED: "Cancelled",
};

const modeLabels: Record<string, string> = {
  DIRECT_REPAIR: "Direct",
  BIDDING: "Bidding",
  COURIER_PICKUP: "Courier",
};

export default function AdminRepairRequestsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/repair-requests`,
          { credentials: "include", headers: getAuthHeaders(token) }
        );
        const json = await res.json();
        if (res.ok) setRequests(json.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const table = useAdminTableState(
    requests,
    ["title", "deviceType", "status", "mode", "user", "id"] as any
  );

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section>
      <div className="mb-6 md:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-sm md:tracking-[0.28em]">
          Monitoring
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--accent-dark)] md:mt-3 md:text-4xl">
          Repair Requests
        </h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] md:mt-3 md:text-lg">
          Track all repair requests, bidding activity, job progress, and participating vendors.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)] md:rounded-[24px] md:p-6 md:text-base">
          Loading repair requests...
        </div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search by title, device, customer, status…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />

          {/* Summary stats */}
          <div className="mb-4 grid grid-cols-2 gap-2 md:mb-6 md:grid-cols-5 md:gap-3">
            {[
              { label: "Total", value: requests.length, color: "var(--accent-dark)" },
              { label: "Bidding", value: requests.filter(r => r.mode === "BIDDING" && r.status !== "COMPLETED").length, color: "#9333ea" },
              { label: "In Progress", value: requests.filter(r => r.repairJobs.some(j => j.status === "IN_PROGRESS")).length, color: "#f97316" },
              { label: "Completed", value: requests.filter(r => r.status === "COMPLETED").length, color: "#22c55e" },
              { label: "Cancelled", value: requests.filter(r => r.status === "CANCELLED").length, color: "#ef4444" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-center md:p-4"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-xs">
                  {stat.label}
                </p>
                <p className="mt-1 text-xl font-bold md:text-2xl" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Repair request tiles */}
          <div className="space-y-3 md:space-y-4">
            {table.paged.map((req) => {
              const isOpen = expanded.has(req.id);
              const hasJobs = req.repairJobs.length > 0;
              const hasBids = req.bids.length > 0;

              return (
                <div
                  key={req.id}
                  className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition md:rounded-[24px]"
                >
                  {/* Main tile (always visible) */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(req.id)}
                    className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-[var(--mint-50)] md:items-center md:gap-4 md:p-5"
                  >
                    {/* Status indicator */}
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-sm font-bold text-[var(--accent-dark)] md:mt-0 md:h-12 md:w-12 md:text-base">
                      {req.deviceType?.charAt(0) || "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Title + status row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-[var(--foreground)] md:text-base">
                          {req.title}
                        </h3>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-bold uppercase md:px-2.5 md:text-[10px] ${statusColors[req.status] || "bg-gray-100 text-gray-700"}`}>
                          {req.status.replace(/_/g, " ")}
                        </span>
                        <span className="rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-[8px] font-medium text-[var(--accent-dark)] md:text-[10px]">
                          {modeLabels[req.mode] || req.mode}
                        </span>
                      </div>

                      {/* Meta row */}
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--muted-foreground)] md:text-xs">
                        <span>{req.deviceType}</span>
                        <span>•</span>
                        <span>{req.user.name || req.user.username}</span>
                        <span className="hidden md:inline">•</span>
                        <span className="hidden md:inline">{req.user.email}</span>
                        <span>•</span>
                        <span className="md:hidden">{new Date(req.createdAt).toLocaleDateString()}</span>
                        <span className="hidden md:inline">{new Date(req.createdAt).toLocaleString()}</span>
                        {req.quotedFinalAmount && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-[var(--accent-dark)]">
                              ৳{req.quotedFinalAmount.toLocaleString()}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Counts row */}
                      <div className="mt-1.5 flex gap-3 text-[9px] md:text-xs">
                        {hasJobs && (
                          <span className="rounded-lg bg-[var(--mint-50)] px-2 py-0.5 font-medium text-[var(--accent-dark)]">
                            {req.repairJobs.length} job{req.repairJobs.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {hasBids && (
                          <span className="rounded-lg bg-purple-50 px-2 py-0.5 font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                            {req.bids.length} bid{req.bids.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expand chevron */}
                    <svg
                      className={`h-5 w-5 shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-[var(--border)] bg-[var(--mint-50)]/50 px-3 pb-4 pt-3 md:px-5 md:pb-5 md:pt-4">
                      {/* Problem description */}
                      {req.problem && (
                        <div className="mb-4">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-xs">
                            Problem Description
                          </p>
                          <p className="mt-1 text-xs text-[var(--foreground)] md:text-sm">
                            {req.problem}
                          </p>
                        </div>
                      )}

                      {/* Repair Jobs */}
                      {hasJobs && (
                        <div className="mb-4">
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-xs">
                            Repair Jobs ({req.repairJobs.length})
                          </p>
                          <div className="space-y-2">
                            {req.repairJobs.map((job) => (
                              <div
                                key={job.id}
                                className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 md:flex-row md:items-center md:justify-between md:gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-[var(--foreground)] md:text-sm">
                                    {job.shop.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--muted-foreground)] md:text-xs">
                                    {job.shop.area}, {job.shop.city}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase md:text-[10px] ${statusColors[job.status] || "bg-gray-100 text-gray-700"}`}>
                                    {jobStatusLabels[job.status] || job.status.replace(/_/g, " ")}
                                  </span>
                                  {job.finalQuotedAmount && (
                                    <span className="text-xs font-semibold text-[var(--accent-dark)]">
                                      ৳{job.finalQuotedAmount.toLocaleString()}
                                    </span>
                                  )}
                                  {job.completedAt && (
                                    <span className="text-[9px] text-[var(--muted-foreground)] md:text-[10px]">
                                      Done: {new Date(job.completedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Bids */}
                      {hasBids && (
                        <div>
                          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-xs">
                            Vendor Bids ({req.bids.length})
                          </p>
                          <div className="space-y-2">
                            {req.bids.map((bid) => (
                              <div
                                key={bid.id}
                                className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 md:flex-row md:items-center md:justify-between md:gap-4"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-[var(--foreground)] md:text-sm">
                                    {bid.shop.name}
                                  </p>
                                  <p className="text-[10px] text-[var(--muted-foreground)] md:text-xs">
                                    {bid.shop.area}, {bid.shop.city}
                                  </p>
                                  {bid.notes && (
                                    <p className="mt-1 text-[10px] italic text-[var(--muted-foreground)] md:text-xs">
                                      &ldquo;{bid.notes}&rdquo;
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold uppercase md:text-[10px] ${statusColors[bid.status] || "bg-gray-100 text-gray-700"}`}>
                                    {bid.status.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-xs font-bold text-[var(--accent-dark)]">
                                    ৳{bid.totalCost.toLocaleString()}
                                  </span>
                                  <span className="text-[9px] text-[var(--muted-foreground)] md:text-[10px]">
                                    {new Date(bid.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasJobs && !hasBids && (
                        <p className="text-xs text-[var(--muted-foreground)] md:text-sm">
                          No jobs or bids associated with this request yet.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!requests.length && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)] md:p-6 md:text-base">
              No repair requests found.
            </div>
          )}
        </>
      )}
    </section>
  );
}
