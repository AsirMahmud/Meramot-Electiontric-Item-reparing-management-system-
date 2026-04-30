"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAdminPayments, type AdminPaymentRecord } from "@/lib/api";

const FILTERS = ["ALL", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export default function AdminPaymentsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchPayments = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getAdminPayments({
          status: filter === "ALL" ? undefined : filter,
        }, token);

        setPayments(response.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filter, token]);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Payments</p>
        <h2 className="mt-3 text-4xl font-bold text-[var(--accent-dark)]">Payment monitor</h2>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
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
                ? "bg-[var(--accent-dark)] text-[var(--accent-foreground)]"
                : "border border-[#BFD0BA] bg-white dark:bg-[#1C251F] text-[var(--accent-dark)]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading payments...</div>
      ) : error ? (
        <div className="rounded-[24px] bg-[#FDEAEA] p-6 text-[#7A2F1D]">{error}</div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[var(--border)] bg-[var(--mint-100)]">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
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
                  <tr key={payment.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                      <p className="font-semibold text-[var(--accent-dark)]">
                        {payment.transactionRef || "N/A"}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{payment.id}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                      <p>{payment.user.name || payment.user.username}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{payment.user.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--accent-dark)]">
                      {String(payment.amount)} {payment.currency}
                    </td>
                    <td className="px-5 py-4 text-sm text-[var(--foreground)]">{payment.method || "N/A"}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-[var(--muted-foreground)]">
                      {new Date(payment.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!payments.length && <div className="p-6 text-[var(--muted-foreground)]">No payments found.</div>}
        </div>
      )}
    </section>
  );
}
