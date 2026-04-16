"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getVendorApplicationStatus } from "@/lib/api";

type VendorStatusPayload = {
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    ownerName: string;
    businessEmail: string;
    shopName: string;
    rejectionReason?: string | null;
    rejectionVisibleUntil?: string | null;
    createdAt: string;
  };
  message?: string;
};

export default function VendorStatusPage() {
  const { data: session, status } = useSession();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [data, setData] = useState<VendorStatusPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    async function load() {
      try {
        if (!token) {
          throw new Error("Please log in first.");
        }

        const result = await getVendorApplicationStatus(token);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load status.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [status, token]);

  if (status === "loading" || loading) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-600">Loading vendor status...</p>
      </main>
    );
  }

  const app = data?.application;

  if (error || !data || !app) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-lg">
          <p className="text-red-600">
            {error || data?.message || "Could not load status."}
          </p>

          <Link
            href="/login"
            className="mt-4 inline-block rounded-2xl bg-accent-dark px-5 py-3 text-sm font-semibold text-white"
          >
            Back to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="w-full max-w-3xl rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-bold text-accent-dark">
          Vendor Application Status
        </h1>

        <div className="mt-6 space-y-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Application ID:</span> {app.id}
          </p>
          <p>
            <span className="font-semibold">Owner:</span> {app.ownerName}
          </p>
          <p>
            <span className="font-semibold">Business email:</span> {app.businessEmail}
          </p>
          <p>
            <span className="font-semibold">Shop name:</span> {app.shopName}
          </p>
          <p>
            <span className="font-semibold">Status:</span> {app.status}
          </p>
        </div>

        {app.status === "PENDING" ? (
          <div className="mt-6 rounded-2xl bg-yellow-50 px-4 py-4 text-sm text-yellow-800">
            <p className="font-semibold">Your application is under review.</p>
            <p className="mt-1">
              Please check back later. You can also update your submitted information if needed.
            </p>
          </div>
        ) : null}

        {app.status === "REJECTED" ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
            <p className="font-semibold text-base">Your application was rejected.</p>

            <div className="mt-3 rounded-xl bg-white/70 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
                Rejection reason
              </p>
              <p className="mt-2">
                {app.rejectionReason?.trim() || "No rejection reason was provided."}
              </p>
            </div>

            {app.rejectionVisibleUntil ? (
              <p className="mt-3">
                Visible until:{" "}
                <span className="font-semibold">
                  {new Date(app.rejectionVisibleUntil).toLocaleDateString()}
                </span>
              </p>
            ) : null}

            <p className="mt-3">
              Contact admin: <span className="font-semibold">support@meeramoot.com</span>
            </p>
          </div>
        ) : null}

        {app.status === "APPROVED" ? (
          <div className="mt-6 rounded-2xl bg-green-50 px-4 py-4 text-sm text-green-800">
            <p className="font-semibold">Your application has been approved.</p>
            <p className="mt-1">
              You can now continue to vendor onboarding.
            </p>
          </div>
        ) : null}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {(app.status === "PENDING" || app.status === "REJECTED") && (
            <Link
              href="/vendor/apply"
              className="rounded-2xl border border-border px-5 py-3 text-center text-sm font-semibold text-slate-700"
            >
              Edit submitted information
            </Link>
          )}

          {app.status === "APPROVED" && (
            <Link
              href="/vendor/onboarding"
              className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Continue to onboarding
            </Link>
          )}

          <Link
            href="/login"
            className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}