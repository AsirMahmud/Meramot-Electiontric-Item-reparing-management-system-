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
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Support</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Support tickets</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Track user complaints, payment issues, and escalations.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading tickets...</div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF]">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-[#D7E2D2] bg-[#E6F0E2]">
                <tr className="text-left text-sm uppercase tracking-[0.18em] text-[#5E7366]">
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
                  <tr key={ticket.id} className="border-b border-[#D7E2D2] last:border-b-0">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-[#1F4D2E]">{ticket.subject}</p>
                      <p className="mt-1 text-sm text-[#6B7C72]">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#244233]">
                      <p>{ticket.user.name || ticket.user.username}</p>
                      <p className="text-[#6B7C72]">{ticket.user.email}</p>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#244233]">{ticket.category}</td>
                    <td className="px-6 py-5 text-sm text-[#244233]">{ticket.priority}</td>
                    <td className="px-6 py-5">
                      <span className="rounded-full bg-[#E6F0E2] px-3 py-1 text-xs font-semibold text-[#1F4D2E]">
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/admin/tickets/${ticket.id}`}
                        className="rounded-full bg-[#1F4D2E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#183D24]"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!tickets.length && <div className="p-6 text-[#6B7C72]">No tickets found.</div>}
        </div>
      )}
    </section>
  );
}
