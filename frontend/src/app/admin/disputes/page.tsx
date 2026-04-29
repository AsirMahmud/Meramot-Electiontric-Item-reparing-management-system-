"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

type Dispute = {
  id: string;
  reason: string;
  status: string;
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
};

export default function AdminDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/disputes`, {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
          setDisputes(data.data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "OPEN": return "bg-blue-100 text-blue-700";
      case "INVESTIGATING": return "bg-amber-100 text-amber-700";
      case "RESOLVED": return "bg-green-100 text-green-700";
      case "REFUNDED": return "bg-purple-100 text-purple-700";
      case "REJECTED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Mediation</p>
        <h2 className="mt-3 text-4xl font-bold text-[var(--accent-dark)]">Disputes and mediation</h2>
        <p className="mt-3 text-lg text-[var(--muted-foreground)]">
          Investigate issues, review evidence, and decide resolutions for escrow cases.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">Loading disputes...</div>
      ) : (
        <div className="space-y-5">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)] p-6 transition-all hover:shadow-md"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(dispute.status)}`}>
                      {dispute.status}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="mt-3 text-2xl font-bold text-[var(--accent-dark)]">{dispute.reason}</h3>
                  
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Opened By</p>
                      <p className="text-sm text-[var(--foreground)]">
                        {dispute.openedBy?.name || dispute.openedBy?.email} 
                        <span className="ml-1 text-[10px] opacity-60">({dispute.filedByType})</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Against</p>
                      <p className="text-sm text-[var(--foreground)]">
                        {dispute.against?.name || dispute.against?.email || "System/Not Specified"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end lg:self-start">
                  <Link
                    href={`/admin/disputes/${dispute.id}`}
                    className="rounded-full bg-[var(--accent-dark)] px-6 py-3 text-sm font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
                  >
                    Manage Case
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!disputes.length && (
            <div className="rounded-[24px] bg-[var(--mint-50)] p-6 text-[var(--muted-foreground)]">
              No dispute cases found.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
