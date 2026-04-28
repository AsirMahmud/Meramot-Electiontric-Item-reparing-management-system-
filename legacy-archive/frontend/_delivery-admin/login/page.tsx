"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useDeliveryAdminAuth } from "@/lib/delivery-admin-auth-context";
import { PasswordInput } from "@/components/ui/PasswordInput";

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20 text-lg font-bold text-emerald-400">
            OPS
          </div>
          <h1 className="text-2xl font-bold text-white">Delivery operations</h1>
          <p className="mt-2 text-sm text-slate-400">
            Separate sign-in from delivery partners. Approve registrations and view fleet stats.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {error ? (
            <div
              className="rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="da-identifier" className="text-sm font-semibold text-slate-200">
              Email or username
            </label>
            <input
              id="da-identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="da-password" className="text-sm font-semibold text-slate-200">
              Password
            </label>
            <PasswordInput
              id="da-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500">
          <Link href="/" className="font-medium text-emerald-500 hover:text-emerald-400">
            ← Back to marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}

function Fallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
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
