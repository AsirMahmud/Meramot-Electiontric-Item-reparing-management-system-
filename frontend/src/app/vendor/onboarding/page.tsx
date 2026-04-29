"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function VendorOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.replace("/login");
      return;
    }

    if (role !== "VENDOR") {
      router.replace("/");
    }
  }, [session, status, role, router]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-600">Loading vendor onboarding...</p>
      </main>
    );
  }

  if (!session?.user || role !== "VENDOR") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
          Vendor
        </p>
        <h1 className="mt-2 text-3xl font-bold text-accent-dark">
          Vendor Onboarding
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Your application was approved. This page is now active, so approved vendors
          will no longer hit a 404. You can expand this into your real vendor setup flow.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">Next steps</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li>Complete shop profile</li>
              <li>Add specialties / skill tags</li>
              <li>Configure pickup / repair / spare parts services</li>
              <li>Review vendor dashboard access</li>
            </ul>
          </div>

          <div className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">Navigation</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/vendor/status"
                className="rounded-2xl border border-border px-5 py-3 text-center text-sm font-semibold text-slate-700"
              >
                View application status
              </Link>

              <Link
                href="/"
                className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
              >
                Go to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}