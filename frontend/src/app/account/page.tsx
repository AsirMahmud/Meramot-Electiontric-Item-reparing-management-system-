"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type StoredUser = {
  id: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [user] = useState<StoredUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const rawUser = localStorage.getItem("meramot.user");
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser) as StoredUser;
    } catch {
      localStorage.removeItem("meramot.user");
      localStorage.removeItem("meramot.token");
      return null;
    }
  });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [router, user]);

  const firstName = useMemo(() => {
    return (
      user?.name?.trim()?.split(" ")[0] ||
      user?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [user]);

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] px-4 py-8">
        <div className="mx-auto max-w-4xl text-[var(--foreground)]">Loading account...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-3 py-4 md:px-4 md:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[var(--foreground)] hover:opacity-90"
          >
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={150}
              height={48}
              className="h-10 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Back to Home
          </Link>
        </div>

        <div className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm md:rounded-[2rem] md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-sm">
                Account
              </p>
              <h1 className="mt-1 text-2xl font-bold text-[var(--foreground)] md:mt-2 md:text-3xl">
                Hi, {firstName}
              </h1>
              <p className="mt-1 text-xs text-[var(--muted-foreground)] md:mt-2 md:text-sm">
                Manage your customer details here.
              </p>
            </div>

            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--mint-200)] text-2xl font-bold text-[var(--accent-dark)] md:h-20 md:w-20 md:rounded-3xl md:text-3xl">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 md:gap-4">
            <div className="rounded-2xl bg-[var(--mint-50)] p-4 md:rounded-3xl md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-xs">
                Full name
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)] md:text-base">
                {user.name || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--mint-50)] p-4 md:rounded-3xl md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-xs">
                Username
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)] md:text-base">
                {user.username || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--mint-50)] p-4 md:rounded-3xl md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-xs">
                Email
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)] md:text-base">
                {user.email || "Not provided"}
              </p>
            </div>

            <div className="rounded-2xl bg-[var(--mint-50)] p-4 md:rounded-3xl md:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] md:text-xs">
                Phone
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--foreground)] md:text-base">
                {user.phone || "Not provided"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap md:mt-8">
            <Link
              href="/requests/new"
              className="w-full rounded-full bg-[var(--accent-dark)] px-6 py-3 text-center text-sm font-semibold text-[var(--accent-foreground)] sm:w-auto"
            >
              Make request
            </Link>

            <Link
              href="/"
              className="w-full rounded-full border border-[var(--border)] bg-[var(--card)] px-6 py-3 text-center text-sm font-semibold text-[var(--foreground)] sm:w-auto"
            >

              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
