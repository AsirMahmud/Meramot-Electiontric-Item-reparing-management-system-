"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/lib/api";

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/dashboard`, {
          credentials: "include",
          headers: getAuthHeaders(),
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
  }, []);

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
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">
          Dashboard
        </p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Admin overview</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Monitor platform health, vendor approvals, customer support, and financial mediation.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading dashboard...</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">
                {card.label}
              </p>
              <p className="mt-4 text-4xl font-bold text-[#1F4D2E]">{card.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
