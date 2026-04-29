"use client";

import { useEffect, useState } from "react";
import { getAdminPayments, type AdminPaymentRecord } from "@/lib/api";

const FILTERS = ["ALL", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getAdminPayments({
          status: filter === "ALL" ? undefined : filter,
          take: 50,
        });

        setPayments(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filter]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Payments</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Payment monitor</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Inspect transactions, payment states, and customer references.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        {FILTERS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === item
                ? "bg-[#1F4D2E] text-white"
                : "border border-[#BFD0BA] bg-white text-[#1F4D2E]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading payments...</div>
      ) : error ? (
        <div className="rounded-[24px] bg-[#FDEAEA] p-6 text-[#7A2F1D]">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[#D7E2D2] bg-[#E6F0E2]">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-[#5E7366]">
                  <th className="px-5 py-4">Transaction</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Amount</th>
                  <th className="px-5 py-4">Method</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Created</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[#D7E2D2] last:border-b-0">
                    <td className="px-5 py-4 text-sm text-[#244233]">
                      <p className="font-semibold text-[#1F4D2E]">
                        {payment.transactionRef || "N/A"}
                      </p>
                      <p className="mt-1 text-xs text-[#6B7C72]">{payment.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#244233]">
                      <p>{payment.user.name || payment.user.username}</p>
                      <p className="text-xs text-[#6B7C72]">{payment.user.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#1F4D2E]">
                      {String(payment.amount)} {payment.currency}
                    </td>
                    <td className="px-5 py-4 text-sm text-[#244233]">{payment.method || "N/A"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#E6F0E2] px-3 py-1 text-xs font-semibold text-[#1F4D2E]">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[#6B7C72]">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!payments.length && <div className="p-6 text-[#6B7C72]">No payments found.</div>}
        </div>
      )}
    </section>
  );
}
