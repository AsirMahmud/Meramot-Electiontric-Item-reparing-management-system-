"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";

type InvoiceLineItem = {
  description: string;
  amount: number;
};

type InvoiceRefund = {
  id: string;
  amount: string | number;
  reason: string;
  status: string;
  processedAt: string | null;
};

type InvoiceData = {
  invoiceNumber: string;
  issuedAt: string;
  payment: {
    id: string;
    transactionRef: string | null;
    amount: number;
    currency: string;
    method: string | null;
    status: string;
    escrowStatus: string;
    paidAt: string | null;
    createdAt: string;
  };
  customer: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    address: string | null;
    city: string | null;
  };
  repairRequest: {
    id: string;
    title: string;
    deviceType: string;
    brand: string | null;
    model: string | null;
    problem: string;
  } | null;
  shop: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
  } | null;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  refundsTotal: number;
  netTotal: number;
  refunds: InvoiceRefund[];
};

function formatMoney(value: number | string, currency = "BDT") {
  const n = Number(value);
  const symbol = currency === "BDT" ? "৳" : currency;
  return `${symbol}${n.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvoicePage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params?.paymentId ?? "";
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paymentId || !token) return;

    const fetchInvoice = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${encodeURIComponent(paymentId)}/invoice`,
          { credentials: "include", headers: getAuthHeaders(token) },
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Failed to load invoice");
          return;
        }
        setInvoice(data.data);
      } catch {
        setError("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    void fetchInvoice();
  }, [paymentId, token]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7F4]">
        <p className="text-[var(--muted-foreground)]">Loading invoice…</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7F4]">
        <div className="rounded-2xl bg-[#FBEAEA] px-6 py-4 text-[#8A2A2A]">
          {error ?? "Invoice not found"}
        </div>
      </div>
    );
  }

  const currency = invoice.payment.currency;

  return (
    <>
      {/* Print-hide toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--border)] bg-white px-6 py-3 print:hidden">
        <p className="text-sm font-semibold text-[var(--accent-dark)]">{invoice.invoiceNumber}</p>
        <button
          id="print-invoice-button"
          onClick={handlePrint}
          className="rounded-full bg-[var(--accent-dark)] px-5 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Invoice body */}
      <div className="min-h-screen bg-[#F5F7F4] px-4 py-10 print:bg-white print:p-0">
        <div
          ref={printRef}
          id="invoice-document"
          className="mx-auto max-w-3xl rounded-3xl bg-white p-10 shadow-sm print:max-w-none print:rounded-none print:shadow-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--border)] pb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                Meeramoot
              </p>
              <h1 className="mt-1 text-3xl font-bold text-[var(--accent-dark)]">Tax Invoice</h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Electric Item Repairing Management System
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[var(--accent-dark)]">{invoice.invoiceNumber}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Issued: {formatDate(invoice.issuedAt)}</p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  invoice.payment.status === "PAID"
                    ? "bg-[var(--mint-100)] text-[var(--accent-dark)]"
                    : "bg-[#FEF3C7] text-[#92400E]"
                }`}
              >
                {invoice.payment.status}
              </span>
            </div>
          </div>

          {/* Bill to / Shop */}
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Bill To
              </p>
              <p className="mt-2 font-semibold text-[var(--accent-dark)]">
                {invoice.customer.name ?? "Customer"}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">{invoice.customer.email}</p>
              {invoice.customer.phone && (
                <p className="text-sm text-[var(--muted-foreground)]">{invoice.customer.phone}</p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  {invoice.customer.address}
                  {invoice.customer.city ? `, ${invoice.customer.city}` : ""}
                </p>
              )}
            </div>

            {invoice.shop && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Service Provider
                </p>
                <p className="mt-2 font-semibold text-[var(--accent-dark)]">{invoice.shop.name}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{invoice.shop.address}</p>
                {invoice.shop.phone && (
                  <p className="text-sm text-[var(--muted-foreground)]">{invoice.shop.phone}</p>
                )}
                {invoice.shop.email && (
                  <p className="text-sm text-[var(--muted-foreground)]">{invoice.shop.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Repair details */}
          {invoice.repairRequest && (
            <div className="mt-8 rounded-2xl border border-[var(--border)] bg-[#F8FAF7] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Repair Details
              </p>
              <p className="mt-2 font-semibold text-[var(--accent-dark)]">{invoice.repairRequest.title}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Device: {invoice.repairRequest.deviceType}
                {invoice.repairRequest.brand ? ` · ${invoice.repairRequest.brand}` : ""}
                {invoice.repairRequest.model ? ` ${invoice.repairRequest.model}` : ""}
              </p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Issue: {invoice.repairRequest.problem}</p>
            </div>
          )}

          {/* Line items table */}
          <div className="mt-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-[#EEF3EC]">
                    <td className="py-3 pr-4 text-[var(--foreground)]">{item.description}</td>
                    <td className="py-3 text-right font-semibold text-[var(--accent-dark)]">
                      {formatMoney(item.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="flex w-full max-w-xs justify-between text-sm text-[var(--muted-foreground)]">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.subtotal, currency)}</span>
            </div>
            {invoice.refundsTotal > 0 && (
              <div className="flex w-full max-w-xs justify-between text-sm text-[var(--muted-foreground)]">
                <span>Refunds</span>
                <span className="text-[#8A2A2A]">
                  − {formatMoney(invoice.refundsTotal, currency)}
                </span>
              </div>
            )}
            <div className="flex w-full max-w-xs justify-between border-t border-[var(--border)] pt-3 text-base font-bold text-[var(--accent-dark)]">
              <span>Net Total</span>
              <span>{formatMoney(invoice.netTotal, currency)}</span>
            </div>
          </div>

          {/* Refunds detail */}
          {invoice.refunds.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Refunds
              </p>
              <div className="mt-3 space-y-2">
                {invoice.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[var(--accent-dark)]">{refund.reason}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {refund.status}
                        {refund.processedAt
                          ? ` · ${formatDate(refund.processedAt)}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-[#8A2A2A]">
                      − {formatMoney(refund.amount, currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment reference */}
          <div className="mt-10 border-t border-[var(--border)] pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Payment Reference
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-[var(--muted-foreground)]">Payment ID: </span>
                <span className="font-mono text-[var(--foreground)]">{invoice.payment.id}</span>
              </div>
              {invoice.payment.transactionRef && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Transaction Ref: </span>
                  <span className="font-mono text-[var(--foreground)]">{invoice.payment.transactionRef}</span>
                </div>
              )}
              {invoice.payment.method && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Method: </span>
                  <span className="text-[var(--foreground)]">{invoice.payment.method}</span>
                </div>
              )}
              {invoice.payment.paidAt && (
                <div>
                  <span className="text-[var(--muted-foreground)]">Paid at: </span>
                  <span className="text-[var(--foreground)]">{formatDate(invoice.payment.paidAt)}</span>
                </div>
              )}
              <div>
                <span className="text-[var(--muted-foreground)]">Escrow Status: </span>
                <span className="text-[var(--foreground)]">{invoice.payment.escrowStatus}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 text-center text-xs text-[#A0B0A5] print:mt-16">
            <p>Thank you for using Meeramoot. This is a system-generated invoice.</p>
            <p className="mt-1">For queries contact support via the platform.</p>
          </div>
        </div>
      </div>

      {/* Print styles injected via style tag */}
      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white;
          }
        }
      `}</style>
    </>
  );
}
