"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, signup } from "@/lib/api";

type Mode = "login" | "signup";

export default function AuthCard({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignup) {
        if (form.password !== form.confirm) {
          throw new Error("Passwords do not match.");
        }
        const data = await signup({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        localStorage.setItem("meramot.token", data.token);
        localStorage.setItem("meramot.user", JSON.stringify(data.user));
      } else {
        const data = await login({ identifier: form.email.trim(), password: form.password });
        localStorage.setItem("meramot.token", data.token);
        localStorage.setItem("meramot.user", JSON.stringify(data.user));
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authenticate.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-mint-300 text-xl font-black text-accent-dark">
          M
        </div>
        <h1 className="text-3xl font-bold text-accent-dark">{isSignup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignup ? "Sign up to request repairs, compare shops, and save viewed items." : "Log in to continue to your customer dashboard."}
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {isSignup && (
          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            placeholder="Username"
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
          />
        )}
        <input
          className="w-full rounded-2xl border border-border px-4 py-3"
          type={isSignup ? "email" : "text"}
          placeholder={isSignup ? "Email" : "Username or email"}
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
        />
        <input
          className="w-full rounded-2xl border border-border px-4 py-3"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
        />
        {isSignup && (
          <input
            className="w-full rounded-2xl border border-border px-4 py-3"
            type="password"
            placeholder="Confirm password"
            value={form.confirm}
            onChange={(event) => setForm((prev) => ({ ...prev, confirm: event.target.value }))}
          />
        )}

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-accent-dark py-3 font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Please wait..." : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <button className="w-full rounded-2xl border border-border bg-mint-50 py-3 font-semibold text-accent-dark shadow-sm">
        Continue with Google
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Hook this button to Auth.js Google provider so social sign-in also creates a database-backed user record.
      </p>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isSignup ? "Already have an account?" : "Need an account?"}{" "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent-dark underline underline-offset-4">
          {isSignup ? "Log in" : "Sign up"}
        </Link>
      </p>
    </div>
  );
}
