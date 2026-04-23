"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

type VendorApplication = {
  id: string;
  shopName: string;
  businessEmail: string;
  phone: string;
  city?: string | null;
  area?: string | null;
  status: string;
  submittedAt: string;
  applicant?: {
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
  const [vendors, setVendors] = useState<VendorApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors`, {
          credentials: "include",
          headers: getAuthHeaders(),
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

    fetchVendors();
  }, []);

  const handleApplicationAction = async (id: string, action: "approve" | "reject" | "request-info") => {
    try {
      setIsProcessing(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors/${id}/${action}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
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
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShopSuspendToggle = async (vendorId: string, shopId: string, isActive: boolean) => {
    if (!window.confirm(`Are you sure you want to ${isActive ? 'reinstate' : 'suspend'} this shop?`)) {
      return;
    }

    try {
      setIsProcessing(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/shops/${shopId}/active`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
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
      setIsProcessing(false);
    }
  };

  return (
    <section>
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#5E7366]">Vendors</p>
        <h2 className="mt-3 text-4xl font-bold text-[#1F4D2E]">Vendor management</h2>
        <p className="mt-3 text-lg text-[#6B7C72]">
          Review business applications and manage active shop statuses.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">Loading vendor applications...</div>
      ) : (
        <div className="space-y-5">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#5E7366]">
                      {vendor.status}
                    </p>
                    {vendor.shop && (
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${vendor.shop.isActive ? "bg-[#E6F0E2] text-[#1F4D2E]" : "bg-[#FDEAEA] text-[#8A2A2A]"}`}>
                        {vendor.shop.isActive ? "Shop Active" : "Shop Suspended"}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 text-2xl font-bold text-[#1F4D2E]">{vendor.shopName}</h3>
                  <p className="mt-2 text-[#244233]">
                    {vendor.applicant?.name || vendor.applicant?.username || "Unknown applicant"}
                  </p>
                  <p className="text-[#6B7C72]">{vendor.businessEmail}</p>
                  <p className="text-[#6B7C72]">{vendor.phone || vendor.applicant?.phone || "N/A"}</p>
                  <p className="mt-2 text-sm text-[#6B7C72]">
                    {vendor.city || "Unknown city"}
                    {vendor.area ? `, ${vendor.area}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {vendor.status === "PENDING" && (
                    <>
                      <button
                        onClick={() => handleApplicationAction(vendor.id, "approve")}
                        disabled={isProcessing}
                        className="rounded-full bg-[#1F4D2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#183D24] disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleApplicationAction(vendor.id, "request-info")}
                        disabled={isProcessing}
                        className="rounded-full border border-[#1F4D2E] px-5 py-3 text-sm font-semibold text-[#1F4D2E] transition hover:bg-[#E6F0E2] disabled:opacity-50"
                      >
                        Request Info
                      </button>
                      <button
                        onClick={() => handleApplicationAction(vendor.id, "reject")}
                        disabled={isProcessing}
                        className="rounded-full border border-[#B8C8B5] px-5 py-3 text-sm font-semibold text-[#6A3F3F] transition hover:bg-[#F5ECEC] disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {vendor.status === "APPROVED" && vendor.shop && (
                    <button
                      onClick={() => handleShopSuspendToggle(vendor.id, vendor.shop!.id, !vendor.shop!.isActive)}
                      disabled={isProcessing}
                      className={`rounded-full px-5 py-3 text-sm font-semibold transition disabled:opacity-50 ${vendor.shop.isActive ? "border border-[#D7E2D2] text-[#8A2A2A] hover:bg-[#FDEAEA]" : "bg-[#1F4D2E] text-white hover:bg-[#183D24]"}`}
                    >
                      {vendor.shop.isActive ? "Suspend Shop" : "Reinstate Shop"}
                    </button>
                  )}

                  <Link
                    href={`/admin/vendors/${vendor.id}`}
                    className="rounded-full bg-[#E6F0E2] px-5 py-3 text-sm font-semibold text-[#1F4D2E] transition hover:bg-[#D7E2D2]"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {!vendors.length && (
            <div className="rounded-[24px] bg-[#F2F5EF] p-6 text-[#6B7C72]">
              No vendor applications found.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
