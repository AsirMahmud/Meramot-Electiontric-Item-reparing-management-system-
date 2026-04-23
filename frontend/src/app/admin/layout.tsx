import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF5EA] text-[#244233]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm">
          <div className="mb-8">
            <Link href="/" className="mb-2 inline-flex items-center">
              <Image
                src="/images/meramot.svg"
                alt="Meramot"
                width={160}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-[#1F4D2E]">Admin Panel</h1>
            <p className="mt-2 text-sm text-[#6B7C72]">
              Verify vendors, support users, and mediate disputes.
            </p>
          </div>

          <AdminSidebarNav />
        </aside>

        <main className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
