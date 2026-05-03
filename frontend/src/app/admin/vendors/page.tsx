"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";
import { useSession } from "next-auth/react";
import AdminTableControls from "@/components/admin/AdminTableControls";
import { useAdminTableState } from "@/hooks/useAdminTableState";

type VendorApplication = {
  id: string;
  shopName: string;
  businessEmail: string;
  phone: string;
  city?: string | null;
  area?: string | null;
  status: string;
  createdAt: string;
  user?: {
    name?: string | null;
    username?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  shop?: {
    id: string;
    isActive: boolean;
    isFeatured: boolean;
  } | null;
};

export default function AdminVendorsPage() {
  const { data: session } = useSession();
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [hasNewData, setHasNewData] = useState(false);

  useEffect(() => {
    const token = (session?.user as any)?.accessToken;
    if (token) fetchVendors(token);
  }, [session]);

  useEffect(() => {
    const token = (session?.user as any)?.accessToken;
    if (!token || loading) return;

    // Poll every 15 seconds to check for data concurrency
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors?limit=1000`, {
          credentials: "include",
          headers: getAuthHeaders(token),
        });
        const data = await res.json();
        if (res.ok && data.applications) {
          // Compare current vendors array length and statuses with the fetched data
          // If there's a difference, it means someone else updated the table
          const currentHash = vendors.map(v => `${v.id}-${v.status}`).sort().join("|");
          const newHash = data.applications.map((v: any) => `${v.id}-${v.status}`).sort().join("|");
          
          if (currentHash !== newHash) {
            setHasNewData(true);
          }
        }
      } catch (error) {
        // silently fail background polling
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [session, vendors, loading]);

  const fetchVendors = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors?limit=1000`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(data.applications || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationAction = async (id: string, action: "approve" | "reject" | "request-info") => {
    try {
      setActionId(id);
      const token = (session?.user as any)?.accessToken;
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors/${id}/${action}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({
          reviewNotes:
            action === "approve"
              ? "Approved by admin"
              : action === "reject"
                ? "Rejected by admin"
                : "Please provide additional business verification details",
        }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setVendors((prev) =>
          prev.map((vendor) =>
            vendor.id === id
              ? {
                  ...vendor,
                  status:
                    action === "approve"
                      ? "APPROVED"
                      : action === "reject"
                        ? "REJECTED"
                        : "MORE_INFO_REQUIRED",
                  shop: action === "approve" ? updatedData.data.shop : vendor.shop
                }
              : vendor,
          ),
        );
      } else {
        const data = await res.json();
        alert(data.message || "Action failed");
      }
    } catch (error) {
      console.error(error);
      alert("Error performing action");
    } finally {
      setActionId(null);
    }
  };

  const handleShopSuspendToggle = async (vendorId: string, shopId: string, isActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isActive ? 'restore' : 'suspend'} this shop?`)) {
      return;
    }

    try {
      setActionId(vendorId);
      const token = (session?.user as any)?.accessToken;
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/shops/${shopId}/active`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ isActive }),
      });

      const data = await res.json();
      if (res.ok) {
        setVendors((prev) =>
          prev.map((vendor) =>
            vendor.id === vendorId
              ? {
                  ...vendor,
                  shop: {
                    ...vendor.shop!,
                    isActive: data.data.isActive
                  }
                }
              : vendor
          )
        );
      } else {
        alert(data.message || "Failed to update shop status");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating shop status");
    } finally {
      setActionId(null);
    }
  };

  const handleShopFeaturedToggle = async (vendorId: string, shopId: string, isFeatured: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isFeatured ? 'feature' : 'un-feature'} this shop?`)) {
      return;
    }

    try {
      setActionId(vendorId);
      const token = (session?.user as any)?.accessToken;
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/shops/${shopId}/featured`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(token),
        },
        body: JSON.stringify({ isFeatured }),
      });

      const data = await res.json();
      if (res.ok) {
        setVendors((prev) =>
          prev.map((vendor) =>
            vendor.id === vendorId
              ? {
                  ...vendor,
                  shop: {
                    ...vendor.shop!,
                    isFeatured: data.data.isFeatured
                  }
                }
              : vendor
          )
        );
      } else {
        alert(data.message || "Failed to update featured status");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating featured status");
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this application? The vendor will have to apply again from scratch.")) {
      return;
    }

    const passkey = window.prompt("SECURITY CHECK:\nPlease enter your 1-hour Admin Passkey (sent to your email) to confirm this deletion:");
    if (!passkey) {
      alert("Deletion cancelled. Passkey is required.");
      return;
    }

    try {
      setActionId(id);
      const token = (session?.user as any)?.accessToken;
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          ...getAuthHeaders(token),
          "x-admin-passkey": passkey
        },
      });

      const data = await res.json();
      if (res.ok) {
        setVendors((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert(data.message || "Failed to delete application");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting application.");
    } finally {
      setActionId(null);
    }
  };

  if (loading && vendors.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-[var(--muted-foreground)] animate-pulse">Loading vendor applications...</p>
      </div>
    );
  }

  const pendingVendors = vendors.filter((v) => v.status === "PENDING");
  const allOtherVendors = vendors.filter((v) => v.status !== "PENDING");

  const totalVendors = vendors.length;
  const approvedVendors = vendors.filter(v => v.status === "APPROVED").length;
  const rejectedVendors = vendors.filter(v => v.status === "REJECTED").length;

  return (
    <div className="min-w-0 space-y-8 relative overflow-hidden">
      {hasNewData && (
        <div className="sticky top-4 z-50 rounded-xl border border-blue-500 bg-blue-50 p-4 shadow-lg dark:border-blue-800 dark:bg-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2 dark:bg-blue-800">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-300">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-100">Data was updated elsewhere</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Another admin has made changes to this table. Please refresh to see the latest changes.</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full sm:w-auto"
          >
            Refresh Data
          </button>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold text-[var(--accent-dark)] md:text-2xl">Vendors</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">
          Approve, reject, and monitor vendor shops on the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:gap-4 md:grid-cols-4">
        <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Total Vendors</p>
          <p className="mt-1 text-lg font-bold text-[var(--accent-dark)] md:text-2xl">{totalVendors}</p>
        </div>
        <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Pending</p>
          <p className="mt-1 text-lg font-bold text-amber-600 md:text-2xl">{pendingVendors.length}</p>
        </div>
        <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Approved</p>
          <p className="mt-1 text-lg font-bold text-emerald-600 md:text-2xl">{approvedVendors}</p>
        </div>
        <div className="rounded-[1.25rem] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-3 shadow-sm md:rounded-2xl md:p-4">
          <p className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] md:text-xs">Rejected</p>
          <p className="mt-1 text-lg font-bold text-rose-600 md:text-2xl">{rejectedVendors}</p>
        </div>
      </div>

      <PendingSection vendors={pendingVendors} actionId={actionId} onAction={handleApplicationAction} onDelete={handleDeleteApplication} />
      <AllVendorsSection
        vendors={allOtherVendors}
        actionId={actionId}
        onSuspendToggle={handleShopSuspendToggle}
        onFeaturedToggle={handleShopFeaturedToggle}
        onDelete={handleDeleteApplication}
      />
    </div>
  );
}

