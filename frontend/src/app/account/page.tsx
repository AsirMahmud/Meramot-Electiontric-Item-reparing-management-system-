"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const user = session?.user;

  const firstName = useMemo(() => {
    return (
      user?.name?.trim()?.split(" ")[0] ||
      (user as any)?.username?.trim()?.split(" ")[0] ||
      "User"
    );
  }, [user]);

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[#E4FCD5] px-4 py-8">
        <div className="mx-auto max-w-4xl text-[#173726]">Loading account...</div>
      </main>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#E4FCD5] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-[#214c34] hover:opacity-90"
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
            className="rounded-full border border-[#214c34] bg-white px-5 py-2 text-sm font-semibold text-[#214c34]"
          >
            Back to home
          </Link>
        </div>

        <div className="rounded-[2rem] border border-[#d9e5d5] bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">
                Account
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#173726]">
                Hi, {firstName}
              </h1>
              <p className="mt-2 text-sm text-[#5b7262]">
                Manage your customer details here.
              </p>
            </div>

            <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#d5ead8] text-3xl font-bold text-[#214c34]">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-[#f6faf4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">
                Full name
              </p>
              <p className="mt-2 text-base font-medium text-[#173726]">
                {user.name || "Not provided"}
              </p>
            </div>

            <div className="rounded-3xl bg-[#f6faf4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">
                Username
              </p>
              <p className="mt-2 text-base font-medium text-[#173726]">
                {(user as any)?.username || "Not provided"}
              </p>
            </div>

            <div className="rounded-3xl bg-[#f6faf4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">
                Email
              </p>
              <p className="mt-2 text-base font-medium text-[#173726]">
                {user.email || "Not provided"}
              </p>
            </div>

            <div className="rounded-3xl bg-[#f6faf4] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6b8270]">
                Phone
              </p>
              <p className="mt-2 text-base font-medium text-[#173726]">
                {(user as any)?.phone || "Not provided"}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/requests/new"
              className="rounded-full bg-[#214c34] px-6 py-3 text-sm font-semibold text-white"
            >
              Make request
            </Link>

            <Link
              href="/"
              className="rounded-full border border-[#214c34] bg-white px-6 py-3 text-sm font-semibold text-[#214c34]"
            >
              Continue browsing
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}