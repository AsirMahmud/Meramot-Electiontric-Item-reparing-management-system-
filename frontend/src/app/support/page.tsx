"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getSupportTickets, getCustomerDisputes } from "@/lib/support-api";

export default function SupportDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"tickets" | "disputes">("tickets");
  const [tickets, setTickets] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    if (token) {
      loadData(token);
    } else if (session !== undefined) {
      setMessage("Log in to view your support history.");
      setLoading(false);
    }
  }, [session, token]);

  const loadData = async (tok: string) => {
    setLoading(true);
    setMessage("");
    try {
      const [ticketsRes, disputesRes] = await Promise.all([
        getSupportTickets(tok),
        getCustomerDisputes(tok),
      ]);
      setTickets(ticketsRes?.data ?? []);
      setDisputes(disputesRes?.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load support data.");
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status: string) => {
    const map: Record<string, string> = {
      OPEN: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-600",
      ESCALATED: "bg-red-100 text-red-800",
      INVESTIGATING: "bg-purple-100 text-purple-800",
      WAITING_EVIDENCE: "bg-orange-100 text-orange-800",
      WAITING_RESPONSE: "bg-orange-100 text-orange-800",
    };
    const label = status.replace(/_/g, " ");
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[status] ?? "bg-gray-100 text-gray-800"}`}>
        {label}
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      <div className="mx-auto max-w-5xl px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[var(--muted-foreground)]">Help</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Customer Support</h1>
          </div>
          <Link
            href="/orders"
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--mint-50)] transition-colors"
          >
            ← Go to Orders
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] px-5 py-4 text-sm text-[var(--muted-foreground)]">
          To raise a new support ticket, go to <Link href="/orders" className="text-[var(--accent-dark)] font-medium hover:underline">your orders</Link> and use the <strong>"Raise Support Ticket"</strong> button on any active request.
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-[var(--border)]">
          <button
            className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "tickets"
              ? "border-[var(--accent-dark)] text-[var(--accent-dark)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            onClick={() => setActiveTab("tickets")}
          >
            My Tickets ({tickets.length})
          </button>
          <button
            className={`pb-3 px-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "disputes"
              ? "border-[var(--accent-dark)] text-[var(--accent-dark)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            onClick={() => setActiveTab("disputes")}
          >
            My Disputes ({disputes.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-dark)] border-t-transparent" />
          </div>
        ) : activeTab === "tickets" ? (
          <div className="space-y-4">
            {tickets.length === 0 ? (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)] shadow-sm">
                No support tickets yet. Raise one from an active order.
              </div>
            ) : (
              tickets.map((ticket) => (
                <Link key={ticket.id} href={`/support/tickets/${ticket.id}`}>
                  <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm hover:border-[var(--accent-dark)] hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--accent-dark)] transition-colors leading-tight">
                        {ticket.subject}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)] line-clamp-1">{ticket.message}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {format(new Date(ticket.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                        {ticket.repairRequestId && (
                          <span className="text-xs bg-[var(--mint-100)] text-[var(--accent-dark)] px-2 py-0.5 rounded-full">
                            Req: {ticket.repairRequestId.slice(-6)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {renderStatus(ticket.status)}
                      <span className="text-[var(--muted-foreground)]">&rarr;</span>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.length === 0 ? (
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-[var(--muted-foreground)] shadow-sm">
                No disputes found.
              </div>
            ) : (
              disputes.map((dispute) => (
                <Link key={dispute.id} href={`/support/disputes/${dispute.id}`}>
                  <article className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-4 sm:p-6 shadow-sm hover:border-[var(--accent-dark)] hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--accent-dark)] transition-colors leading-tight">
                        {dispute.reason}
                      </h2>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        Against: {dispute.against?.name || "Vendor"}
                      </p>
                      <span className="text-xs text-[var(--muted-foreground)] mt-2 block">
                        Opened: {format(new Date(dispute.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {renderStatus(dispute.status)}
                      <span className="text-[var(--muted-foreground)]">&rarr;</span>
                    </div>
                  </article>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
