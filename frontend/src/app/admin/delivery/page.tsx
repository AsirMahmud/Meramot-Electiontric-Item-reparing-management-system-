"use client";
import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { fetchAdminDeliveryRiders, updateAdminDeliveryRiderStatus, deleteAdminDeliveryRider, fetchAdminDeliveryStats, type AdminDeliveryRider, type AdminDeliveryStats } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

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
    
    const passkey = window.prompt("SECURITY CHECK:\nPlease enter your 1-hour Admin Passkey (sent to your email) to confirm this deletion:");
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
        <h2 className="text-xl font-bold text-[var(--accent-dark)] md:text-2xl">Delivery Riders</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">
          Approve, reject, and monitor delivery personnel on the platform.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
          <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Total Riders</p>
            <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:text-2xl">{stats.totalRiders}</p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Pending</p>
            <p className="mt-1 text-lg font-bold text-amber-600 md:text-2xl">{stats.pendingRiders}</p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Approved</p>
            <p className="mt-1 text-lg font-bold text-emerald-600 md:text-2xl">{stats.approvedRiders}</p>
          </div>
          <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
            <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Rejected</p>
            <p className="mt-1 text-lg font-bold text-rose-600 md:text-2xl">{stats.rejectedRiders}</p>
          </div>
        </div>
      )}

      <PendingRidersSection riders={pendingRiders} actionId={actionId} onStatusUpdate={handleStatusUpdate} />
      <AllRidersSection riders={allOtherRiders} actionId={actionId} onDeleteRider={handleDeleteRider} />
    </div>
  );
}

/* ── Pending Riders ───────────────────────────────────────────── */

function PendingRidersSection({
  riders,
  actionId,
  onStatusUpdate,
}: {
  riders: AdminDeliveryRider[];
  actionId: string | null;
  onStatusUpdate: (userId: string, newStatus: "APPROVED" | "REJECTED") => void;
}) {
  const table = useAdminTableState(riders, ["name", "email", "phone", "id"] as any);

  return (
    <section>
      <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">Pending Approvals ({riders.length})</h3>
      {riders.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
          No pending delivery rider applications.
        </div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search pending riders…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">User</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Applied At</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {table.paged.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[var(--card)] dark:hover:bg-white/5">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="font-bold text-[var(--accent-dark)] line-clamp-2 md:line-clamp-none">{rider.name || "Unknown"}</p>
                      <p className="text-[9px] text-[var(--muted-foreground)] md:text-xs">ID: {rider.id}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="line-clamp-1">{rider.email || "—"}</p>
                      <p className="text-[var(--muted-foreground)] line-clamp-1">{rider.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6 md:py-4">
                      <span className="md:hidden">{new Date(rider.createdAt).toLocaleDateString()}</span>
                      <span className="hidden md:inline">{new Date(rider.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => onStatusUpdate(rider.id, "APPROVED")}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[#244233] px-3 py-1.5 text-[10px] font-bold text-[#DCEAD7] transition hover:bg-[var(--accent-dark)] disabled:opacity-50 md:w-auto md:rounded-xl md:px-4 md:py-2 md:text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => onStatusUpdate(rider.id, "REJECTED")}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500 dark:bg-red-500/10 dark:text-red-400 md:w-auto md:rounded-xl md:px-4 md:py-2 md:text-xs"
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
        </>
      )}
    </section>
  );
}

/* ── All Riders ───────────────────────────────────────────────── */

function AllRidersSection({
  riders,
  actionId,
  onDeleteRider,
}: {
  riders: AdminDeliveryRider[];
  actionId: string | null;
  onDeleteRider: (userId: string) => void;
}) {
  const table = useAdminTableState(riders, ["name", "email", "phone", "id"] as any);

  return (
    <section>
      <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">All Delivery Riders ({riders.length})</h3>
      {riders.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
          No verified delivery riders found.
        </div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search riders by name, email, phone, ID…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">User</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Reg. Status</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">System Status</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {table.paged.map((rider) => (
                  <tr key={rider.id} className="transition-colors hover:bg-[var(--card)] dark:hover:bg-white/5">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="font-bold text-[var(--accent-dark)] line-clamp-2 md:line-clamp-none">{rider.name || "Unknown"}</p>
                      <p className="text-[9px] text-[var(--muted-foreground)] md:text-xs">ID: {rider.id}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="line-clamp-1">{rider.email || "—"}</p>
                      <p className="text-[var(--muted-foreground)] line-clamp-1">{rider.phone || "—"}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-[8px] font-bold md:px-3 md:py-1 md:text-xs ${
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
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span className="font-medium text-[var(--muted-foreground)]">{rider.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                        <button
                          type="button"
                          disabled={actionId === rider.id}
                          onClick={() => onDeleteRider(rider.id)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-[#8A2A2A] px-3 py-1.5 text-[10px] font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10 md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs"
                        >
                          Delete
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
