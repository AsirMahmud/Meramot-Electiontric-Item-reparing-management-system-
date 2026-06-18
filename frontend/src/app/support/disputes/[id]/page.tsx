"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import { getCustomerDisputeDetails, addCustomerDisputeNote } from "@/lib/support-api";

export default function DisputeDetailsPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { data: session } = useSession();

  const [dispute, setDispute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;

  useEffect(() => {
    if (token && id) {
      loadDispute(token);
    } else if (session !== undefined && !token) {
      setMessage("Log in to view this dispute.");
      setLoading(false);
    }
  }, [session, token, id]);

  const loadDispute = async (tok: string) => {
    setLoading(true);
    setMessage("");
    try {
      const res = await getCustomerDisputeDetails(tok, id);
      if (res?.data) {
        setDispute(res.data);
      } else {
        setMessage("Dispute not found.");
        router.push("/support");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error loading dispute.");
      router.push("/support");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !noteMessage.trim()) return;

    setAddingNote(true);
    setMessage("");
    try {
      await addCustomerDisputeNote(token, id, { note: noteMessage });
      setNoteMessage("");
      setMessage("Note added successfully.");
      loadDispute(token);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error adding note.");
    } finally {
      setAddingNote(false);
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

  if (!dispute) return null;

  const isClosed = ["RESOLVED", "REFUNDED", "PARTIALLY_REFUNDED", "REJECTED"].includes(dispute.status);

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

        {/* Dispute header */}
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden mb-6">
          <div className="p-5 sm:p-6 border-b border-[var(--border)] bg-[var(--mint-50)]">
            <div className="flex justify-between items-start gap-4 mb-3">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{dispute.reason}</h1>
              <span className="rounded-full bg-[var(--mint-100)] px-3 py-1 text-xs font-bold uppercase text-[var(--accent-dark)] whitespace-nowrap">
                {dispute.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-[var(--muted-foreground)]">
              <span><strong>ID:</strong> {dispute.id.slice(-8).toUpperCase()}</span>
              <span><strong>Opened:</strong> {format(new Date(dispute.createdAt), "MMM d, yyyy")}</span>
              <span><strong>Against:</strong> {dispute.against?.name || "Vendor"}</span>
              {dispute.repairRequestId && (
                <Link href="/orders" className="text-[var(--accent-dark)] hover:underline font-medium">
                  View Orders
                </Link>
              )}
            </div>

            {dispute.resolution && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
                <strong>Resolution:</strong> {dispute.resolution}
              </div>
            )}
          </div>

          {/* Notes thread */}
          <div className="p-5 sm:p-6">
            <h3 className="text-base font-bold text-[var(--foreground)] mb-4">Evidence &amp; Notes</h3>
            <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
              {!dispute.notes?.length ? (
                <p className="text-sm text-[var(--muted-foreground)] text-center py-4 italic">
                  No notes or evidence submitted yet.
                </p>
              ) : (
                dispute.notes.map((note: any) => {
                  const isOwn = note.author?.role === "CUSTOMER";
                  return (
                    <div
                      key={note.id}
                      className={`p-4 rounded-2xl border border-[var(--border)] ${isOwn ? "bg-[var(--mint-100)] ml-6" : "bg-[var(--card)] mr-6"}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-sm">
                          {isOwn ? "You" : note.author?.name || "Support Team"}
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {format(new Date(note.createdAt), "MMM d, h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{note.note}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Add note */}
          <div className="p-5 sm:p-6 border-t border-[var(--border)]">
            {isClosed ? (
              <p className="text-center text-sm text-[var(--muted-foreground)] py-2">
                This dispute has been {dispute.status.toLowerCase().replace(/_/g, " ")}. No further notes can be added.
              </p>
            ) : (
              <form onSubmit={handleAddNote} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  Add further information or evidence
                </label>
                <textarea
                  value={noteMessage}
                  onChange={(e) => setNoteMessage(e.target.value)}
                  placeholder="Describe additional details or provide evidence..."
                  className="w-full rounded-xl border border-[var(--border)] px-4 py-3 bg-[var(--background)] text-[var(--foreground)] outline-none focus:border-[var(--accent-dark)] resize-none min-h-[90px]"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addingNote || !noteMessage.trim()}
                    className="rounded-full bg-[var(--accent-dark)] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {addingNote ? "Adding..." : "Add Note"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
