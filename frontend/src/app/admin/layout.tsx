import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF5EA] text-[#244233]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-6">
          <div>
            <Link href="/" className="inline-block transition-transform hover:scale-105">
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
          <aside className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">
                Meramot
              </p>
            <h1 className="mt-3 text-3xl font-bold text-[#1F4D2E]">Admin Panel</h1>
            <p className="mt-2 text-sm text-[#6B7C72]">
              Verify vendors, support users, and mediate disputes.
            </p>
          </div>

          <AdminSidebarNav />
          </aside>
        </div>

        <main className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
