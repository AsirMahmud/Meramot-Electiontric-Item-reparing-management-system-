4bc9e005b7817c1c5b3c773557f6c38b0bcb14ba

const navItems = [
  { href: "/admin", label: "Dashboard" },
feature/moderation-ui
  { href: "/admin/vendors", label: "Vendor Review" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/tickets", label: "Support Tickets" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/payments", label: "Payments" },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
4bc9e005b7817c1c5b3c773557f6c38b0bcb14ba
  return (
    <div className="min-h-screen bg-[#EEF5EA] text-[#244233]">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">
              Meramot
            </p>
            <h1 className="mt-3 text-3xl font-bold text-[#1F4D2E]">Admin Panel</h1>
            <p className="mt-2 text-sm text-[#6B7C72]">
              Verify vendors, support users, and mediate disputes.
            </p>
4bc9e005b7817c1c5b3c773557f6c38b0bcb14ba
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-2xl px-4 py-3 text-sm font-medium text-[#244233] transition hover:bg-[#E6F0E2] hover:text-[#1F4D2E]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
4bc9e005b7817c1c5b3c773557f6c38b0bcb14ba
        </aside>

        <main className="rounded-[32px] border border-[#D7E2D2] bg-[#FAFAF7] p-6 shadow-sm md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

