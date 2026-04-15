"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

type FinancialSummary = {
  commissionRate: number;
  totalCustomerPayments: number;
  totalRefundedToCustomers: number;
  totalPlatformCommission: number;
  totalVendorEarningsReleased: number;
  escrowHeldAmount: number;
  pendingSettlementCount: number;
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

function formatMoney(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return `৳${numeric.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminFinancePage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
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
    void Promise.all([loadSummary(), loadEntries()]);
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
      await Promise.all([loadSummary(), loadEntries()]);
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
      await Promise.all([loadSummary(), loadEntries()]);
    } catch (error) {
      console.error(error);
      setActionError("Auto settlement failed");
    }
  };

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Finance</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Commission and financial ledger</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Automated accounting tracks payment flow and deducts a 5% platform commission before releasing vendor earnings.
        </p>
      </div>

      {loadingSummary ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading financial summary...</div>
      ) : summary ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Customer Payments</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{formatMoney(summary.totalCustomerPayments)}</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Platform Commission</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{formatMoney(summary.totalPlatformCommission)}</p>
            <p className="mt-1 text-xs text-[#6B7C72]">Rate: {(summary.commissionRate * 100).toFixed(0)}%</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Vendor Earnings Released</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{formatMoney(summary.totalVendorEarningsReleased)}</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Refunded to Customers</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{formatMoney(summary.totalRefundedToCustomers)}</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Escrow Held Amount</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{formatMoney(summary.escrowHeldAmount)}</p>
          </div>
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Pending Settlements</p>
            <p className="mt-3 text-3xl font-bold text-[#1F4D2E]">{summary.pendingSettlementCount}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <form onSubmit={handleSettleSingle} className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
          <h3 className="text-xl font-bold text-[#1F4D2E]">Settle single payment</h3>
          <p className="mt-2 text-sm text-[#6B7C72]">
            Releases vendor earnings with automatic 5% commission deduction.
          </p>

          <div className="mt-4 space-y-3">
            <input
              value={settlePaymentId}
              onChange={(event) => setSettlePaymentId(event.target.value)}
              placeholder="Payment ID"
              className="w-full rounded-2xl border border-[#C9D9C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#1F4D2E]"
            />
            <textarea
              value={settlementNote}
              onChange={(event) => setSettlementNote(event.target.value)}
              placeholder="Optional note"
              rows={3}
              className="w-full rounded-2xl border border-[#C9D9C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#1F4D2E]"
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-full bg-[#1F4D2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183D24]"
          >
            Settle Payment
          </button>
        </form>

        <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
          <h3 className="text-xl font-bold text-[#1F4D2E]">Auto-settle batch</h3>
          <p className="mt-2 text-sm text-[#6B7C72]">
            Runs automated settlement across eligible paid payments.
          </p>

          <div className="mt-4 flex gap-3">
            <input
              value={batchLimit}
              onChange={(event) => setBatchLimit(event.target.value)}
              placeholder="Batch limit"
              className="w-36 rounded-2xl border border-[#C9D9C5] bg-white px-4 py-3 text-sm outline-none focus:border-[#1F4D2E]"
            />
            <button
              type="button"
              onClick={handleAutoSettle}
              className="rounded-full border border-[#1F4D2E] px-5 py-3 text-sm font-semibold text-[#1F4D2E] transition hover:bg-[#E6F0E2]"
            >
              Run Auto-settle
            </button>
          </div>
        </div>
      </div>

      {(actionMessage || actionError) && (
        <div
          className={`mt-6 rounded-2xl px-5 py-4 text-sm ${
            actionError ? "bg-[#FBEAEA] text-[#8A2A2A]" : "bg-[#E6F0E2] text-[#1F4D2E]"
          }`}
        >
          {actionError || actionMessage}
        </div>
      )}

      <div className="mt-8 rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
        <h3 className="text-xl font-bold text-[#1F4D2E]">Recent ledger entries</h3>

        {loadingEntries ? (
          <p className="mt-4 text-sm text-[#6B7C72]">Loading ledger entries...</p>
        ) : entries.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#D7E2D2] text-left uppercase tracking-[0.16em] text-[#5E7366]">
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3">Vendor</th>
                  <th className="px-3 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#D7E2D2] last:border-b-0 text-[#244233]">
                    <td className="px-3 py-3 font-medium">{entry.action}</td>
                    <td className="px-3 py-3">{formatMoney(entry.amount)}</td>
                    <td className="px-3 py-3">{entry.paymentId || "-"}</td>
                    <td className="px-3 py-3">{entry.vendor?.email || entry.vendor?.name || "-"}</td>
                    <td className="px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-[#6B7C72]">No ledger entries found yet.</p>
        )}
      </div>
    </section>
  );
}
