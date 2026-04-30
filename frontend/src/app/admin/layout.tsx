import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user) {
    redirect("/login");
  }

  if (role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
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
            <ThemeToggle />
          </div>
          <aside className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="mb-8">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                Meramot
              </p>
              <h1 className="mt-3 text-3xl font-bold text-[var(--accent-dark)]">
                Admin Panel
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Verify vendors, support users, and mediate disputes.
              </p>
            </div>

            <AdminSidebarNav />
          </aside>
        </div>

        <main className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}