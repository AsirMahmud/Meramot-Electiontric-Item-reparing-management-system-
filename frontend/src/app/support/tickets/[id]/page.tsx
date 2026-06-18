"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getSupportTicketDetails, replyToSupportTicket } from "@/lib/support-api";

export default function TicketDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    if (token && id) {
      loadTicket(token);
    } else if (session !== undefined && !token) {
      setMessage("Log in to view this ticket.");
      setLoading(false);
    }
  }, [session, token, id]);

  const loadTicket = async (tok: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await getSupportTicketDetails(tok, id);
      if (res?.data) {
        setTicket(res.data);
      } else {
        setMessage("Ticket not found.");
        router.push("/support");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error loading ticket.");
      router.push("/support");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !replyMessage.trim()) return;

    setSending(true);
    setMessage("");
    try {
      await replyToSupportTicket(token, id, { message: replyMessage });
      setReplyMessage("");
      setMessage("Reply sent successfully.");
      loadTicket(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error sending reply.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--accent-dark)] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!ticket) return null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <Navbar isLoggedIn={!!session?.user} firstName={session?.user?.name?.split(" ")[0]} />

      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 md:py-8">
        <div className="mb-6">
          <Link href="/support" className="text-[var(--accent-dark)] hover:underline inline-flex items-center gap-2 font-medium text-sm">
            &larr; Back to Support
          </Link>
        </div>

        {message && (
          <div className="mb-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
            {message}
          </div>
        )}

        {/* Ticket header */}
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--mint-50)]">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{ticket.subject}</h1>
              <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-bold uppercase text-[var(--accent-dark)] whitespace-nowrap">
                {ticket.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)]">
              <span>Ticket ID: {ticket.id.slice(-8).toUpperCase()}</span>
              <span>Opened: {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
              {ticket.repairRequestId && (
                <Link href={`/orders`} className="text-[var(--accent-dark)] hover:underline">
                  View Orders
                </Link>
              )}
            </div>
          </div>

          {/* Messages thread */}
          <div className="p-5 sm:p-6 flex flex-col gap-5 max-h-[55vh] overflow-y-auto">
            {ticket.messages?.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No messages yet.</p>
            ) : (
              ticket.messages?.map((msg: any) => {
                const isCustomer = msg.senderType === "CUSTOMER";
                return (
                  <div key={msg.id} className={`flex flex-col ${isCustomer ? "items-end" : "items-start"}`}>
                    <div className="flex items-end gap-2 max-w-[85%]">
                      {!isCustomer && (
                        <div className="w-8 h-8 rounded-full bg-[var(--accent-dark)] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                          A
                        </div>
                      )}
                      <div className={`p-4 rounded-2xl text-sm whitespace-pre-wrap ${isCustomer
                        ? "bg-[var(--accent-dark)] text-white rounded-tr-sm"
                        : "bg-[var(--mint-100)] text-[var(--foreground)] rounded-tl-sm border border-[var(--border)]"}`}>
                        {msg.message}
                      </div>
                      {isCustomer && (
                        <div className="w-8 h-8 rounded-full bg-[var(--mint-200)] flex-shrink-0 flex items-center justify-center text-[var(--foreground)] text-xs font-bold">
                          U
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)] mt-1 px-10">
                      {format(new Date(msg.createdAt), "MMM d, h:mm a")}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Reply box */}
          <div className="p-5 sm:p-6 border-t border-[var(--border)]">
            {ticket.status === "CLOSED" ? (
              <p className="text-center text-sm text-[var(--muted-foreground)] py-2">
                This ticket is closed and can no longer receive replies.
              </p>
            ) : (
              <form onSubmit={handleReply} className="flex gap-3">
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here..."
                  className="flex-1 rounded-xl border border-[var(--border)] px-4 py-3 bg-[var(--background)] text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)] resize-none"
                  rows={2}
                />
                <button
                  type="submit"
                  disabled={sending || !replyMessage.trim()}
                  className="rounded-full bg-[var(--accent-dark)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50 self-end whitespace-nowrap"
                >
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
