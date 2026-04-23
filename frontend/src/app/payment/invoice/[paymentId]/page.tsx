"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
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

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paymentId) return;

    const fetchInvoice = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/payments/${encodeURIComponent(paymentId)}/invoice`,
          { credentials: "include", headers: getAuthHeaders() },
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
  }, [paymentId]);

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7F4]">
        <p className="text-[#6B7C72]">Loading invoice…</p>
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
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#D7E2D2] bg-white px-6 py-3 print:hidden">
        <p className="text-sm font-semibold text-[#1F4D2E]">{invoice.invoiceNumber}</p>
        <button
          id="print-invoice-button"
          onClick={handlePrint}
          className="rounded-full bg-[#1F4D2E] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#183D24]"
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
          <div className="flex items-start justify-between border-b border-[#D7E2D2] pb-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#5E7366]">
                Meeramoot
              </p>
              <h1 className="mt-1 text-3xl font-bold text-[#1F4D2E]">Tax Invoice</h1>
              <p className="mt-2 text-sm text-[#6B7C72]">
                Electric Item Repairing Management System
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-[#1F4D2E]">{invoice.invoiceNumber}</p>
              <p className="mt-1 text-sm text-[#6B7C72]">Issued: {formatDate(invoice.issuedAt)}</p>
              <span
                className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                  invoice.payment.status === "PAID"
                    ? "bg-[#E6F0E2] text-[#1F4D2E]"
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
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7366]">
                Bill To
              </p>
              <p className="mt-2 font-semibold text-[#1F4D2E]">
                {invoice.customer.name ?? "Customer"}
              </p>
              <p className="text-sm text-[#6B7C72]">{invoice.customer.email}</p>
              {invoice.customer.phone && (
                <p className="text-sm text-[#6B7C72]">{invoice.customer.phone}</p>
              )}
              {invoice.customer.address && (
                <p className="text-sm text-[#6B7C72]">
                  {invoice.customer.address}
                  {invoice.customer.city ? `, ${invoice.customer.city}` : ""}
                </p>
              )}
            </div>

            {invoice.shop && (
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7366]">
                  Service Provider
                </p>
                <p className="mt-2 font-semibold text-[#1F4D2E]">{invoice.shop.name}</p>
                <p className="text-sm text-[#6B7C72]">{invoice.shop.address}</p>
                {invoice.shop.phone && (
                  <p className="text-sm text-[#6B7C72]">{invoice.shop.phone}</p>
                )}
                {invoice.shop.email && (
                  <p className="text-sm text-[#6B7C72]">{invoice.shop.email}</p>
                )}
              </div>
            )}
          </div>

          {/* Repair details */}
          {invoice.repairRequest && (
            <div className="mt-8 rounded-2xl border border-[#D7E2D2] bg-[#F8FAF7] p-5">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7366]">
                Repair Details
              </p>
              <p className="mt-2 font-semibold text-[#1F4D2E]">{invoice.repairRequest.title}</p>
              <p className="mt-1 text-sm text-[#6B7C72]">
                Device: {invoice.repairRequest.deviceType}
                {invoice.repairRequest.brand ? ` · ${invoice.repairRequest.brand}` : ""}
                {invoice.repairRequest.model ? ` ${invoice.repairRequest.model}` : ""}
              </p>
              <p className="mt-1 text-sm text-[#6B7C72]">Issue: {invoice.repairRequest.problem}</p>
            </div>
          )}

          {/* Line items table */}
          <div className="mt-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#D7E2D2] text-left text-xs uppercase tracking-[0.18em] text-[#5E7366]">
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, i) => (
                  <tr key={i} className="border-b border-[#EEF3EC]">
                    <td className="py-3 pr-4 text-[#244233]">{item.description}</td>
                    <td className="py-3 text-right font-semibold text-[#1F4D2E]">
                      {formatMoney(item.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex flex-col items-end gap-2">
            <div className="flex w-full max-w-xs justify-between text-sm text-[#6B7C72]">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.subtotal, currency)}</span>
            </div>
            {invoice.refundsTotal > 0 && (
              <div className="flex w-full max-w-xs justify-between text-sm text-[#6B7C72]">
                <span>Refunds</span>
                <span className="text-[#8A2A2A]">
                  − {formatMoney(invoice.refundsTotal, currency)}
                </span>
              </div>
            )}
            <div className="flex w-full max-w-xs justify-between border-t border-[#D7E2D2] pt-3 text-base font-bold text-[#1F4D2E]">
              <span>Net Total</span>
              <span>{formatMoney(invoice.netTotal, currency)}</span>
            </div>
          </div>

          {/* Refunds detail */}
          {invoice.refunds.length > 0 && (
            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7366]">
                Refunds
              </p>
              <div className="mt-3 space-y-2">
                {invoice.refunds.map((refund) => (
                  <div
                    key={refund.id}
                    className="flex items-center justify-between rounded-xl border border-[#D7E2D2] px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#1F4D2E]">{refund.reason}</p>
                      <p className="text-xs text-[#6B7C72]">
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
          <div className="mt-10 border-t border-[#D7E2D2] pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#5E7366]">
              Payment Reference
            </p>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-[#6B7C72]">Payment ID: </span>
                <span className="font-mono text-[#244233]">{invoice.payment.id}</span>
              </div>
              {invoice.payment.transactionRef && (
                <div>
                  <span className="text-[#6B7C72]">Transaction Ref: </span>
                  <span className="font-mono text-[#244233]">{invoice.payment.transactionRef}</span>
                </div>
              )}
              {invoice.payment.method && (
                <div>
                  <span className="text-[#6B7C72]">Method: </span>
                  <span className="text-[#244233]">{invoice.payment.method}</span>
                </div>
              )}
              {invoice.payment.paidAt && (
                <div>
                  <span className="text-[#6B7C72]">Paid at: </span>
                  <span className="text-[#244233]">{formatDate(invoice.payment.paidAt)}</span>
                </div>
              )}
              <div>
                <span className="text-[#6B7C72]">Escrow Status: </span>
                <span className="text-[#244233]">{invoice.payment.escrowStatus}</span>
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
