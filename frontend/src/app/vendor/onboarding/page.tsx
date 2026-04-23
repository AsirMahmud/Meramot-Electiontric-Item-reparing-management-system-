"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getVendorApplicationStatus } from "@/lib/api";

type VendorStatusPayload = {
  application?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    ownerName?: string;
    businessEmail?: string;
    shopName?: string;
    rejectionReason?: string | null;
    rejectionVisibleUntil?: string | null;
    setupComplete?: boolean;
    isPublic?: boolean;
    createdAt?: string;
  };
  message?: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function VendorOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role =
    (session?.user as { role?: string; accessToken?: string } | undefined)?.role;
  const token =
    (session?.user as { accessToken?: string } | undefined)?.accessToken;

  const [data, setData] = useState<VendorStatusPayload | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    async function load() {
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      if (role !== "VENDOR") {
        router.replace("/");
        return;
      }

      setError("");
      setLoadingStatus(true);

      try {
        let resolvedToken = token;

        for (let index = 0; index < 6 && !resolvedToken; index += 1) {
          await sleep(250);
          resolvedToken =
            (session?.user as { accessToken?: string } | undefined)?.accessToken;
        }

        if (!resolvedToken) {
          throw new Error("Vendor session token is missing. Please log in again.");
        }

        const result = await getVendorApplicationStatus(resolvedToken);
        const app = result?.application;

        if (!app) {
          throw new Error("Vendor application data was not returned by the server.");
        }

        if (app.status === "APPROVED" && app.setupComplete) {
          router.replace("/vendor/dashboard");
          return;
        }

        setData(result);
      } catch (err) {
        setData(null);
        setError(
          err instanceof Error
            ? err.message
            : "Could not load your vendor application status."
        );
      } finally {
        setLoadingStatus(false);
      }
    }

    void load();
  }, [session, status, role, router, token]);

  if (status === "loading" || loadingStatus) {
    return (
      <main className="grid min-h-screen place-items-center">
        <p className="text-sm text-slate-600">Loading vendor onboarding...</p>
      </main>
    );
  }

  if (!session?.user || role !== "VENDOR") {
    return null;
  }

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex w-full items-center justify-center">
            <Link href="/" className="inline-block -translate-x-3 transition-transform hover:scale-105">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={240}
                height={80}
                className="h-16 w-auto object-contain md:h-20"
                priority
              />
            </Link>
          </div>
          <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor</p>
            <h1 className="mt-2 text-3xl font-bold text-accent-dark">Vendor application</h1>
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
    );
  }

  const app = data?.application;

  const heading =
    app?.status === "APPROVED"
      ? "Vendor onboarding"
      : app?.status === "PENDING"
        ? "Vendor application pending"
        : app?.status === "REJECTED"
          ? "Vendor application rejected"
          : "Vendor application";

  const description =
    app?.status === "APPROVED"
      ? "Your application has been approved. You need to set up your shop first in order to make your shop live in the website."
      : app?.status === "PENDING"
        ? "Your vendor application is still under review. Once approved, you can set up your shop profile and start bidding."
        : app?.status === "REJECTED"
          ? "Your application was rejected. Review the status page for details and update the submitted information if needed."
          : "Your vendor application status is being checked.";

  return (
    <main className="min-h-screen bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex w-full items-center justify-center">
          <Link href="/" className="inline-block -translate-x-3 transition-transform hover:scale-105">
            <Image
              src="/images/meramot.svg"
              alt="Meramot"
              width={240}
              height={80}
              className="h-16 w-auto object-contain md:h-20"
              priority
            />
          </Link>
        </div>
        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Vendor</p>
          <h1 className="mt-2 text-3xl font-bold text-accent-dark">{heading}</h1>
        <p className="mt-3 text-sm text-slate-600">{description}</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">Status</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Application status:</span>{" "}
                {app?.status || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Shop setup:</span>{" "}
                {app?.setupComplete ? "Completed" : "Not completed"}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Shop visibility:</span>{" "}
                {app?.isPublic ? "Public" : "Hidden"}
              </p>
            </div>

            {app?.status === "REJECTED" && app?.rejectionReason ? (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {app.rejectionReason}
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl bg-[#f6faf4] p-5">
            <h2 className="text-lg font-semibold text-accent-dark">Next step</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/vendor/status"
                className="rounded-2xl border border-border px-5 py-3 text-center text-sm font-semibold text-slate-700"
              >
                View application status
              </Link>

              {app?.status === "APPROVED" && !app?.setupComplete ? (
                <Link
                  href="/vendor/setup-shop"
                  className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Complete shop setup
                </Link>
              ) : app?.status === "APPROVED" && app?.setupComplete ? (
                <Link
                  href="/vendor/dashboard"
                  className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Open vendor dashboard
                </Link>
              ) : (
                <Link
                  href="/"
                  className="rounded-2xl bg-accent-dark px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Go to home
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>
    </main>
  );
}
