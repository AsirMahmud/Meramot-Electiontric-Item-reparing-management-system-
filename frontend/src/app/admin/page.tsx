"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";
import Link from "next/link";

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
        { label: "Total Users", value: stats.totalUsers, href: "/admin/users" },
        { label: "Vendors", value: stats.totalVendors, href: "/admin/vendors" },
        { label: "Delivery Users", value: stats.totalDeliveryUsers, href: "/admin/delivery" },
        { label: "Pending Vendor Review", value: stats.pendingVendorApplications, href: "/admin/vendors" },
        { label: "Open Tickets", value: stats.openTickets, href: "/admin/tickets" },
        { label: "Active Disputes", value: stats.activeDisputes, href: "/admin/disputes" },
        { label: "Pending Refunds", value: stats.pendingRefunds, href: "/admin/payments" },
      ]
    : [];

    return (
      <section>
        <div className="mb-4 md:mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground md:text-sm">
            Dashboard
          </p>
    
          <h2 className="mt-2 text-2xl font-bold text-accent-dark md:mt-3 md:text-4xl">
            Admin Overview
          </h2>
    
          <p className="mt-2 text-xs text-muted-foreground md:mt-3 md:text-lg">
            Monitor platform health, vendor approvals, customer support, and financial mediation.
          </p>
        </div>
    
        {loading ? (
          <div className="rounded-[24px] bg-mint-50 p-6 text-muted-foreground">
            Loading dashboard...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 md:gap-5 xl:grid-cols-3">
            {cards.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className="group flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-border bg-mint-50 p-2 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md hover:border-accent-dark/30 sm:block sm:aspect-auto sm:text-left md:rounded-[28px] md:p-6"
              >
                <p className="mb-1 text-[10px] font-bold uppercase leading-tight tracking-wider text-muted-foreground transition-colors group-hover:text-accent-dark sm:mb-0 sm:text-xs sm:font-semibold sm:tracking-[0.22em]">
                  {card.label}
                </p>
    
                <p className="text-2xl font-extrabold leading-none text-accent-dark sm:mt-2 sm:font-bold md:mt-4 md:text-4xl">
                  {card.value}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    );
}
