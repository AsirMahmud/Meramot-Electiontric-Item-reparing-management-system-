"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const role = (session?.user as { role?: string } | undefined)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (role !== "ADMIN") {
      router.replace("/");
    }
  }, [session, status, role, router]);

  if (status === "loading") {
    return <div>Loading admin dashboard...</div>;
  }

  if (!session?.user || role !== "ADMIN") {
    return null;
  }

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">
          Admin
        </p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Dashboard</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Link href="/admin/vendors" className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Vendors</p>
          <p className="mt-3 text-2xl font-bold text-[#1F4D2E]">Vendor Review</p>
        </Link>

        <Link href="/admin/finance" className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">Finance</p>
          <p className="mt-3 text-2xl font-bold text-[#1F4D2E]">Finance Ledger</p>
        </Link>
      </div>
    </section>
  );
}