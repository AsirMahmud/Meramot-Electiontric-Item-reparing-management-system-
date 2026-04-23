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
        badgeClass: "bg-[#dff3d7] text-[#215235]",
      };
    }

    if (status === "cancelled") {
      return {
        title: "Payment Cancelled",
        subtitle: "You cancelled this payment session.",
        badgeClass: "bg-[#fff1d8] text-[#6a4a10]",
      };
    }

    if (status === "failed") {
      return {
        title: "Payment Failed",
        subtitle: "The gateway did not confirm this payment.",
        badgeClass: "bg-[#ffe3de] text-[#7a2f1d]",
      };
    }

    return {
      title: "Payment Error",
      subtitle: "We could not complete the callback processing.",
      badgeClass: "bg-[#ffe3de] text-[#7a2f1d]",
    };
  }, [status]);

  return (
    <main className="min-h-screen bg-[#f2f7ef] px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
            SSLCommerz Result
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#173726]">{display.title}</h1>
          <p className="mt-2 text-sm text-[#5b7262]">{display.subtitle}</p>
        </div>

        <div className="space-y-3 rounded-2xl border border-[#d9e5d5] bg-[#f8fbf6] p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b8270]">
              Status
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${display.badgeClass}`}>
              {status}
            </span>
          </div>

          {tranId ? (
            <p className="text-sm text-[#2d4638]">
              Transaction ID: <span className="font-semibold">{tranId}</span>
            </p>
          ) : null}

          {paymentId ? (
            <p className="text-sm text-[#2d4638]">
              Payment ID: <span className="font-semibold">{paymentId}</span>
            </p>
          ) : null}

          {message ? <p className="text-sm text-[#2d4638]">{message}</p> : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/checkout"
            className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
          >
            Try payment again
          </Link>

          <Link
            href="/account"
            className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]"
          >
            Go to account
          </Link>
        </div>
      </section>
    </main>
  );
}
