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

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Mediation</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Disputes and escrow cases</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Investigate issues, review evidence, and decide refunds or resolutions.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading disputes...</div>
      ) : (
        <div className="space-y-5">
          {disputes.map((dispute) => (
            <div
              key={dispute.id}
              className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">
                    {dispute.status}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#1F4D2E]">{dispute.reason}</h3>
                  <p className="mt-2 text-sm text-[#6B7C72]">Filed by: {dispute.filedByType}</p>
                  <p className="text-sm text-[#6B7C72]">
                    Opened by: {dispute.openedBy?.name || dispute.openedBy?.email || "Unknown"}
                  </p>
                  <p className="text-sm text-[#6B7C72]">
                    Against: {dispute.against?.name || dispute.against?.email || "Not specified"}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-2xl bg-[#E6F0E2] px-4 py-3 text-sm font-medium text-[#1F4D2E]">
                    {new Date(dispute.createdAt).toLocaleDateString()}
                  </div>
                  <Link
                    href={`/admin/disputes/${dispute.id}`}
                    className="rounded-full bg-[#1F4D2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#183D24]"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!disputes.length && (
            <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">No disputes found.</div>
          )}
        </div>
      )}
    </section>
  );
}
