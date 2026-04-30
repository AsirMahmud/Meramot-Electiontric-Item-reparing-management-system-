"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(true);

  // Action Panel State
  const [newNote, setNewNote] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [resolutionText, setResolutionText] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [statusToResolve, setStatusToResolve] = useState("RESOLVED");
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(token),
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

    if (id && token) fetchDispute();
  }, [id, token]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}/note`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
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

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;
    try {
      setDeletingNoteId(noteId);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes/${id}/notes/${noteId}`, {
        method: "DELETE",
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setDispute((prev) => {
          if (!prev) return prev;
          return { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) };
        });
      } else {
        alert(data.message || "Failed to delete note");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting note.");
    } finally {
      setDeletingNoteId(null);
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
          ...getAuthHeaders(token),
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
    return <div className="p-8 text-[var(--muted-foreground)]">Loading dispute details...</div>;
  }

  if (!dispute) {
    return (
      <div className="p-8 text-[var(--muted-foreground)]">
        Dispute not found. <Link href="/admin/disputes" className="underline">Go back</Link>
      </div>
    );
  }

  const isClosed = ["RESOLVED", "REFUNDED", "PARTIALLY_REFUNDED", "REJECTED", "CLOSED"].includes(dispute.status);

  return (
    <section>
      <div className="mb-6">
        <div>
          <Link 
            href="/admin/disputes" 
            className="mb-4 -ml-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white dark:bg-[#1C251F] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] shadow-sm transition-all hover:bg-[var(--mint-50)] hover:text-[var(--accent-dark)] hover:shadow-md active:scale-95"
          >
            <span>←</span> Back to Disputes
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-[var(--accent-dark)]">Dispute Case</h2>
            <span className="rounded-full bg-[var(--mint-100)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[var(--accent-dark)]">
              {dispute.status}
            </span>
          </div>
          <p className="mt-1 text-[var(--muted-foreground)]">ID: {dispute.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Info Card */}
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[var(--accent-dark)]">{dispute.reason}</h3>
            {dispute.description && (
                <p className="mt-4 rounded-xl bg-white dark:bg-[#1C251F] p-4 text-[var(--foreground)] shadow-sm">
                    {dispute.description}
                </p>
            )}

            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Opened By</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">
                        {dispute.openedBy?.name || "Unknown"} <span className="text-sm text-[var(--muted-foreground)]">({dispute.filedByType})</span>
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">{dispute.openedBy?.email}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Against</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">
                        {dispute.against?.name || "Unknown"}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">{dispute.against?.email || "No email"}</p>
                </div>
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Related Items</p>
                <div className="mt-3 flex flex-wrap gap-3">
                    {dispute.repairRequest && (
                        <span className="rounded-full bg-white dark:bg-[#1C251F] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">
                            Repair: {dispute.repairRequest.title}
                        </span>
                    )}
                    {dispute.payment && (
                        <span className="rounded-full bg-white dark:bg-[#1C251F] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">
                            Payment: {dispute.payment.amount} {dispute.payment.currency} ({dispute.payment.status})
                        </span>
                    )}
                </div>
            </div>

            {dispute.resolution && (
                <div className="mt-6 rounded-2xl bg-[var(--mint-100)] p-5">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--accent-dark)]">Final Resolution</p>
                    <p className="mt-2 text-[var(--foreground)] italic">"{dispute.resolution}"</p>
                </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="mb-4 text-xl font-bold text-[var(--accent-dark)]">Notes & Timeline</h3>
            <div className="space-y-4">
                {dispute.notes.length === 0 ? (
                    <p className="text-[var(--muted-foreground)]">No notes added yet.</p>
                ) : (
                    dispute.notes.map((note) => (
                        <div key={note.id} className={`rounded-2xl p-5 shadow-sm ${note.isInternal ? "bg-[#FFF9E6] dark:bg-[#FFF9E6] border border-[#FDE68A]" : "bg-white dark:bg-[#1C251F] border border-[var(--border)]"}`}>
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className={`font-semibold ${note.isInternal ? "text-[#244229]" : "text-[var(--accent-dark)]"}`}>{note.author?.name || note.author?.email || "System"}</p>
                                    <p className={`text-xs ${note.isInternal ? "text-[#6B7280]" : "text-[var(--muted-foreground)]"}`}>{new Date(note.createdAt).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {note.isInternal && (
                                        <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-semibold text-[#92400E]">Internal Note</span>
                                    )}
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        disabled={deletingNoteId === note.id}
                                        title="Delete note"
                                        className={`rounded-lg p-1.5 transition hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 ${note.isInternal ? "text-[#92400E] hover:text-red-600" : "text-[var(--muted-foreground)] hover:text-red-500"}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p className={`mt-3 ${note.isInternal ? "text-[#1F2937]" : "text-[var(--foreground)]"}`}>{note.note}</p>
                        </div>
                    ))
                )}
            </div>
          </div>
        </div>

        {/* Right Column: Action Panel */}
        <div className="space-y-6">
            {!isClosed && (
                <div className="sticky top-6 rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">Action Panel</h3>
                    
                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="mb-6 space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--muted-foreground)]">Add Note</label>
                            <textarea
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none"
                                placeholder="Write your findings..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="internal" 
                                checked={isInternal} 
                                onChange={(e) => setIsInternal(e.target.checked)}
                                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent-dark)] focus:ring-[#1F4D2E]"
                            />
                            <label htmlFor="internal" className="text-sm text-[var(--muted-foreground)]">Visible to admins only</label>
                        </div>
                        <button
                            type="submit"
                            className="w-full rounded-xl bg-[var(--mint-50)] px-4 py-3 font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-100)]"
                        >
                            Add Note
                        </button>
                    </form>

                    <div className="my-6 border-t border-[var(--border)]"></div>

                    {/* Resolve Form */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-[var(--muted-foreground)]">Final Resolution</label>
                            <textarea
                                value={resolutionText}
                                onChange={(e) => setResolutionText(e.target.value)}
                                rows={3}
                                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--mint-50)] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none"
                                placeholder="Explain how this was resolved..."
                            />
                        </div>
                        <div>
                            <select 
                                value={statusToResolve}
                                onChange={(e) => setStatusToResolve(e.target.value)}
                                className="w-full rounded-xl border border-[var(--border)] bg-white dark:bg-[#1C251F] px-4 py-3 text-sm text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none"
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
                            className="w-full rounded-xl bg-[var(--accent-dark)] px-4 py-3 font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
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
