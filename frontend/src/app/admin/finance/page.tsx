"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import { getAuthHeaders } from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type FinancialSummary = {
  commissionRate: number;
  totalCustomerPayments: number;
  totalRefundedToCustomers: number;
  totalPlatformCommission: number;
  totalVendorEarningsReleased: number;
  escrowHeldAmount: number;
  pendingSettlementCount: number;
};

type ChartData = {
  timeline: Array<{
    date: string;
    revenue: number;
    commission: number;
    payouts: number;
  }>;
  distribution: Array<{
    name: string;
    value: number;
    count: number;
  }>;
};

type LedgerEntry = {
  id: string;
  paymentId?: string | null;
  action: string;
  amount: string;
  grossAmount?: string | null;
  platformCommissionAmount?: string | null;
  vendorNetAmount?: string | null;
  createdAt: string;
  customer?: { id: string; name?: string | null; email?: string | null } | null;
  vendor?: { id: string; name?: string | null; email?: string | null } | null;
  note?: string | null;
};

const PIE_COLORS = ["#1F4D2E", "#5E7366", "#D9E5D5", "#C9D9C5", "#8A2A2A"];

function formatMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `৳${numeric.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminFinancePage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [settlePaymentId, setSettlePaymentId] = useState("");
  const [settlementNote, setSettlementNote] = useState("");
  const [batchLimit, setBatchLimit] = useState("20");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/financial-ledger/summary`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data.data);
      } else {
        setActionError(data.message || "Failed to load financial summary");
      }
    } catch (error) {
      console.error(error);
      setActionError("Failed to load financial summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadChartData = async () => {
    setLoadingCharts(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/financial-ledger/chart-data`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setChartData(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingCharts(false);
    }
  };

  const loadEntries = async () => {
    setLoadingEntries(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/financial-ledger/entries?take=20`,
        {
          credentials: "include",
          headers: getAuthHeaders(token),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setEntries(data.data || []);
      } else {
        setActionError(data.message || "Failed to load ledger entries");
      }
    } catch (error) {
      console.error(error);
      setActionError("Failed to load ledger entries");
    } finally {
      setLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (token) {
      void Promise.all([loadSummary(), loadChartData(), loadEntries()]);
    }
  }, [token]);

  const handleSettleSingle = async (event: FormEvent) => {
    event.preventDefault();
    if (!settlePaymentId.trim()) {
      setActionError("Please provide a payment ID to settle");
      return;
    }

    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/financial-ledger/settle/${encodeURIComponent(
          settlePaymentId.trim(),
        )}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(token),
          },
          body: JSON.stringify({ note: settlementNote.trim() || undefined }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || "Failed to settle payment");
        return;
      }

      setActionMessage(data.message || "Payment settled successfully");
      setSettlePaymentId("");
      setSettlementNote("");
      await Promise.all([loadSummary(), loadChartData(), loadEntries()]);
    } catch (error) {
      console.error(error);
      setActionError("Failed to settle payment");
    }
  };

  const handleAutoSettle = async () => {
    const limit = Math.max(1, Number(batchLimit) || 20);

    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/financial-ledger/auto-settle`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ limit }),
      });

      const data = await res.json();
      if (!res.ok) {
        setActionError(data.message || "Auto settlement failed");
        return;
      }

      const settledCount = Array.isArray(data.data?.settled) ? data.data.settled.length : 0;
      const skippedCount = Array.isArray(data.data?.skipped) ? data.data.skipped.length : 0;
      setActionMessage(`Auto-settlement completed. Settled ${settledCount}, skipped ${skippedCount}.`);
      await Promise.all([loadSummary(), loadChartData(), loadEntries()]);
    } catch (error) {
      console.error(error);
      setActionError("Auto settlement failed");
    }
  };

  return (
    <section className="space-y-10 pb-20">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Analytics</p>
        <h2 className="mt-3 text-4xl font-bold text-[var(--accent-dark)]">Financial Business Intelligence</h2>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
          Real-time tracking of platform revenue, commission flow, and vendor payout distributions.
        </p>
      </div>

      {loadingSummary ? (
        <div className="rounded-[1.5rem] bg-[var(--mint-50)] p-4 text-center text-sm md:p-6 md:text-base text-[var(--muted-foreground)]">Loading financial data...</div>
      ) : summary ? (
        <div className="grid grid-cols-2 gap-3 md:gap-5 xl:grid-cols-3">
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition hover:shadow-md md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] leading-tight md:text-sm md:tracking-[0.22em]">Total Volume</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">{formatMoney(summary.totalCustomerPayments)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[var(--mint-100)] bg-gradient-to-br from-[var(--mint-50)] to-white dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition hover:shadow-md md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-dark)] leading-tight md:text-sm md:tracking-[0.22em]">Platform Earnings</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">{formatMoney(summary.totalPlatformCommission)}</p>
            <p className="mt-0.5 text-[9px] text-[var(--muted-foreground)] md:mt-1 md:text-xs">Net ({(summary.commissionRate * 100).toFixed(0)}%)</p>
          </div>
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition hover:shadow-md md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] leading-tight md:text-sm md:tracking-[0.22em]">Vendor Payouts</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">{formatMoney(summary.totalVendorEarningsReleased)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[#F2D7D7] bg-[#FDF8F8] dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8A2A2A] leading-tight dark:text-[#ff6b6b] md:text-sm md:tracking-[0.22em]">Refunds Issued</p>
            <p className="mt-1 text-lg font-bold text-[#8A2A2A] dark:text-[#ff6b6b] md:mt-3 md:text-3xl">{formatMoney(summary.totalRefundedToCustomers)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-[#F9FBFA] dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] leading-tight md:text-sm md:tracking-[0.22em]">Escrow Balance</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">{formatMoney(summary.escrowHeldAmount)}</p>
          </div>
          <div className="flex flex-col justify-between rounded-[1.25rem] border border-[var(--border)] bg-[#F9FBFA] dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[1.75rem] md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] leading-tight md:text-sm md:tracking-[0.22em]">Open Settlements</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:mt-3 md:text-3xl">{summary.pendingSettlementCount}</p>
          </div>
        </div>
      ) : null}

      {/* Charts Section */}
      <div className="grid gap-4 md:gap-6 xl:grid-cols-3">
        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[2rem] md:p-8 xl:col-span-2">
          <h3 className="text-lg font-bold text-[var(--accent-dark)] md:text-xl">Revenue Trends</h3>
          <p className="mb-4 text-xs text-[var(--muted-foreground)] md:mb-8 md:text-sm">Last 30 days of platform activity</p>
          
          <div className="h-[220px] w-full md:h-[350px]">
            {loadingCharts ? (
              <div className="flex h-full items-center justify-center text-xs md:text-sm text-[var(--muted-foreground)]">Loading trends...</div>
            ) : chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeline} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7C72", fontSize: 10 }} 
                    dy={10}
                    tickFormatter={(val) => val.split("-").slice(1).join("/")}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7C72", fontSize: 10 }} 
                    tickFormatter={(val) => `৳${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                    formatter={(val) => formatMoney(val as number)}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 10, fontSize: "12px" }} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Gross Rev" 
                    stroke="#1F4D2E" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: "#1F4D2E" }}
                    activeDot={{ r: 5 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="commission" 
                    name="Comm" 
                    stroke="#5E7366" 
                    strokeWidth={2.5} 
                    dot={{ r: 3, fill: "#5E7366" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs md:text-sm text-[var(--muted-foreground)]">No chart data available</div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[2rem] md:p-8">
          <h3 className="text-lg font-bold text-[var(--accent-dark)] md:text-xl">Fund Distribution</h3>
          <p className="mb-2 text-xs text-[var(--muted-foreground)] md:mb-4 md:text-sm">Transaction volume by type</p>

          <div className="h-[200px] w-full md:h-[300px]">
            {loadingCharts ? (
              <div className="flex h-full items-center justify-center text-xs md:text-sm text-[var(--muted-foreground)]">Loading...</div>
            ) : chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {chartData.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "12px" }}
                    formatter={(val) => formatMoney(val as number)} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-2 space-y-1.5 md:mt-4 md:space-y-2">
            {chartData?.distribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-[10px] md:text-xs">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div className="h-2.5 w-2.5 rounded-full md:h-3 md:w-3" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="w-20 truncate text-[var(--muted-foreground)] md:w-24">{item.name.replace(/_/g, " ")}</span>
                </div>
                <span className="font-bold text-[var(--accent-dark)]">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        <form onSubmit={handleSettleSingle} className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[2rem] md:p-8">
          <h3 className="text-lg font-bold text-[var(--accent-dark)] md:text-xl">Manual Settlement</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
            Process a single vendor payout with automated commission deduction.
          </p>

          <div className="mt-4 space-y-3 md:mt-6 md:space-y-4">
            <input
              value={settlePaymentId}
              onChange={(event) => setSettlePaymentId(event.target.value)}
              placeholder="Payment Transaction ID"
              className="w-full rounded-xl border border-[#C9D9C5] bg-[var(--mint-50)] px-3 py-3 text-xs outline-none transition focus:border-[var(--accent-dark)] md:rounded-2xl md:px-4 md:py-4 md:text-sm"
            />
            <textarea
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
              placeholder="Internal settlement note (optional)"
              rows={2}
              className="w-full rounded-xl border border-[#C9D9C5] bg-[var(--mint-50)] px-3 py-3 text-xs outline-none transition focus:border-[var(--accent-dark)] md:rounded-2xl md:px-4 md:py-4 md:text-sm"
            />
          </div>

          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-[var(--accent-dark)] py-3 text-xs font-semibold text-[var(--accent-foreground)] shadow-lg shadow-[#1F4D2E]/20 transition hover:opacity-90 md:mt-6 md:py-4 md:text-sm"
          >
            Confirm Settlement
          </button>
        </form>

        <div className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[2rem] md:p-8">
          <h3 className="text-lg font-bold text-[var(--accent-dark)] md:text-xl">Batch Operations</h3>
          <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
            Execute automated settlement tasks across all eligible paid payments.
          </p>

          <div className="mt-4 space-y-4 md:mt-6 md:space-y-6">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-xs">Batch Limit</label>
              <input
                value={batchLimit}
                onChange={(event) => setBatchLimit(event.target.value)}
                placeholder="20"
                className="mt-1 w-full rounded-xl border border-[#C9D9C5] bg-[var(--mint-50)] px-3 py-3 text-xs outline-none transition focus:border-[var(--accent-dark)] md:mt-2 md:rounded-2xl md:px-4 md:py-4 md:text-sm"
              />
            </div>
            
            <button
              type="button"
              onClick={handleAutoSettle}
              className="w-full rounded-full border-2 border-[var(--accent-dark)] py-3 text-xs font-bold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)] md:py-4 md:text-sm"
            >
              Run Batch Settlement
            </button>
          </div>
        </div>
      </div>

      {(actionMessage || actionError) && (
        <div
          className={`rounded-2xl px-6 py-5 text-sm font-medium shadow-sm border ${
            actionError ? "bg-[#FBEAEA] text-[#8A2A2A] border-[#F2D7D7]" : "bg-[var(--mint-100)] text-[var(--accent-dark)] border-[var(--border)]"
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[2rem] md:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[var(--accent-dark)] md:text-xl">Recent Ledger Activity</h3>
          <button onClick={loadEntries} className="text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--accent-dark)] md:text-sm">Refresh</button>
        </div>

        {loadingEntries ? (
          <p className="mt-4 text-xs text-[var(--muted-foreground)] md:mt-6 md:text-sm">Fetching latest entries...</p>
        ) : entries.length ? (
          <div className="mt-4 overflow-x-auto md:mt-6">
            <table className="min-w-full text-[10px] md:text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left uppercase tracking-wider text-[var(--muted-foreground)] md:tracking-[0.16em]">
                  <th className="px-2 py-3 md:px-3 md:py-4">Event Type</th>
                  <th className="px-2 py-3 md:px-3 md:py-4">Impact</th>
                  <th className="px-2 py-3 md:px-3 md:py-4">Transaction</th>
                  <th className="px-2 py-3 md:px-3 md:py-4">Party</th>
                  <th className="px-2 py-3 md:px-3 md:py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] dark:divide-white/10">
                {entries.map((entry) => (
                  <tr key={entry.id} className="text-[var(--foreground)] transition hover:bg-[#F9FBFA] dark:hover:bg-white/5">
                    <td className="px-2 py-3 md:px-3 md:py-4">
                      <span className="inline-block rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-[8px] font-bold text-[var(--accent-dark)] md:px-3 md:py-1 md:text-[10px]">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-2 py-3 font-bold md:px-3 md:py-4">{formatMoney(entry.amount)}</td>
                    <td className="px-2 py-3 font-mono text-[9px] text-[var(--muted-foreground)] md:px-3 md:py-4 md:text-xs">{entry.paymentId || "System"}</td>
                    <td className="px-2 py-3 text-[var(--muted-foreground)] md:px-3 md:py-4">{entry.vendor?.name || entry.customer?.name || "N/A"}</td>
                    <td className="px-2 py-3 text-[var(--muted-foreground)] md:px-3 md:py-4">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[var(--muted-foreground)] md:mt-6 md:text-sm">No financial activity recorded yet.</p>
        )}
      </div>
    </section>
  );
}

