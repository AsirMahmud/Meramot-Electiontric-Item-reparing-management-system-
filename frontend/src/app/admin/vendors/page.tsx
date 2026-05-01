"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";
import { useSession } from "next-auth/react";

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
  } | null;
};

export default function AdminVendorsPage() {
  const { data: session } = useSession();
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    const token = (session?.user as any)?.accessToken;
    if (token) fetchVendors(token);
  }, [session]);

  const fetchVendors = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors?limit=100`, {
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
    if (!window.confirm(`Are you sure you want to ${isActive ? 'reinstate' : 'suspend'} this shop?`)) {
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
    <div className="space-y-8">
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

      <section>
        <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">Pending Approvals ({pendingVendors.length})</h3>
        {pendingVendors.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
            No pending vendor applications.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Vendor Shop</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Applied At</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {pendingVendors.map((vendor) => (
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
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--mint-100)] px-3 py-1.5 text-center text-[10px] font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2] md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => handleApplicationAction(vendor.id, "approve")}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[#244233] px-3 py-1.5 text-[10px] font-bold text-[#DCEAD7] transition hover:bg-[var(--accent-dark)] disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => handleApplicationAction(vendor.id, "reject")}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-2 md:text-xs"
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
        <h3 className="mb-3 text-base font-bold text-[var(--accent-dark)] md:mb-4 md:text-lg">All Vendors ({allOtherVendors.length})</h3>
        {allOtherVendors.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-[#C7D7C2] bg-[var(--card)] p-6 text-center text-xs text-[var(--muted-foreground)] md:rounded-3xl md:p-8 md:text-sm">
            No verified vendors found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[1.5rem] border border-[var(--border)] bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:bg-[#1C251F] md:rounded-3xl">
            <table className="min-w-full text-left text-[10px] text-[var(--foreground)] md:text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Vendor Shop</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Contact</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">App Status</th>
                  <th className="px-4 py-3 font-semibold md:px-6 md:py-4">Shop Status</th>
                  <th className="px-4 py-3 text-right font-semibold md:px-6 md:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea] dark:divide-white/10">
                {allOtherVendors.map((vendor) => (
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
                    <td className="px-4 py-3 text-right md:px-6 md:py-4">
                      <div className="flex flex-col items-end gap-2 md:flex-row md:justify-end">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--mint-100)] px-3 py-1.5 text-[10px] font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2] md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs"
                        >
                          View
                        </Link>
                        {vendor.shop && (
                          <button
                            type="button"
                            disabled={actionId === vendor.id}
                            onClick={() => handleShopSuspendToggle(vendor.id, vendor.shop!.id, !vendor.shop!.isActive)}
                            className={`inline-flex w-full items-center justify-center rounded-lg border px-3 py-1.5 text-[10px] font-bold transition disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs ${
                              vendor.shop.isActive 
                                ? "border-[#8A2A2A] text-[#8A2A2A] hover:bg-[#FDEAEA]" 
                                : "border-[var(--accent-dark)] bg-[var(--accent-dark)] text-white hover:opacity-90"
                            }`}
                          >
                            {vendor.shop.isActive ? "Suspend" : "Reinstate"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => handleDeleteApplication(vendor.id)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-[#8A2A2A] px-3 py-1.5 text-[10px] font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50 md:w-auto md:rounded-xl md:px-3 md:py-1 md:text-xs"
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
        )}
      </section>
    </div>
  );
}
