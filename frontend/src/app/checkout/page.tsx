"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { initSslCommerzPayment } from "@/lib/api";

type CheckoutForm = {
  amount: string;
  currency: string;
  productName: string;
  repairRequestId: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>({
    amount: "100",
    currency: "BDT",
    productName: "Repair service payment",
    repairRequestId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("meramot.token");

    if (!token) {
      router.push("/login");
    }
  }, [router]);

  async function handlePayNow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const amount = Number(form.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Amount must be a positive number.");
      }

      const response = await initSslCommerzPayment({
        amount,
        currency: form.currency.trim().toUpperCase(),
        productName: form.productName.trim() || "Repair service payment",
        ...(form.repairRequestId.trim()
          ? { repairRequestId: form.repairRequestId.trim() }
          : {}),
      });

      if (!response?.data?.gatewayUrl) {
        throw new Error("Gateway URL missing from payment init response.");
      }

      window.location.href = response.data.gatewayUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize payment.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-6 md:px-4 md:py-10">
      <section className="mx-auto max-w-2xl rounded-[1.5rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:rounded-[2rem] md:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Checkout
            </p>
            <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)] md:text-3xl">Pay With SSLCommerz</h1>
            <p className="mt-2 text-xs text-[var(--muted-foreground)] md:text-sm">
              Start a secure payment session and continue on SSLCommerz.
            </p>
          </div>

          <Link
            href="/account"
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Back
          </Link>
        </div>

        <form className="space-y-4" onSubmit={handlePayNow}>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Amount
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
              placeholder="100"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Currency
            </label>
            <input
              type="text"
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
              placeholder="BDT"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Product Name
            </label>
            <input
              type="text"
              value={form.productName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, productName: event.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
              placeholder="Repair service payment"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              Repair Request ID (optional)
            </label>
            <input
              type="text"
              value={form.repairRequestId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, repairRequestId: event.target.value }))
              }
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)]"
              placeholder="cuid"
            />
          </div>

          {error ? <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Redirecting to gateway..." : "Pay now"}
          </button>
        </form>
      </section>
    </main>
  );
}
