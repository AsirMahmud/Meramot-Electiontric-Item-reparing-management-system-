import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import ThemeToggle from "@/components/theme/ThemeToggle";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/finance", label: "Financial Ledger" },
  { href: "/admin/vendors", label: "Vendor Review" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/tickets", label: "Support Tickets" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/payments", label: "Payments" },
];

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

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--mint-100)] hover:text-[var(--accent-dark)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
      </div>

        <main className="rounded-[32px] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}