"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getAuthHeaders } from "@/lib/api";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

/* ── Types ─────────────────────────────────────────────────────── */

type User = {
  id: string;
  name: string | null;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type UserProfile = User & {
  updatedAt?: string;
  supportTickets?: { id: string; subject: string; status: string; createdAt: string }[];
  payments?: { id: string; amount: any; currency: string; status: string; createdAt: string }[];
  repairRequests?: { id: string; title: string; status: string; createdAt: string }[];
};

/* ── Stat Cards ────────────────────────────────────────────────── */

function StatCard({ label, value, color = "text-[var(--accent-dark)]" }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
      <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color} md:text-2xl`}>{value}</p>
    </div>
  );
}

/* ── Role Badge ────────────────────────────────────────────────── */

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300",
    VENDOR: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300",
    DELIVERY: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    CUSTOMER: "bg-[var(--mint-100)] text-[var(--accent-dark)]",
  };
  return (
    <span className={`inline-block rounded-lg px-2 py-0.5 text-[8px] font-bold md:px-3 md:py-1 md:text-xs ${styles[role] || styles.CUSTOMER}`}>
      {role}
    </span>
  );
}

/* ── Status Badge ──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "bg-[var(--mint-100)] text-[var(--accent-dark)]",
    SUSPENDED: "bg-[#FEF3C7] text-[#92400E]",
    DELETED: "bg-[#FDEAEA] text-[#8A2A2A]",
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[8px] font-bold md:px-3 md:py-1 md:text-xs ${styles[status] || "bg-slate-100 text-slate-800"}`}>
      {status}
    </span>
  );
}

/* ── Profile Modal ─────────────────────────────────────────────── */

