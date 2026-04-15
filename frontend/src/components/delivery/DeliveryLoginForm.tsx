"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export default function DeliveryLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useDeliveryAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(identifier.trim(), password);
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/delivery") ? next : "/delivery");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#163625] text-lg font-bold text-[#E4FCD5]">
            LF
          </div>
          <h1 className="text-2xl font-bold text-[#163625]">Partner sign in</h1>
          <p className="mt-2 text-sm font-medium text-[#163625]/60">
            Delivery accounts are separate from customer login.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {error ? (
            <div
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
              role="alert"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label htmlFor="dl-identifier" className="text-sm font-semibold text-[#163625]">
              Email or username
            </label>
            <input
              id="dl-identifier"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none transition focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="dl-password" className="text-sm font-semibold text-[#163625]">
              Password
            </label>
            <input
              id="dl-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[#d9e5d5] px-4 py-3 text-[#163625] outline-none transition focus:border-[#4C9E36] focus:ring-2 focus:ring-[#E4FCD5]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#163625] py-3.5 text-base font-bold text-[#E4FCD5] transition hover:bg-[#0d2217] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#163625]/70">
          New partner?{" "}
          <Link href="/delivery/signup" className="font-bold text-[#163625] underline-offset-2 hover:underline">
            Create a delivery account
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-[#163625]/50">
          <Link href="/" className="font-medium hover:text-[#163625]">
            ← Back to marketplace
          </Link>
        </p>
      </div>
    </div>
  );
}