/* ── Pending Vendors Sub-Section ─────────────────────────────────── */

function PendingSection({
  vendors,
  actionId,
  onAction,
  onDelete,
}: {
  vendors: VendorApplication[];
  actionId: string | null;
  onAction: (id: string, action: "approve" | "reject" | "request-info") => void;
  onDelete: (id: string) => void;
}) {
  const table = useAdminTableState(vendors, ["shopName", "businessEmail", "phone", "user"] as any);

  return (
    <section>
      <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">Pending Approvals ({vendors.length})</h3>
      {vendors.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
          No pending vendor applications.
        </div>
      ) : (
        <>
          <AdminTableControls
            searchPlaceholder="Search pending vendors…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "24%" }} />
                <col style={{ width: "20%" }} />
                <col style={{ width: "28%" }} />
              </colgroup>
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Vendor Shop</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Applied At</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {table.paged.map((vendor) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-[var(--card)] dark:hover:bg-white/5">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="font-bold text-[var(--accent-dark)] line-clamp-2 md:line-clamp-none">{vendor.shopName}</p>
                      <p className="text-[9px] text-[var(--muted-foreground)] md:text-xs">Applicant: {vendor.user?.name || vendor.user?.username}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="line-clamp-1">{vendor.businessEmail}</p>
                      <p className="text-[var(--muted-foreground)] line-clamp-1">{vendor.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6 md:py-4">
                      <span className="md:hidden">{new Date(vendor.createdAt).toLocaleDateString()}</span>
                      <span className="hidden md:inline">{new Date(vendor.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="inline-flex w-full items-center justify-center rounded-lg border-2 border-emerald-500 bg-[var(--mint-100)] px-3 py-1.5 text-center text-[10px] font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2] md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => onAction(vendor.id, "approve")}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[#244233] px-3 py-1.5 text-[10px] font-bold text-[#DCEAD7] transition hover:bg-[var(--accent-dark)] disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => onAction(vendor.id, "reject")}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-500 dark:bg-red-500/10 dark:text-red-400 md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => onDelete(vendor.id)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-[#8A2A2A] px-3 py-1.5 text-[10px] font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10 md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          Delete
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

/* ── All Vendors Sub-Section ─────────────────────────────────────── */

function AllVendorsSection({
  vendors,
  actionId,
  onSuspendToggle,
  onFeaturedToggle,
  onDelete,
}: {
  vendors: VendorApplication[];
  actionId: string | null;
  onSuspendToggle: (vendorId: string, shopId: string, isActive: boolean) => void;
  onFeaturedToggle: (vendorId: string, shopId: string, isFeatured: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [sortBy, setSortBy] = useState<"date" | "rating">("date");

  const customSortFn = sortBy === "rating"
    ? (a: VendorApplication, b: VendorApplication, order: "asc" | "desc") => {
        const ratingA = a.shop?.ratingAvg || 0;
        const ratingB = b.shop?.ratingAvg || 0;
        return order === "desc" ? ratingB - ratingA : ratingA - ratingB;
      }
    : undefined;

  const table = useAdminTableState(vendors, ["shopName", "businessEmail", "phone", "user"] as any, "createdAt", customSortFn);

  return (
    <section>
      <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">All Vendors ({vendors.length})</h3>
      {vendors.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
          No verified vendors found.
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "rating")}
                className="w-full rounded-2xl border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] focus:border-[var(--accent-dark)] focus:outline-none focus:ring-1 focus:ring-[#1F4D2E] md:w-auto bg-white dark:bg-[#1C251F]"
            >
                <option value="date">Sort by Applied Date</option>
                <option value="rating">Sort by Shop Rating</option>
            </select>
          </div>
          <AdminTableControls
            searchPlaceholder="Search vendors by name, email, phone…"
            searchQuery={table.searchQuery}
            onSearchChange={table.setSearchQuery}
            sortOrder={table.sortOrder}
            onSortToggle={table.toggleSort}
            sortLabelDesc={sortBy === "rating" ? "Highest rating first" : "Newest first"}
            sortLabelAsc={sortBy === "rating" ? "Lowest rating first" : "Oldest first"}
            currentPage={table.currentPage}
            totalPages={table.totalPages}
            onPageChange={table.setCurrentPage}
          />
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "20%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "26%" }} />
              </colgroup>
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Vendor Shop</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Rating</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">App Status</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Shop Status</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Featured</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {table.paged.map((vendor) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-[var(--card)] dark:hover:bg-white/5">
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="font-bold text-[var(--accent-dark)] line-clamp-2 md:line-clamp-none">{vendor.shopName}</p>
                      <p className="text-[9px] text-[var(--muted-foreground)] md:text-xs">Applicant: {vendor.user?.name || vendor.user?.username}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <p className="line-clamp-1">{vendor.businessEmail}</p>
                      <p className="text-[var(--muted-foreground)] line-clamp-1">{vendor.phone}</p>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      {vendor.shop ? (
                        <div className="flex items-center gap-1">
                          <svg className="h-3 w-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="font-bold text-[var(--accent-dark)]">{vendor.shop.ratingAvg?.toFixed(1) || "0.0"}</span>
                          <span className="text-[8px] text-[var(--muted-foreground)] md:text-[10px]">({vendor.shop.reviewCount || 0})</span>
                        </div>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-[8px] font-bold md:px-3 md:py-1 md:text-xs ${
                          vendor.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : vendor.status === "REJECTED"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-slate-800"
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      {vendor.shop ? (
                        <span className={`font-medium ${vendor.shop.isActive ? "text-[var(--accent-dark)]" : "text-[#8A2A2A]"}`}>
                          {vendor.shop.isActive ? "Active" : "Suspended"}
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 md:px-6 md:py-4">
                      {vendor.shop ? (
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => onFeaturedToggle(vendor.id, vendor.shop!.id, !vendor.shop!.isFeatured)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 md:h-6 md:w-11 ${
                            vendor.shop.isFeatured ? "bg-[var(--accent-dark)]" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform md:h-4 md:w-4 ${
                              vendor.shop.isFeatured ? "translate-x-5 md:translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      ) : (
                        <span className="font-medium text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="inline-flex w-full items-center justify-center rounded-lg border-2 border-emerald-500 bg-[var(--mint-100)] px-3 py-1.5 text-[10px] font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2] md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs"
                        >
                          View
                        </Link>
                        {vendor.shop && (
                          <button
                            type="button"
                            disabled={actionId === vendor.id}
                            onClick={() => onSuspendToggle(vendor.id, vendor.shop!.id, !vendor.shop!.isActive)}
                            className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs ${
                              vendor.shop.isActive 
                                ? "border-[#8A2A2A] text-[#8A2A2A] hover:bg-[#FDEAEA] dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10" 
                                : "border-[var(--accent-dark)] bg-[var(--accent-dark)] text-white hover:opacity-90"
                            }`}
                          >
                            {vendor.shop.isActive ? "Suspend" : "Restore"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => onDelete(vendor.id)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-[#8A2A2A] px-3 py-1.5 text-[10px] font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50 dark:border-red-500 dark:text-red-400 dark:hover:bg-red-500/10 md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs"
                        >
                          Delete
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
