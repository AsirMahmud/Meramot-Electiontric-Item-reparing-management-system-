"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchAdminDeliveryRiders, updateAdminDeliveryRiderStatus, deleteAdminDeliveryRider, fetchAdminDeliveryStats, type AdminDeliveryRider, type AdminDeliveryStats } from "@/lib/api";

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

  async function handleDeleteRider(userId: string) {
    if (!sessionUser?.accessToken) return;
    if (!window.confirm("Are you sure you want to completely delete this delivery partner registration? They will have to apply again from scratch.")) return;
    
    const passkey = window.prompt("SECURITY CHECK:\nPlease enter your 10-minute Admin Passkey (sent to your email) to confirm this deletion:");
    if (!passkey) {
      alert("Deletion cancelled. Passkey is required.");
      return;
    }

    setActionId(userId);
    try {
      await deleteAdminDeliveryRider(sessionUser.accessToken, userId, passkey);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deletion failed");
    } finally {
      setActionId(null);
    }
  }

  if (status === "loading" || (loading && riders.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-[var(--muted-foreground)] animate-pulse">Loading delivery riders...</p>
      </div>
    );
  }

  const pendingRiders = riders.filter((r) => r.registrationStatus === "PENDING");
  const allOtherRiders = riders.filter((r) => r.registrationStatus !== "PENDING");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--accent-dark)]">Delivery Riders</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
          <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Total Riders</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent-dark)]">{stats.totalRiders}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Pending</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pendingRiders}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Approved</p>
            <p className="mt-1 text-2xl font-bold text-emerald-600">{stats.approvedRiders}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-rose-600">{stats.rejectedRiders}</p>
          </div>
        </div>
      )}

      <section>
        <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">Pending Approvals ({pendingRiders.length})</h3>
        {pendingRiders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No pending delivery rider applications.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white dark:bg-[#1C251F]">
            <table className="w-full text-left text-sm text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Applied At</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {pendingRiders.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[var(--card)]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--accent-dark)]">{rider.name || "Unknown"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">ID: {rider.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{rider.email || "—"}</p>
                      <p className="text-[var(--muted-foreground)]">{rider.phone || "—"}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--muted-foreground)]">
                      {new Date(rider.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => handleStatusUpdate(rider.id, "APPROVED")}
                          className="rounded-xl bg-[#244233] px-4 py-2 text-xs font-bold text-[#DCEAD7] transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
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
        <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">All Delivery Riders ({allOtherRiders.length})</h3>
        {allOtherRiders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No verified delivery riders found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white dark:bg-[#1C251F]">
            <table className="w-full text-left text-sm text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">User</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Reg. Status</th>
                  <th className="px-6 py-4 font-semibold">System Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {allOtherRiders.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[var(--card)]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--accent-dark)]">{rider.name || "Unknown"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">ID: {rider.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{rider.email || "—"}</p>
                      <p className="text-[var(--muted-foreground)]">{rider.phone || "—"}</p>
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
                      <span className="font-medium text-[var(--muted-foreground)]">{rider.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => handleDeleteRider(rider.id)}
                          className="rounded-xl border border-[#8A2A2A] px-3 py-1 text-xs font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50"
                        >
                          Delete
                        </button>
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
