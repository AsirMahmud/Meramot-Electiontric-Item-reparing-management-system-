"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

type Ticket = {
  id: string;
  subject: string;
  category: string;
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
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets`, {
          credentials: "include",
          headers: getAuthHeaders(),
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

    fetchTickets();
  }, []);

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Support</p>
        <h2 className="mt-3 text-4xl font-bold text-[var(--accent-dark)]">Support tickets</h2>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
          Track user complaints, payment issues, and escalations.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading tickets...</div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[var(--border)] bg-[var(--mint-100)]">
                <tr className="text-left text-sm uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[var(--accent-dark)]">{ticket.subject}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--foreground)]">
                      <p>{ticket.user.name || ticket.user.username}</p>
                      <p className="text-[var(--muted-foreground)]">{ticket.user.email}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[var(--foreground)]">{ticket.category}</td>
                    <td className="px-6 py-5 text-sm text-[var(--foreground)]">{ticket.priority}</td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-semibold text-[var(--accent-dark)]">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="rounded-full bg-[var(--accent-dark)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!tickets.length && <div className="p-6 text-[var(--muted-foreground)]">No tickets found.</div>}
        </div>
      )}
    </section>
  );
}
