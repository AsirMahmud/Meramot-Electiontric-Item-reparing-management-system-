"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { getVendorApplicationStatus } from "@/lib/api";

type SessionUser = {
  role?: string | null;
  accessToken?: string | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function PostLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [error, setError] = useState("");

  async function getResolvedSessionUserWithRetry(): Promise<SessionUser | undefined> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
      });
      const data = await response.json().catch(() => undefined);
      const user = data?.user as SessionUser | undefined;

      if (user?.role || user?.accessToken || !session?.user) {
        return user;
      }

      await sleep(250);
    }

    const finalResponse = await fetch("/api/auth/session", {
      cache: "no-store",
    });
    const finalData = await finalResponse.json().catch(() => undefined);
    return finalData?.user as SessionUser | undefined;
  }

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    async function resolveDestination() {
      if (!session?.user) {
        router.replace("/login");
        return;
      }

      const resolvedSessionUser = await getResolvedSessionUserWithRetry();
      const role = resolvedSessionUser?.role ?? null;
      const accessToken = resolvedSessionUser?.accessToken ?? null;

      if (!role) {
        setError("Your session is missing account details. Please try signing in again.");
        return;
      }

      if (role === "ADMIN") {
        router.replace("/admin/vendors");
        router.refresh();
        return;
      }

      if (role === "VENDOR") {
        if (!accessToken) {
          router.replace("/vendor/onboarding");
          return;
        }

        try {
          const result = await getVendorApplicationStatus(accessToken);
          const application = result?.application;

          if (application?.status === "APPROVED" && application?.setupComplete) {
            router.replace("/vendor/dashboard");
            router.refresh();
            return;
          }

          // Let approved-but-not-setup vendors fall through to /vendor/onboarding

          router.replace("/vendor/onboarding");
          return;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not determine your vendor onboarding status."
          );
          return;
        }
      }

      if (role === "DELIVERY") {
        router.replace("/delivery");
        router.refresh();
        return;
      }

      router.replace("/");
      router.refresh();
    }

    void resolveDestination();
  }, [router, session, status]);

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
        <div className="w-full max-w-md rounded-[2rem] border border-red-200 bg-red-50 p-8 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold text-red-700">
            {error}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-full bg-red-100 px-6 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-200"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
