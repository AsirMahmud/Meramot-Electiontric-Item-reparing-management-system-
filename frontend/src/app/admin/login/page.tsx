"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const DEMO_ADMIN_IDENTIFIER = "admin@meeramoot.demo";
const DEMO_ADMIN_PASSWORD = "AdminDemo123!";

type AdminLoginResponse = {
  message: string;
  token: string;
  user: {
    id: string;
    name?: string | null;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  };
};

export default function AdminLoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState(DEMO_ADMIN_IDENTIFIER);
  const [password, setPassword] = useState(DEMO_ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const apiBase = useMemo(() => {
    return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/auth/admin-demo-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = (await response.json().catch(() => null)) as AdminLoginResponse | null;

      if (!response.ok || !data?.token || !data?.user) {
        throw new Error(data?.message || "Invalid admin credentials");
      }

      if (data.user.role !== "ADMIN") {
        throw new Error("This page only allows admin accounts.");
      }

      localStorage.setItem("meramot.token", data.token);
      localStorage.setItem("meramot.user", JSON.stringify(data.user));
      window.dispatchEvent(new Event("meramot-auth-changed"));

      router.replace("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in as admin.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoCredentials() {
    setIdentifier(DEMO_ADMIN_IDENTIFIER);
    setPassword(DEMO_ADMIN_PASSWORD);
    setError("");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#f6faf3_0%,_#e8f2e3_48%,_#d8e8d2_100%)] px-4 py-12">
      <section className="w-full max-w-md rounded-[32px] border border-[#c9dbc3] bg-white/90 p-7 shadow-xl backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#5b7567]">
          Admin Only
        </p>
        <h1 className="mt-3 text-3xl font-bold text-[#1f4d2e]">Admin Login</h1>
        <p className="mt-2 text-sm text-[#5f7668]">
          Use the demonstration credentials below to access the admin panel.
        </p>

        <div className="mt-5 rounded-2xl border border-[#d6e4d2] bg-[#f5faf2] p-4 text-sm text-[#2f4d3d]">
          <p>
            <span className="font-semibold">Identifier:</span> {DEMO_ADMIN_IDENTIFIER}
          </p>
          <p className="mt-1">
            <span className="font-semibold">Password:</span> {DEMO_ADMIN_PASSWORD}
          </p>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="mt-3 inline-flex rounded-xl border border-[#bed2b8] bg-white px-3 py-2 text-xs font-semibold text-[#2f4d3d] transition hover:bg-[#ebf5e6]"
          >
            Fill demo credentials
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <label className="block text-sm font-semibold text-[#294637]">
            Identifier
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#c8d9c2] bg-white px-4 py-2.5 text-sm text-[#1f3a2d] outline-none transition focus:border-[#8ab58c] focus:ring-2 focus:ring-[#d8ebd4]"
              placeholder="admin@meeramoot.demo"
              autoComplete="username"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-[#294637]">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-2xl border border-[#c8d9c2] bg-white px-4 py-2.5 text-sm text-[#1f3a2d] outline-none transition focus:border-[#8ab58c] focus:ring-2 focus:ring-[#d8ebd4]"
              placeholder="AdminDemo123!"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? <p className="text-sm font-medium text-[#b42318]">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[#1f4d2e] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#183c24] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in as admin"}
          </button>
        </form>

        <div className="mt-5 text-center text-sm text-[#5f7668]">
          <Link href="/login" className="font-semibold text-[#1f4d2e] underline-offset-4 hover:underline">
            Go to customer login
          </Link>
        </div>
      </section>
    </main>
  );
}
