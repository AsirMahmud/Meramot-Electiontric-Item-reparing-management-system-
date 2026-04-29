"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
          headers: getAuthHeaders(),
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

    if (id) fetchTicket();
  }, [id]);

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
          ...getAuthHeaders(),
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
          ...getAuthHeaders(),
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
          headers: getAuthHeaders(),
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
    return <div className="p-8 text-[#6B7C72]">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-8 text-[#6B7C72]">
        Ticket not found. <Link href="/admin/tickets" className="underline">Go back</Link>
      </div>
    );
  }

  const isClosed = ["RESOLVED", "CLOSED", "ESCALATED"].includes(ticket.status);

  return (
    <section className="h-full flex flex-col">
      <div className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <Link href="/admin/tickets" className="mb-2 inline-block text-sm font-semibold text-[#5E7366] hover:underline">
            &larr; Back to Tickets
          </Link>
          <h2 className="text-3xl font-bold text-[#1F4D2E]">{ticket.subject}</h2>
          <p className="mt-1 text-[#6B7C72]">ID: {ticket.id}</p>
        </div>
        <div className="flex gap-3">
            <span className="rounded-full bg-[#E6F0E2] px-4 py-2 font-semibold tracking-wide text-[#1F4D2E]">
                {ticket.status}
            </span>
            <span className="rounded-full border border-[#D7E2D2] bg-white px-4 py-2 font-semibold tracking-wide text-[#5E7366]">
                {ticket.priority}
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 flex-1 min-h-0">
        {/* Left Column: Messages Chat View */}
        <div className="lg:col-span-2 flex flex-col h-[70vh] rounded-[28px] border border-[#D7E2D2] bg-white overflow-hidden shadow-sm">
          
          <div className="bg-[#F2F5EF] p-6 border-b border-[#D7E2D2]">
              <h3 className="font-semibold text-[#1F4D2E]">Initial Request ({ticket.category})</h3>
              <p className="mt-2 text-[#244233]">{ticket.message}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#6B7C72]">
                  <span>By: {ticket.user.name || ticket.user.username} ({ticket.user.email})</span>
                  {ticket.repairRequest && (
                      <span>Repair ID: {ticket.repairRequest.title}</span>
                  )}
              </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#FAFAF7]">
              {ticket.messages.map((msg) => {
                  const isAdmin = msg.senderType === "ADMIN" || msg.senderType === "SYSTEM";
                  return (
                      <div key={msg.id} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                          <div className="mb-1 flex items-center gap-2 text-xs text-[#6B7C72]">
                              <span className="font-semibold">{isAdmin ? (msg.author?.name || "Admin") : (msg.author?.name || "Customer")}</span>
                              <span>•</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className={`rounded-2xl px-5 py-3 max-w-[80%] shadow-sm ${isAdmin ? "bg-[#1F4D2E] text-white rounded-br-none" : "bg-white border border-[#D7E2D2] text-[#244233] rounded-bl-none"}`}>
                              {msg.message}
                          </div>
                      </div>
                  );
              })}
              <div ref={messagesEndRef} />
          </div>

          {!isClosed && (
            <div className="bg-white p-4 border-t border-[#D7E2D2]">
                <form onSubmit={handleSendReply} className="flex gap-3">
                    <input
                        type="text"
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type a reply to the customer..."
                        className="flex-1 rounded-full border border-[#D7E2D2] bg-[#F2F5EF] px-5 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E]"
                    />
                    <button
                        type="submit"
                        disabled={isSendingReply || !replyMessage.trim()}
                        className="rounded-full bg-[#1F4D2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#183D24] disabled:opacity-50"
                    >
                        {isSendingReply ? "..." : "Send"}
                    </button>
                </form>
            </div>
          )}
        </div>

        {/* Right Column: Action Panel & Properties */}
        <div className="space-y-6 overflow-y-auto max-h-[70vh]">
            <div className="rounded-[28px] border border-[#D7E2D2] bg-white p-6 shadow-sm">
                <h3 className="mb-5 text-lg font-bold text-[#1F4D2E]">Properties & Actions</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-semibold text-[#5E7366]">Status</label>
                        <select 
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value)}
                            disabled={isClosed && statusInput !== "CLOSED"} // Allow reopening if closed? Keep simple.
                            className="w-full rounded-xl border border-[#D7E2D2] bg-[#F2F5EF] px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                        >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                            <option value="CLOSED">Closed</option>
                            <option value="ESCALATED">Escalated</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-[#5E7366]">Priority</label>
                        <select 
                            value={priorityInput}
                            onChange={(e) => setPriorityInput(e.target.value)}
                            className="w-full rounded-xl border border-[#D7E2D2] bg-[#F2F5EF] px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold text-[#5E7366]">Admin Notes (Internal)</label>
                        <textarea
                            value={adminNoteInput}
                            onChange={(e) => setAdminNoteInput(e.target.value)}
                            rows={4}
                            className="w-full rounded-2xl border border-[#D7E2D2] bg-[#F2F5EF] px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                            placeholder="Add private notes here..."
                        />
                    </div>

                    <button
                        onClick={handleUpdateProperties}
                        disabled={isUpdatingProps}
                        className="w-full rounded-xl border border-[#1F4D2E] bg-white px-4 py-3 font-semibold text-[#1F4D2E] transition hover:bg-[#E6F0E2] disabled:opacity-50"
                    >
                        {isUpdatingProps ? "Saving..." : "Save Properties"}
                    </button>
                </div>

                {!isClosed && (
                    <div className="mt-8 border-t border-[#D7E2D2] pt-6">
                        <button
                            onClick={handleEscalate}
                            disabled={isEscalating}
                            className="w-full rounded-xl bg-[#FDEAEA] px-4 py-3 font-semibold text-[#8A2A2A] transition hover:bg-[#FAD4D4] disabled:opacity-50"
                        >
                            {isEscalating ? "Escalating..." : "Escalate to Dispute"}
                        </button>
                        <p className="mt-2 text-center text-xs text-[#6B7C72]">
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