function UserProfileModal({
  user,
  loading,
  onClose,
}: {
  user: UserProfile | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!user && !loading) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--background)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--mint-50)] px-6 py-4">
          <h3 className="text-lg font-bold text-[var(--accent-dark)]">User Profile</h3>
          <button
            onClick={onClose}
            className="rounded-full bg-[var(--mint-100)] p-2 text-[var(--accent-dark)] transition hover:bg-[var(--accent-dark)] hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <p className="animate-pulse text-sm text-[var(--muted-foreground)]">Loading profile…</p>
            </div>
          ) : user ? (
            <div className="space-y-6">
              {/* Avatar + Name Row */}
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--mint-100)] text-xl font-bold text-[var(--accent-dark)]">
                  {(user.name || user.username).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-[var(--foreground)] truncate">{user.name || user.username}</p>
                  <p className="text-sm text-[var(--muted-foreground)] truncate">@{user.username}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Email" value={user.email} />
                <InfoField label="Phone" value={user.phone || "Not provided"} />
                <InfoField label="Role" value={<RoleBadge role={user.role} />} />
                <InfoField label="Status" value={<StatusBadge status={user.status} />} />
                <InfoField label="User ID" value={<span className="font-mono text-[10px] break-all">{user.id}</span>} />
                <InfoField label="Joined" value={new Date(user.createdAt).toLocaleString()} />
              </div>

              {/* Activity Sections */}
              {user.supportTickets && user.supportTickets.length > 0 && (
                <ActivitySection
                  title="Recent Support Tickets"
                  items={user.supportTickets.map((t) => ({
                    id: t.id,
                    primary: t.subject,
                    secondary: t.status,
                    date: t.createdAt,
                  }))}
                />
              )}

              {user.payments && user.payments.length > 0 && (
                <ActivitySection
                  title="Recent Payments"
                  items={user.payments.map((p) => ({
                    id: p.id,
                    primary: `${p.amount} ${p.currency}`,
                    secondary: p.status,
                    date: p.createdAt,
                  }))}
                />
              )}

              {user.repairRequests && user.repairRequests.length > 0 && (
                <ActivitySection
                  title="Recent Repair Requests"
                  items={user.repairRequests.map((r) => ({
                    id: r.id,
                    primary: r.title,
                    secondary: r.status,
                    date: r.createdAt,
                  }))}
                />
              )}

              {/* Empty state for no activity */}
              {(!user.supportTickets?.length && !user.payments?.length && !user.repairRequests?.length) && (
                <div className="rounded-2xl border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted-foreground)]">
                  No recent activity found for this user.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      <div className="mt-0.5 text-sm text-[var(--foreground)]">{value}</div>
    </div>
  );
}

function ActivitySection({
  title,
  items,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string; date: string }[];
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">{title}</p>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-xl bg-[var(--mint-50)] px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--foreground)]">{item.primary}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{new Date(item.date).toLocaleDateString()}</p>
            </div>
            <span className="ml-2 shrink-0 rounded-full bg-[var(--mint-100)] px-2 py-0.5 text-[8px] font-bold text-[var(--accent-dark)]">
              {item.secondary}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Filters
  const [role, setRole] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Profile modal state
  const [profileUser, setProfileUser] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (role) queryParams.append("role", role);
      if (statusFilter) queryParams.append("status", statusFilter);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users?${queryParams.toString()}`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [token, role, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /* ── Actions ── */

  const handleViewProfile = async (userId: string) => {
    setProfileOpen(true);
    setProfileLoading(true);
    setProfileUser(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${userId}`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setProfileUser(data.data);
      } else {
        alert(data.message || "Failed to load user profile");
        setProfileOpen(false);
      }
    } catch (error) {
      console.error(error);
      alert("Error loading user profile");
      setProfileOpen(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string, label: string) => {
    const confirmMessage =
      newStatus === "DELETED"
        ? "Are you sure you want to DELETE this user? This will soft-delete their account and they won't be able to log in."
        : newStatus === "SUSPENDED"
          ? "Are you sure you want to BAN (suspend) this user? They won't be able to access the platform until restored."
          : `Are you sure you want to ${label} this user?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setActionId(id);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((user) => (user.id === id ? { ...user, status: newStatus } : user))
        );
      } else {
        const errData = await res.json();
        alert(errData.message || `Failed to ${label.toLowerCase()} user`);
      }
    } catch (error) {
      console.error(error);
      alert(`An error occurred while trying to ${label.toLowerCase()} the user.`);
    } finally {
      setActionId(null);
    }
  };

  const table = useAdminTableState(users, ["name", "username", "email", "phone", "role", "id"] as any);

  /* ── Stats ── */
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "ACTIVE").length;
  const suspendedUsers = users.filter((u) => u.status === "SUSPENDED").length;
  const deletedUsers = users.filter((u) => u.status === "DELETED").length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[var(--accent-dark)] md:text-2xl">Users</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">
          View profiles, ban, or delete user accounts on the platform.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard label="Active" value={activeUsers} color="text-emerald-600" />
        <StatCard label="Banned" value={suspendedUsers} color="text-amber-600" />
        <StatCard label="Deleted" value={deletedUsers} color="text-rose-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none dark:bg-[#1C251F] md:px-4 md:py-2.5 md:text-sm"
        >
          <option value="">All Roles</option>
          <option value="CUSTOMER">Customer</option>
          <option value="VENDOR">Vendor</option>
          <option value="DELIVERY">Delivery</option>
          <option value="ADMIN">Admin</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none dark:bg-[#1C251F] md:px-4 md:py-2.5 md:text-sm"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Banned</option>
          <option value="DELETED">Deleted</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center rounded-[1.5rem] bg-[var(--mint-50)]">
          <p className="animate-pulse text-sm text-[var(--muted-foreground)]">Loading users…</p>
        </div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search by name, email, phone, role, ID…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />

          <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm">
                <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold md:px-6 md:py-4">User</th>
                    <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Role</th>
                    <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Status</th>
                    <th className="hidden px-4 py-3 font-semibold md:table-cell md:px-6 md:py-4">Joined</th>
                    <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                  {table.paged.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-[var(--card)] dark:hover:bg-white/5">
                      {/* User */}
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <div className="flex items-center gap-3">
                          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--mint-100)] text-sm font-bold text-[var(--accent-dark)] md:flex">
                            {(user.name || user.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[var(--accent-dark)] truncate">{user.name || user.username}</p>
                            <p className="text-[9px] text-[var(--muted-foreground)] truncate md:text-xs">{user.email}</p>
                            <p className="text-[9px] text-[var(--muted-foreground)] md:hidden">{user.phone || "No phone"}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3 md:px-6 md:py-4">
                        <StatusBadge status={user.status} />
                      </td>
                      {/* Joined (desktop only) */}
                      <td className="hidden px-4 py-3 text-[var(--muted-foreground)] md:table-cell md:px-6 md:py-4">
                        {new Date(user.createdAt).toLocaleString()}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3 text-right md:px-6 md:py-4">
                        <div className="flex flex-col items-end gap-1.5 md:flex-row md:justify-end md:gap-2">
                          {/* View */}
                          <button
                            type="button"
                            onClick={() => handleViewProfile(user.id)}
                            className="inline-flex w-full items-center justify-center gap-1 rounded-lg border-2 border-emerald-500 bg-[var(--mint-100)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2] md:w-auto md:rounded-xl md:px-3 md:py-1.5 md:text-xs"
                          >
                            <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>

                          {/* Ban / Unban */}
                          {user.status === "ACTIVE" ? (
                            <button
                              type="button"
                              disabled={actionId === user.id}
                              onClick={() => handleStatusUpdate(user.id, "SUSPENDED", "Ban")}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-amber-400 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-400 md:w-auto md:rounded-xl md:px-3 md:py-1.5 md:text-xs"
                            >
                              <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Ban
                            </button>
                          ) : user.status === "SUSPENDED" ? (
                            <button
                              type="button"
                              disabled={actionId === user.id}
                              onClick={() => handleStatusUpdate(user.id, "ACTIVE", "Unban")}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--accent-dark)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-1.5 md:text-xs"
                            >
                              <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Unban
                            </button>
                          ) : null}

                          {/* Delete */}
                          {user.status !== "DELETED" && (
                            <button
                              type="button"
                              disabled={actionId === user.id}
                              onClick={() => handleStatusUpdate(user.id, "DELETED", "Delete")}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#8A2A2A] px-2.5 py-1 text-[10px] font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10 md:w-auto md:rounded-xl md:px-3 md:py-1.5 md:text-xs"
                            >
                              <svg className="h-3 w-3 md:h-3.5 md:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}

                          {/* Restore (for deleted users) */}
                          {user.status === "DELETED" && (
                            <button
                              type="button"
                              disabled={actionId === user.id}
                              onClick={() => handleStatusUpdate(user.id, "ACTIVE", "Restore")}
                              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[var(--accent-dark)] px-2.5 py-1 text-[10px] font-bold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-1.5 md:text-xs"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!users.length && (
              <div className="p-6 text-center text-sm text-[var(--muted-foreground)]">
                No users found matching criteria.
              </div>
            )}
          </div>
        </>
      )}

      {/* Profile Modal */}
      {profileOpen && (
        <UserProfileModal
          user={profileUser}
          loading={profileLoading}
          onClose={() => {
            setProfileOpen(false);
            setProfileUser(null);
          }}
        />
      )}
    </section>
  );
}
