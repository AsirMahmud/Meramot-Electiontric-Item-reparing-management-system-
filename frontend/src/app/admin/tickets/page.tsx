"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  user: {
    name?: string | null;
    email: string;
    username: string;
  };
};

export default function AdminTicketsPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets`, {
          credentials: "include",
          headers: getAuthHeaders(token),
        });
        const data = await res.json();
        if (res.ok) {
          setTickets(data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchTickets();
    }
  }, [token]);

  const table = useAdminTableState(tickets, ["subject", "user", "priority", "status", "id"] as any);

  return (
    <section>
      <div className="mb-6 md:mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] md:text-sm md:tracking-[0.28em]">Support</p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--accent-dark)] md:mt-3 md:text-4xl">Support tickets</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)] md:mt-3 md:text-lg">
          Track user complaints, payment issues, and escalations.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] bg-[var(--mint-50)] p-4 text-sm text-[var(--muted-foreground)] md:rounded-[24px] md:p-6 md:text-base">Loading tickets...</div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search tickets by subject, user, status…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-[var(--mint-50)] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[28px]">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="border-b border-[var(--border)] bg-[var(--mint-100)]">
                  <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] md:text-sm md:tracking-[0.18em]">
                    <th className="px-3 py-3 md:px-6 md:py-4">Subject</th>
                    <th className="px-3 py-3 md:px-6 md:py-4">User</th>
                    <th className="px-3 py-3 md:px-6 md:py-4">Priority</th>
                    <th className="px-3 py-3 md:px-6 md:py-4">Status</th>
                    <th className="px-3 py-3 text-right md:px-6 md:py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0] dark:divide-white/10">
                  {table.paged.map((ticket) => (
                    <tr key={ticket.id} className="border-b border-[var(--border)] transition hover:bg-[#F9FBFA] last:border-b-0 dark:hover:bg-white/5">
                      <td className="px-3 py-3 md:px-6 md:py-5">
                        <p className="text-xs font-semibold text-[var(--accent-dark)] md:text-base">{ticket.subject}</p>
                        <p className="mt-0.5 text-[9px] text-[var(--muted-foreground)] md:mt-1 md:text-sm">
                          <span className="md:hidden">{new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span className="hidden md:inline">{new Date(ticket.createdAt).toLocaleString()}</span>
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[var(--foreground)] md:px-6 md:py-5 md:text-sm">
                        <p className="line-clamp-1 font-medium">{ticket.user.name || ticket.user.username}</p>
                        <p className="line-clamp-1 text-[var(--muted-foreground)]">{ticket.user.email}</p>
                      </td>
                      <td className="px-3 py-3 text-[10px] text-[var(--foreground)] md:px-6 md:py-5 md:text-sm">{ticket.priority || "—"}</td>
                      <td className="px-3 py-3 md:px-6 md:py-5">
                        <span className="inline-block rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-[8px] font-bold text-[var(--accent-dark)] md:px-3 md:py-1 md:text-[10px]">
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right md:px-6 md:py-5">
                        <Link
                          href={`/admin/tickets/${ticket.id}`}
                          className="inline-flex items-center justify-center rounded-full bg-[var(--accent-dark)] px-3 py-1.5 text-center text-[10px] font-semibold text-[var(--accent-foreground)] shadow-lg shadow-[#1F4D2E]/20 transition hover:opacity-90 md:px-4 md:py-2 md:text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!tickets.length && <div className="p-4 text-sm text-[var(--muted-foreground)] md:p-6 md:text-base">No tickets found.</div>}
          </div>
        </>
      )}
    </section>
  );
}
