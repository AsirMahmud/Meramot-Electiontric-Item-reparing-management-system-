"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ResultKind = "success" | "failed" | "cancelled" | "error";

export default function PaymentResultPage() {
  const [status, setStatus] = useState<ResultKind>("error");
  const [tranId, setTranId] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextStatus = (params.get("status") || "error").toLowerCase() as ResultKind;

    setStatus(nextStatus);
    setTranId(params.get("tranId") || "");
    setPaymentId(params.get("paymentId") || "");
    setMessage(params.get("message") || "");
  }, []);

  const display = useMemo(() => {
    if (status === "success") {
      return {
        title: "Payment Successful",
        subtitle: "Your SSLCommerz payment has been verified.",
        badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      };
    }

    if (status === "cancelled") {
      return {
        title: "Payment Cancelled",
        subtitle: "You cancelled this payment session.",
        badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      };
    }

    if (status === "failed") {
      return {
        title: "Payment Failed",
        subtitle: "The gateway did not confirm this payment.",
        badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      };
    }

    return {
      title: "Payment Error",
      subtitle: "We could not complete the callback processing.",
      badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    };
  }, [status]);

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-6 md:px-4 md:py-10">
      <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:rounded-[2rem] md:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-sm">
            SSLCommerz Result
          </p>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)] md:text-3xl">{display.title}</h1>
          <p className="mt-2 text-xs text-[var(--muted-foreground)] md:text-sm">{display.subtitle}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] p-4 md:p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted-foreground)] md:text-xs">
              Status
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${display.badgeClass}`}>
              {status}
            </span>
          </div>

          {tranId ? (
            <p className="text-sm text-[var(--foreground)]">
              Transaction ID: <span className="font-semibold">{tranId}</span>
            </p>
          ) : null}

          {paymentId ? (
            <p className="text-sm text-[var(--foreground)]">
              Payment ID: <span className="font-semibold">{paymentId}</span>
            </p>
          ) : null}

          {message ? <p className="text-sm text-[var(--foreground)]">{message}</p> : null}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8">
          <Link
            href="/cart"
            className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-center text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto"
          >
            Try payment again
          </Link>

          <Link
            href="/account"
            className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-center text-sm font-semibold text-[var(--foreground)] sm:w-auto"
          >
            Go to account
          </Link>
        </div>
      </section>
    </main>
  );
}
