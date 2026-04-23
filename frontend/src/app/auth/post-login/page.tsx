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

      router.replace("/");
      router.refresh();
    }

    void resolveDestination();
  }, [router, session, status]);

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
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
        <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 text-center shadow-2xl backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
            Meramot
          </p>
          <h1 className="mt-3 text-3xl font-bold text-accent-dark">Finishing sign-in</h1>
        <p className="mt-3 text-sm text-slate-600">
          We are sending you to the correct dashboard for your account.
        </p>
        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        </div>
      </div>
    </main>
  );
}
