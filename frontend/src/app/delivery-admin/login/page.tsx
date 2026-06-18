"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useDeliveryAdminAuth } from "@/lib/delivery-admin-auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useDeliveryAdminAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(identifier.trim(), password);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/delivery-admin") ? next : "/delivery-admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--mint-100)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Image
            src="/images/meramot.svg"
            alt="Meramot"
            width={220}
            height={72}
            className="mx-auto mb-4 h-14 w-auto object-contain"
            priority
          />
          <h1 className="text-2xl font-bold text-[var(--accent-dark)]">Delivery operations</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Separate sign-in from delivery partners. Approve registrations and view fleet stats.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="da-identifier" className="text-sm font-semibold text-[var(--foreground)]">
              Email or username
            </label>
            <input
              id="da-identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--mint-100)]"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="da-password" className="text-sm font-semibold text-[var(--foreground)]">
              Password
            </label>
            <input
              id="da-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--foreground)] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--mint-100)]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent-dark)] py-3.5 text-base font-bold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[var(--muted-foreground)]">
          <Link href="/" className="font-medium text-[var(--accent-dark)] hover:opacity-80">
            ← Back to marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="min-h-screen bg-[var(--mint-100)] flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-dark)] border-t-transparent" />
    </div>
  );
}

export default function DeliveryAdminLoginPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <LoginForm />
    </Suspense>
  );
}
