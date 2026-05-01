"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";

type Message = {
  id: string;
  message: string;
  senderType: string;
  createdAt: string;
  author?: {
    name?: string | null;
    email: string;
    role: string;
  };
};

type Ticket = {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  priority: string;
  adminNotes: string | null;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    email: string;
    username: string;
  };
  assignedAdmin?: {
    name?: string | null;
    email: string;
  } | null;
  repairRequest?: {
    id: string;
    title: string;
  } | null;
  messages: Message[];
};

export default function AdminTicketDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  // Action Panel State
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  
  const [adminNoteInput, setAdminNoteInput] = useState("");
  const [statusInput, setStatusInput] = useState("");
  const [priorityInput, setPriorityInput] = useState("");
  const [isUpdatingProps, setIsUpdatingProps] = useState(false);
  const [isEscalating, setIsEscalating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(token),
        });
        const data = await res.json();
        if (res.ok) {
          setTicket(data.data);
          setStatusInput(data.data.status);
          setPriorityInput(data.data.priority);
          setAdminNoteInput(data.data.adminNotes || "");
        } else {
          alert(data.message || "Failed to load ticket");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id && token) fetchTicket();
  }, [id, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      setIsSendingReply(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets/${id}/reply`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ message: replyMessage }),
      });

      const data = await res.json();
      if (res.ok) {
        setTicket((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "IN_PROGRESS",
            messages: [...prev.messages, data.data],
          };
        });
        setReplyMessage("");
        setStatusInput("IN_PROGRESS");
      } else {
        alert(data.message || "Failed to send reply");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleUpdateProperties = async () => {
    try {
      setIsUpdatingProps(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({
            status: statusInput,
            priority: priorityInput,
            adminNotes: adminNoteInput,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setTicket((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: statusInput,
            priority: priorityInput,
            adminNotes: adminNoteInput,
          };
        });
        alert("Ticket properties updated.");
      } else {
        alert(data.message || "Failed to update ticket");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating ticket.");
    } finally {
      setIsUpdatingProps(false);
    }
  };

  const handleEscalate = async () => {
      if (!window.confirm("Are you sure you want to escalate this ticket to a dispute?")) {
          return;
      }

      try {
        setIsEscalating(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tickets/${id}/escalate`, {
          method: "POST",
          credentials: "include",
          headers: getAuthHeaders(token),
        });
  
        const data = await res.json();
        if (res.ok) {
          alert("Ticket escalated successfully!");
          router.push(`/admin/disputes/${data.data.id}`);
        } else {
          alert(data.message || "Failed to escalate ticket");
        }
      } catch (error) {
        console.error(error);
        alert("Error escalating ticket.");
      } finally {
        setIsEscalating(false);
      }
  };

  if (loading) {
    return <div className="p-8 text-[var(--muted-foreground)]">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-8 text-[var(--muted-foreground)]">
        Ticket not found. <Link href="/admin/tickets" className="underline">Go back</Link>
      </div>
    );
  }

  const isClosed = ["RESOLVED", "CLOSED", "ESCALATED"].includes(ticket.status);

  return (
    <section className="h-full flex flex-col">
      <div className="mb-4 flex flex-col items-start gap-4 shrink-0 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto">
          <Link 
            href="/admin/tickets" 
            className="mb-3 -ml-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white dark:bg-[#1C251F] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:bg-[var(--mint-50)] hover:text-[var(--accent-dark)] hover:shadow-md active:scale-95 md:mb-4 md:-ml-3 md:px-4 md:py-2 md:text-xs"
          >
            <span>←</span> Back
          </Link>
          <h2 className="text-xl font-bold text-[var(--accent-dark)] break-words md:text-3xl">{ticket.subject}</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">ID: {ticket.id}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
            <span className="rounded-full bg-[var(--mint-100)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--accent-dark)] md:px-4 md:py-2 md:text-sm">
                {ticket.status}
            </span>
            <span className="rounded-full border border-[var(--border)] bg-white dark:bg-[#1C251F] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--muted-foreground)] md:px-4 md:py-2 md:text-sm">
                {ticket.priority}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Left Column: Messages Chat View */}
        <div className="lg:col-span-2 flex flex-col h-[65vh] rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] overflow-hidden shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:h-[70vh] md:rounded-[28px]">
          
          <div className="bg-[var(--mint-50)] p-4 border-b border-[var(--border)] md:p-6">
              <h3 className="text-sm font-semibold text-[var(--accent-dark)] md:text-base">Initial Request ({ticket.category})</h3>
              <p className="mt-1 text-sm text-[var(--foreground)] break-words md:mt-2 md:text-base">{ticket.message}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)] md:mt-4 md:gap-4 md:text-sm">
                  <span>By: {ticket.user.name || ticket.user.username} ({ticket.user.email})</span>
                  {ticket.repairRequest && (
                      <span>Repair ID: {ticket.repairRequest.title}</span>
                  )}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[var(--card)]">
              {ticket.messages.map((msg) => {
                  const isAdmin = msg.senderType === "ADMIN" || msg.senderType === "SYSTEM";
                  return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                          <div className="mb-1 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                              <span className="font-semibold">{isAdmin ? (msg.author?.name || "Admin") : (msg.author?.name || "Customer")}</span>
                              <span>•</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`rounded-2xl px-4 py-2.5 text-sm md:text-base md:px-5 md:py-3 max-w-[85%] md:max-w-[80%] shadow-sm break-words ${isAdmin ? "bg-[var(--accent-dark)] text-[var(--accent-foreground)] rounded-br-none" : "bg-white dark:bg-[#1C251F] border border-[var(--border)] text-[var(--foreground)] rounded-bl-none"}`}>
                              {msg.message}
                          </div>
                      </div>
                  );
              })}
              <div ref={messagesEndRef} />
          </div>

          {!isClosed && (
            <div className="bg-white dark:bg-[#1C251F] p-3 border-t border-[var(--border)] md:p-4">
                <form onSubmit={handleSendReply} className="flex gap-2 md:gap-3">
                    <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type a reply..."
                        className="flex-1 rounded-full border border-[var(--border)] bg-[var(--mint-50)] px-4 py-2.5 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:px-5 md:py-3 md:text-sm"
                    />
                    <button
                        type="submit"
                        disabled={isSendingReply || !replyMessage.trim()}
                        className="shrink-0 rounded-full bg-[var(--accent-dark)] px-4 py-2.5 text-xs font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50 md:px-6 md:py-3 md:text-sm"
                    >
                        {isSendingReply ? "..." : "Send"}
                    </button>
                </form>
            </div>
          )}
        </div>

        {/* Right Column: Action Panel & Properties */}
        <div className="space-y-4 md:space-y-6 overflow-y-auto max-h-none lg:max-h-[70vh]">
            <div className="rounded-[1.5rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] md:rounded-[28px] md:p-6">
                <h3 className="mb-4 text-base font-bold text-[var(--accent-dark)] md:mb-5 md:text-lg">Properties & Actions</h3>
                
                <div className="space-y-3 md:space-y-4">
                    <div>
                        <label className="block mb-1 text-xs font-semibold text-[var(--muted-foreground)] md:text-sm">Status</label>
                        <select 
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            disabled={isClosed && statusInput !== "CLOSED"} 
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--mint-50)] px-3 py-2.5 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none md:px-4 md:py-3 md:text-sm"
                        >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                            <option value="ESCALATED">Escalated</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-xs font-semibold text-[var(--muted-foreground)] md:text-sm">Priority</label>
                        <select 
                            value={priorityInput}
                            onChange={(e) => setPriorityInput(e.target.value)}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--mint-50)] px-3 py-2.5 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none md:px-4 md:py-3 md:text-sm"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-xs font-semibold text-[var(--muted-foreground)] md:text-sm">Admin Notes (Internal)</label>
                        <textarea
                            value={adminNoteInput}
                            onChange={(e) => setAdminNoteInput(e.target.value)}
                            rows={3}
                            className="w-full rounded-xl border border-[var(--border)] bg-[var(--mint-50)] px-3 py-2.5 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none md:rounded-2xl md:px-4 md:py-3 md:text-sm"
                            placeholder="Add private notes here..."
                        />
                    </div>

                    <button
                        onClick={handleUpdateProperties}
                        disabled={isUpdatingProps}
                        className="w-full rounded-xl border border-[var(--accent-dark)] bg-white dark:bg-[#1C251F] px-4 py-3 font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-100)] disabled:opacity-50"
                    >
                        {isUpdatingProps ? "Saving..." : "Save Properties"}
                    </button>
                </div>

                {!isClosed && (
                    <div className="mt-8 border-t border-[var(--border)] pt-6">
                        <button
                            onClick={handleEscalate}
                            disabled={isEscalating}
                            className="w-full rounded-xl bg-[#FDEAEA] px-4 py-3 font-semibold text-[#8A2A2A] transition hover:bg-[#FAD4D4] disabled:opacity-50"
                        >
                            {isEscalating ? "Escalating..." : "Escalate to Dispute"}
                        </button>
                        <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
                            Converts this ticket into a formal dispute case.
                        </p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </section>
  );
}
