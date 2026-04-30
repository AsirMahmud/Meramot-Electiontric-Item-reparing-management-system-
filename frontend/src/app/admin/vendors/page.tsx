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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors`, {
        credentials: "include",
        headers: getAuthHeaders(token),
      });
      const data = await res.json();
      if (res.ok) {
        setVendors(data.data);
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

    const passkey = window.prompt("SECURITY CHECK:\nPlease enter your 10-minute Admin Passkey (sent to your email) to confirm this deletion:");
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
        <h2 className="text-2xl font-bold text-[var(--accent-dark)]">Vendors</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Approve, reject, and monitor vendor shops on the platform.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Total Vendors</p>
          <p className="mt-1 text-2xl font-bold text-[var(--accent-dark)]">{totalVendors}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Pending</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{pendingVendors.length}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Approved</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{approvedVendors}</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-white dark:bg-[#1C251F] p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-[var(--muted-foreground)]">Rejected</p>
          <p className="mt-1 text-2xl font-bold text-rose-600">{rejectedVendors}</p>
        </div>
      </div>

      <section>
        <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">Pending Approvals ({pendingVendors.length})</h3>
        {pendingVendors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No pending vendor applications.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white dark:bg-[#1C251F]">
            <table className="w-full text-left text-sm text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Vendor Shop</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Applied At</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {pendingVendors.map((vendor) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-[var(--card)]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--accent-dark)]">{vendor.shopName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Applicant: {vendor.user?.name || vendor.user?.username}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{vendor.businessEmail}</p>
                      <p className="text-[var(--muted-foreground)]">{vendor.phone}</p>
                    </td>
                    <td className="px-6 py-4 text-[var(--muted-foreground)]">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="rounded-xl bg-[var(--mint-100)] px-3 py-2 text-xs font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2]"
                        >
                          View
                        </Link>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => handleApplicationAction(vendor.id, "approve")}
                          className="rounded-xl bg-[#244233] px-3 py-2 text-xs font-bold text-[#DCEAD7] transition hover:bg-[var(--accent-dark)] disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={actionId === vendor.id}
                          onClick={() => handleApplicationAction(vendor.id, "reject")}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
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
        <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">All Vendors ({allOtherVendors.length})</h3>
        {allOtherVendors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#C7D7C2] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
            No verified vendors found.
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-white dark:bg-[#1C251F]">
            <table className="w-full text-left text-sm text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] bg-[var(--card)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Vendor Shop</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">App Status</th>
                  <th className="px-6 py-4 font-semibold">Shop Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#Eef5Ea]">
                {allOtherVendors.map((vendor) => (
                  <tr key={vendor.id} className="transition-colors hover:bg-[var(--card)]">
                    <td className="px-6 py-4">
                      <p className="font-bold text-[var(--accent-dark)]">{vendor.shopName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Applicant: {vendor.user?.name || vendor.user?.username}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p>{vendor.businessEmail}</p>
                      <p className="text-[var(--muted-foreground)]">{vendor.phone}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block rounded-lg px-3 py-1 text-xs font-bold ${
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
                    <td className="px-6 py-4">
                      {vendor.shop ? (
                        <span className={`font-medium ${vendor.shop.isActive ? "text-[var(--accent-dark)]" : "text-[#8A2A2A]"}`}>
                          {vendor.shop.isActive ? "Active" : "Suspended"}
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/vendors/${vendor.id}`}
                          className="rounded-xl bg-[var(--mint-100)] px-3 py-1 text-xs font-bold text-[var(--accent-dark)] transition hover:bg-[#D7E2D2]"
                        >
                          View
                        </Link>
                        {vendor.shop && (
                          <button
                            type="button"
                            disabled={actionId === vendor.id}
                            onClick={() => handleShopSuspendToggle(vendor.id, vendor.shop!.id, !vendor.shop!.isActive)}
                            className={`rounded-xl border px-3 py-1 text-xs font-bold transition disabled:opacity-50 ${
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
                          className="rounded-xl border border-[#8A2A2A] px-3 py-1 text-xs font-bold text-[#8A2A2A] transition hover:bg-[#FDEAEA] disabled:opacity-50"
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
