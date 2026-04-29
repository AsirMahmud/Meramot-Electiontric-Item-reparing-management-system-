"use client";

import { FormEvent, useEffect, useState } from "react";

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
        headers: getAuthHeaders(),
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
        headers: getAuthHeaders(),
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
          headers: getAuthHeaders(),
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
    void Promise.all([loadSummary(), loadChartData(), loadEntries()]);
  }, []);

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
            ...getAuthHeaders(),
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
          ...getAuthHeaders(),
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
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading financial data...</div>
      ) : summary ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Total Volume</p>
            <p className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">{formatMoney(summary.totalCustomerPayments)}</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--accent-dark)]">Platform Earnings</p>
            <p className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">{formatMoney(summary.totalPlatformCommission)}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Net Commission ({(summary.commissionRate * 100).toFixed(0)}%)</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm transition hover:shadow-md">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Vendor Payouts</p>
            <p className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">{formatMoney(summary.totalVendorEarningsReleased)}</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[#F9FBFA] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8A2A2A]">Refunds Issued</p>
            <p className="mt-3 text-3xl font-bold text-[#8A2A2A]">{formatMoney(summary.totalRefundedToCustomers)}</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[#F9FBFA] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Escrow Balance</p>
            <p className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">{formatMoney(summary.escrowHeldAmount)}</p>
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[#F9FBFA] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Open Settlements</p>
            <p className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">{summary.pendingSettlementCount}</p>
          </div>
        </div>
      ) : null}

      {/* Charts Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-[32px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-8 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--accent-dark)]">Revenue & Commission Trends</h3>
          <p className="mb-8 text-sm text-[var(--muted-foreground)]">Last 30 days of platform activity</p>
          
          <div className="h-[350px] w-full">
            {loadingCharts ? (
              <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">Loading trends...</div>
            ) : chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.timeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7C72", fontSize: 12 }} 
                    dy={10}
                    tickFormatter={(val) => val.split("-").slice(1).join("/")}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#6B7C72", fontSize: 12 }} 
                    tickFormatter={(val) => `৳${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: "16px", border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    formatter={(val) => formatMoney(val as number)}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: 20 }} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Gross Revenue" 
                    stroke="#1F4D2E" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#1F4D2E" }}
                    activeDot={{ r: 6 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="commission" 
                    name="Commission" 
                    stroke="#5E7366" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: "#5E7366" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">No chart data available</div>
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-8 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--accent-dark)]">Fund Distribution</h3>
          <p className="mb-4 text-sm text-[var(--muted-foreground)]">Transaction volume by type</p>

          <div className="h-[300px] w-full">
            {loadingCharts ? (
              <div className="flex h-full items-center justify-center text-[var(--muted-foreground)]">Loading...</div>
            ) : chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => formatMoney(val as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : null}
          </div>

          <div className="mt-4 space-y-2">
            {chartData?.distribution.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-[var(--muted-foreground)] truncate w-24">{item.name.replace(/_/g, " ")}</span>
                </div>
                <span className="font-bold text-[var(--accent-dark)]">{formatMoney(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleSettleSingle} className="rounded-[32px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-8 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--accent-dark)]">Manual Settlement</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Process a single vendor payout with automated commission deduction.
          </p>

          <div className="mt-6 space-y-4">
            <input
              value={settlePaymentId}
              onChange={(event) => setSettlePaymentId(event.target.value)}
              placeholder="Payment Transaction ID"
              className="w-full rounded-2xl border border-[#C9D9C5] bg-[#F9FBFA] px-4 py-4 text-sm outline-none focus:border-[var(--accent-dark)] transition"
            />
            <textarea
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
              placeholder="Internal settlement note (optional)"
              rows={3}
              className="w-full rounded-2xl border border-[#C9D9C5] bg-[#F9FBFA] px-4 py-4 text-sm outline-none focus:border-[var(--accent-dark)] transition"
            />
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-full bg-[var(--accent-dark)] py-4 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 shadow-lg shadow-[#1F4D2E]/20"
          >
            Confirm Settlement
          </button>
        </form>

        <div className="rounded-[32px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-8 shadow-sm">
          <h3 className="text-xl font-bold text-[var(--accent-dark)]">Batch Operations</h3>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Execute automated settlement tasks across all eligible paid payments.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Batch Limit</label>
              <input
                value={batchLimit}
                onChange={(event) => setBatchLimit(event.target.value)}
                placeholder="20"
                className="mt-2 w-full rounded-2xl border border-[#C9D9C5] bg-[#F9FBFA] px-4 py-4 text-sm outline-none focus:border-[var(--accent-dark)] transition"
              />
            </div>
            
            <button
              type="button"
              onClick={handleAutoSettle}
              className="w-full rounded-full border-2 border-[var(--accent-dark)] py-4 text-sm font-bold text-[var(--accent-dark)] transition hover:bg-[var(--mint-50)]"
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

      <div className="rounded-[32px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-[var(--accent-dark)]">Recent Ledger Activity</h3>
          <button onClick={loadEntries} className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--accent-dark)]">Refresh</button>
        </div>

        {loadingEntries ? (
          <p className="mt-6 text-sm text-[var(--muted-foreground)]">Fetching latest entries...</p>
        ) : entries.length ? (
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                  <th className="px-3 py-4">Event Type</th>
                  <th className="px-3 py-4">Impact</th>
                  <th className="px-3 py-4">Transaction</th>
                  <th className="px-3 py-4">Party</th>
                  <th className="px-3 py-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {entries.map((entry) => (
                  <tr key={entry.id} className="text-[var(--foreground)] transition hover:bg-[#F9FBFA]">
                    <td className="px-3 py-4">
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-[10px] font-bold text-[var(--accent-dark)]">
                        {entry.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-4 font-bold">{formatMoney(entry.amount)}</td>
                    <td className="px-3 py-4 text-xs font-mono text-[var(--muted-foreground)]">{entry.paymentId || "System"}</td>
                    <td className="px-3 py-4 text-[var(--muted-foreground)]">{entry.vendor?.name || entry.customer?.name || "N/A"}</td>
                    <td className="px-3 py-4 text-[var(--muted-foreground)]">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-6 text-sm text-[var(--muted-foreground)]">No financial activity recorded yet.</p>
        )}
      </div>
    </section>
  );
}

