"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

type Note = {
  id: string;
  note: string;
  isInternal: boolean;
  createdAt: string;
  author?: {
    name?: string | null;
    email: string;
    role: string;
  };
};

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolution: string | null;
  filedByType: string;
  createdAt: string;
  openedBy?: {
    name?: string | null;
    email: string;
    role: string;
  };
  against?: {
    name?: string | null;
    email: string;
    role: string;
  } | null;
  assignedAdmin?: {
    name?: string | null;
    email: string;
  } | null;
  notes: Note[];
  repairRequest?: {
    id: string;
    title: string;
  } | null;
  payment?: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  } | null;
};

export default function AdminDisputeDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);

  // Action Panel State
  const [newNote, setNewNote] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [resolutionText, setResolutionText] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [statusToResolve, setStatusToResolve] = useState("RESOLVED");

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
          setDispute(data.data);
        } else {
          alert(data.message || "Failed to load dispute");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchDispute();
  }, [id]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}/note`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ note: newNote, isInternal }),
      });

      const data = await res.json();
      if (res.ok) {
        setDispute((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "INVESTIGATING", // The backend changes this automatically
            notes: [...prev.notes, data.data],
          };
        });
        setNewNote("");
      } else {
        alert(data.message || "Failed to add note");
      }
    } catch (error) {
      console.error(error);
      alert("Error adding note.");
    }
  };

  const handleResolve = async () => {
    if (!resolutionText.trim()) {
        alert("Please provide a resolution note before resolving.");
        return;
    }

    try {
      setIsResolving(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}/resolve`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ resolution: resolutionText, status: statusToResolve }),
      });

      const data = await res.json();
      if (res.ok) {
        setDispute((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: statusToResolve,
            resolution: resolutionText,
          };
        });
        setResolutionText("");
      } else {
        alert(data.message || "Failed to resolve dispute");
      }
    } catch (error) {
      console.error(error);
      alert("Error resolving dispute.");
    } finally {
      setIsResolving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-[#6B7C72]">Loading dispute details...</div>;
  }

  if (!dispute) {
    return (
      <div className="p-8 text-[#6B7C72]">
        Dispute not found. <Link href="/admin/disputes" className="underline">Go back</Link>
      </div>
    );
  }

  const isClosed = ["RESOLVED", "REFUNDED", "PARTIALLY_REFUNDED", "REJECTED", "CLOSED"].includes(dispute.status);

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/disputes" className="mb-2 inline-block text-sm font-semibold text-[#5E7366] hover:underline">
            &larr; Back to Disputes
          </Link>
          <h2 className="text-3xl font-bold text-[#1F4D2E]">Dispute Case</h2>
          <p className="mt-1 text-[#6B7C72]">ID: {dispute.id}</p>
        </div>
        <div className="rounded-full bg-[#E6F0E2] px-4 py-2 font-semibold tracking-wide text-[#1F4D2E]">
          {dispute.status}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#1F4D2E]">{dispute.reason}</h3>
            {dispute.description && (
                <p className="mt-4 rounded-xl bg-white p-4 text-[#244233] shadow-sm">
                    {dispute.description}
                </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Opened By</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">
                        {dispute.openedBy?.name || "Unknown"} <span className="text-sm text-[#6B7C72]">({dispute.filedByType})</span>
                    </p>
                    <p className="text-sm text-[#6B7C72]">{dispute.openedBy?.email}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Against</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">
                        {dispute.against?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-[#6B7C72]">{dispute.against?.email || "No email"}</p>
                </div>
            </div>

            <div className="mt-6 border-t border-[#D7E2D2] pt-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Related Items</p>
                <div className="mt-3 flex flex-wrap gap-3">
                    {dispute.repairRequest && (
                        <span className="rounded-full bg-white px-4 py-2 text-sm text-[#244233] shadow-sm">
                            Repair: {dispute.repairRequest.title}
                        </span>
                    )}
                    {dispute.payment && (
                        <span className="rounded-full bg-white px-4 py-2 text-sm text-[#244233] shadow-sm">
                            Payment: {dispute.payment.amount} {dispute.payment.currency} ({dispute.payment.status})
                        </span>
                    )}
                </div>
            </div>

            {dispute.resolution && (
                <div className="mt-6 rounded-2xl bg-[#E6F0E2] p-5">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#1F4D2E]">Final Resolution</p>
                    <p className="mt-2 text-[#244233] italic">"{dispute.resolution}"</p>
                </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="mb-4 text-xl font-bold text-[#1F4D2E]">Notes & Timeline</h3>
            <div className="space-y-4">
                {dispute.notes.length === 0 ? (
                    <p className="text-[#6B7C72]">No notes added yet.</p>
                ) : (
                    dispute.notes.map((note) => (
                        <div key={note.id} className={`rounded-2xl p-5 shadow-sm ${note.isInternal ? "bg-[#FFF9E6] border border-[#FDE68A]" : "bg-white border border-[#D7E2D2]"}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-[#1F4D2E]">{note.author?.name || note.author?.email || "System"}</p>
                                    <p className="text-xs text-[#6B7C72]">{new Date(note.createdAt).toLocaleString()}</p>
                                </div>
                                {note.isInternal && (
                                    <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">Internal Note</span>
                                )}
                            </div>
                            <p className="mt-3 text-[#244233]">{note.note}</p>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Panel */}
        <div className="space-y-6">
            {!isClosed && (
                <div className="sticky top-6 rounded-[28px] border border-[#D7E2D2] bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-[#1F4D2E]">Action Panel</h3>
                    
                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#5E7366]">Add Note</label>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-2xl border border-[#D7E2D2] bg-[#F9FBF8] px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                                placeholder="Write your findings..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="internal" 
                                checked={isInternal} 
                                onChange={(e) => setIsInternal(e.target.checked)}
                                className="h-4 w-4 rounded border-[#D7E2D2] text-[#1F4D2E] focus:ring-[#1F4D2E]"
                            />
                            <label htmlFor="internal" className="text-sm text-[#6B7C72]">Visible to admins only</label>
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-[#F2F5EF] px-4 py-3 font-semibold text-[#1F4D2E] transition hover:bg-[#E6F0E2]"
                        >
                            Add Note
                        </button>
                    </form>

                    <div className="my-6 border-t border-[#D7E2D2]"></div>

                    {/* Resolve Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[#5E7366]">Final Resolution</label>
                            <textarea
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-2xl border border-[#D7E2D2] bg-[#F9FBF8] px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                                placeholder="Explain how this was resolved..."
                            />
                        </div>
                        <div>
                            <select 
                                value={statusToResolve}
                                onChange={(e) => setStatusToResolve(e.target.value)}
                                className="w-full rounded-xl border border-[#D7E2D2] bg-white px-4 py-3 text-sm text-[#244233] focus:border-[#1F4D2E] focus:outline-none"
                            >
                                <option value="RESOLVED">Resolved (No action)</option>
                                <option value="REFUNDED">Refunded</option>
                                <option value="PARTIALLY_REFUNDED">Partially Refunded</option>
                                <option value="REJECTED">Rejected</option>
                            </select>
                        </div>
                        <button
                            onClick={handleResolve}
                            disabled={isResolving}
                            className="w-full rounded-xl bg-[#1F4D2E] px-4 py-3 font-semibold text-white transition hover:bg-[#183D24] disabled:opacity-50"
                        >
                            {isResolving ? "Resolving..." : "Close Dispute"}
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
