"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getAdminPayments, type AdminPaymentRecord } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

const FILTERS = ["ALL", "PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;

export default function AdminPaymentsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    const fetchPayments = async () => {
      setLoading(true);
      setError("");

      try {
        let url = `${process.env.NEXT_PUBLIC_API_URL}/api/payments/admin/list?`;
        if (filter !== "ALL") url += `status=${filter}&`;
        if (methodFilter !== "ALL") url += `method=${methodFilter}&`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.message || "Failed to load payments");

        setPayments(json.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [filter, methodFilter, token]);

  const table = useAdminTableState(payments, ["transactionRef", "id", "user", "status", "method"] as any);

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
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none dark:bg-[#1C251F] md:px-4 md:py-2.5 md:text-sm"
        >
          {FILTERS.map((item) => (
            <option key={item} value={item}>
              {item === "ALL" ? "All Statuses" : item.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none dark:bg-[#1C251F] md:px-4 md:py-2.5 md:text-sm"
        >
          <option value="ALL">All Methods</option>
          <option value="CASH">Cash</option>
          <option value="SSLCOMMERZ">SSLCOMMERZ</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading payments...</div>
      ) : error ? (
        <div className="rounded-[24px] bg-[#FDEAEA] p-6 text-[#7A2F1D]">{error}</div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search by transaction ID, customer name, email…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)]">
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "18%" }} />
                </colgroup>
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
                  {table.paged.map((payment) => (
                    <tr key={payment.id} className="border-b border-[var(--border)] last:border-b-0">
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                        <p className="font-semibold text-[var(--accent-dark)] truncate">
                          {payment.transactionRef || "N/A"}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)] truncate">{payment.id}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">
                        <p className="truncate">{payment.user.name || payment.user.username}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate">{payment.user.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[var(--accent-dark)] whitespace-nowrap">
                        {String(payment.amount)} {payment.currency}
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--foreground)]">{payment.method || "N/A"}</td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--muted-foreground)] whitespace-nowrap">
                        {new Date(payment.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!payments.length && <div className="p-6 text-[var(--muted-foreground)]">No payments found.</div>}
          </div>
        </>
      )}
    </section>
  );
}
