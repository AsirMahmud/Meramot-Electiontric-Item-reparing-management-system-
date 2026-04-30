"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

import { useSession } from "next-auth/react";

type DashboardStats = {
  totalUsers: number;
  totalVendors: number;
  totalDeliveryUsers: number;
  pendingVendorApplications: number;
  openTickets: number;
  activeDisputes: number;
  pendingRefunds: number;
};

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = (session?.user as any)?.accessToken;
    if (!token) return;

    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setStats(data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [session]);

  const cards = stats
    ? [
        { label: "Total Users", value: stats.totalUsers },
        { label: "Vendors", value: stats.totalVendors },
        { label: "Delivery Users", value: stats.totalDeliveryUsers },
        { label: "Pending Vendor Review", value: stats.pendingVendorApplications },
        { label: "Open Tickets", value: stats.openTickets },
        { label: "Active Disputes", value: stats.activeDisputes },
        { label: "Pending Refunds", value: stats.pendingRefunds },
      ]
    : [];

  return (
    <section>
      <div className="mb-4 md:mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)] md:text-sm">
          Dashboard
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--accent-dark)] md:mt-3 md:text-4xl">Admin Overview</h2>
        <p className="mt-2 text-xs text-[var(--muted-foreground)] md:mt-3 md:text-lg">
          Monitor platform health, vendor approvals, customer support, and financial mediation.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading dashboard...</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-5 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[1.25rem] border border-[var(--border)] bg-[var(--mint-50)] p-4 md:rounded-[28px] md:p-6"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted-foreground)]">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-[var(--accent-dark)] md:mt-4 md:text-4xl">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
