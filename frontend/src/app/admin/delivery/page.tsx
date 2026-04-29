"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchAdminDeliveryRiders, updateAdminDeliveryRiderStatus, fetchAdminDeliveryStats, type AdminDeliveryRider, type AdminDeliveryStats } from "@/lib/api";

type SessionUser = {
  accessToken?: string;
  role?: string;
};

export default function AdminDeliveryPage() {
  const { data: session, status } = useSession();
  const sessionUser = session?.user as SessionUser | undefined;

  const [riders, setRiders] = useState<AdminDeliveryRider[]>([]);
  const [stats, setStats] = useState<AdminDeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionUser?.accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [ridersData, statsRes] = await Promise.all([
        fetchAdminDeliveryRiders(sessionUser.accessToken),
        fetchAdminDeliveryStats(sessionUser.accessToken),
      ]);
      setRiders(ridersData);
      setStats(statsRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load delivery riders");
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    if (status === "authenticated") {
      load();
    }
  }, [status, load]);

  async function handleStatusUpdate(userId: string, newStatus: "APPROVED" | "REJECTED") {
    if (!sessionUser?.accessToken) return;
    setActionId(userId);
    try {
      await updateAdminDeliveryRiderStatus(sessionUser.accessToken, userId, newStatus);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status update failed");
    } finally {
      setActionId(null);
    }
  }

  if (status === "loading" || (loading && riders.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-[#6B7C72] animate-pulse">Loading delivery riders...</p>
      </div>
    );
  }

  const pendingRiders = riders.filter((r) => r.registrationStatus === "PENDING");
  const allOtherRiders = riders.filter((r) => r.registrationStatus !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#1F4D2E]">Delivery Riders</h2>
        <p className="mt-1 text-sm text-[#6B7C72]">
          Approve, reject, and monitor delivery personnel on the platform.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#D7E2D2] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[#6B7C72]">Total Riders</p>
            <p className="mt-1 text-2xl font-bold text-[#1F4D2E]">{stats.totalRiders}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E2D2] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[#6B7C72]">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pendingRiders}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E2D2] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[#6B7C72]">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.approvedRiders}</p>
          </div>
          <div className="rounded-2xl border border-[#D7E2D2] bg-white p-4">
            <p className="text-xs font-semibold uppercase text-[#6B7C72]">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{stats.rejectedRiders}</p>
          </div>
        </div>
      )}

      <section>
        <h3 className="mb-4 text-lg font-bold text-[#1F4D2E]">Pending Approvals ({pendingRiders.length})</h3>
        {pendingRiders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[#FAFAF7] p-8 text-center text-sm text-[#6B7C72]">
            No pending delivery rider applications.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#D7E2D2] bg-white">
            <table className="w-full text-left text-sm text-[#244233]">
              <thead className="border-b border-[#D7E2D2] bg-[#FAFAF7]">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Applied At</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {pendingRiders.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[#FAFAF7]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1F4D2E]">{rider.name || "Unknown"}</p>
                      <p className="text-xs text-[#6B7C72]">ID: {rider.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{rider.email || "—"}</p>
                      <p className="text-[#6B7C72]">{rider.phone || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-[#6B7C72]">
                      {new Date(rider.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => handleStatusUpdate(rider.id, "APPROVED")}
                          className="rounded-xl bg-[#244233] px-4 py-2 text-xs font-bold text-[#DCEAD7] transition hover:bg-[#1F4D2E] disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => handleStatusUpdate(rider.id, "REJECTED")}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-bold text-[#1F4D2E]">All Delivery Riders ({allOtherRiders.length})</h3>
        {allOtherRiders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[#FAFAF7] p-8 text-center text-sm text-[#6B7C72]">
            No verified delivery riders found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#D7E2D2] bg-white">
            <table className="w-full text-left text-sm text-[#244233]">
              <thead className="border-b border-[#D7E2D2] bg-[#FAFAF7]">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Reg. Status</th>
                  <th className="px-6 py-4 font-semibold">System Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {allOtherRiders.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[#FAFAF7]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[#1F4D2E]">{rider.name || "Unknown"}</p>
                      <p className="text-xs text-[#6B7C72]">ID: {rider.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{rider.email || "—"}</p>
                      <p className="text-[#6B7C72]">{rider.phone || "—"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-lg px-3 py-1 text-xs font-bold ${
                          rider.registrationStatus === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : rider.registrationStatus === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {rider.registrationStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-[#6B7C72]">{rider.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
