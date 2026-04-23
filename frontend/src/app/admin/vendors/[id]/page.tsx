"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getAuthHeaders } from "@/lib/api";

type VendorApplication = {
  id: string;
  applicantUserId: string;
  shopId: string | null;
  ownerName: string;
  businessEmail: string;
  phone: string;
  shopName: string;
  tradeLicenseNo: string | null;
  nationalIdNo: string | null;
  address: string;
  city: string | null;
  area: string | null;
  specialties: string[];
  courierPickup: boolean;
  inShopRepair: boolean;
  spareParts: boolean;
  notes: string | null;
  reviewNotes: string | null;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  applicant: {
    id: string;
    name: string | null;
    email: string;
    username: string;
    phone: string | null;
  };
  reviewedBy?: {
    name: string | null;
    email: string;
  } | null;
  shop?: {
    id: string;
    name: string;
    isActive: boolean;
    ratingAvg: number;
    reviewCount: number;
  } | null;
};

export default function AdminVendorDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loading, setLoading] = useState(true);

  // Action Panel State
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (res.ok) {
          setApplication(data.data);
        } else {
          alert(data.message || "Failed to load vendor application");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchVendor();
  }, [id]);

  const handleApplicationAction = async (action: "approve" | "reject" | "request-info") => {
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

      const data = await res.json();
      if (res.ok) {
        alert(`Application ${action}d successfully.`);
        router.refresh();
        // Option to go back or stay and view the newly created shop.
        // If approved, the response typically includes the updated application. Let's just refetch.
        window.location.reload();
      } else {
        alert(data.message || "Failed to process application");
      }
    } catch (error) {
      console.error(error);
      alert("Error processing application.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShopSuspendToggle = async (isActive: boolean) => {
      if (!application?.shop) return;
      if (!window.confirm(`Are you sure you want to ${isActive ? 'reinstate' : 'suspend'} this shop?`)) {
          return;
      }

      try {
          setIsProcessing(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/shops/${application.shop.id}/active`, {
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
              setApplication(prev => {
                  if (!prev || !prev.shop) return prev;
                  return {
                      ...prev,
                      shop: {
                          ...prev.shop,
                          isActive: data.data.isActive
                      }
                  }
              });
              alert(data.message || "Shop status updated.");
          } else {
              alert(data.message || "Failed to update shop status.");
          }
      } catch (error) {
          console.error(error);
          alert("Error updating shop status.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (loading) {
    return <div className="p-8 text-[#6B7C72]">Loading vendor details...</div>;
  }

  if (!application) {
    return (
      <div className="p-8 text-[#6B7C72]">
        Vendor application not found. <Link href="/admin/vendors" className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/vendors" className="mb-2 inline-block text-sm font-semibold text-[#5E7366] hover:underline">
            &larr; Back to Vendors
          </Link>
          <h2 className="text-3xl font-bold text-[#1F4D2E]">{application.shopName}</h2>
          <p className="mt-1 text-[#6B7C72]">Application ID: {application.id}</p>
        </div>
        <div className="rounded-full bg-[#E6F0E2] px-4 py-2 font-semibold tracking-wide text-[#1F4D2E]">
          {application.status}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[#1F4D2E]">Business Information</h3>
            
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Owner Name</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">{application.ownerName}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Contact</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">{application.businessEmail}</p>
                    <p className="text-sm text-[#6B7C72]">{application.phone}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Address</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">{application.address}</p>
                    <p className="text-sm text-[#6B7C72]">{application.city}{application.area ? `, ${application.area}` : ""}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Documents</p>
                    <p className="mt-1 font-medium text-[#1F4D2E]">Trade License: {application.tradeLicenseNo || "N/A"}</p>
                    <p className="text-sm text-[#6B7C72]">National ID: {application.nationalIdNo || "N/A"}</p>
                </div>
            </div>

            <div className="mt-6 border-t border-[#D7E2D2] pt-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Services Offered</p>
                <div className="mt-3 flex flex-wrap gap-3">
                    {application.inShopRepair && <span className="rounded-full bg-white px-4 py-2 text-sm text-[#244233] shadow-sm">In-Shop Repair</span>}
                    {application.courierPickup && <span className="rounded-full bg-white px-4 py-2 text-sm text-[#244233] shadow-sm">Courier Pickup</span>}
                    {application.spareParts && <span className="rounded-full bg-white px-4 py-2 text-sm text-[#244233] shadow-sm">Spare Parts</span>}
                </div>
                {application.specialties.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-[#5E7366]">Specialties:</p>
                        <p className="mt-1 text-[#244233]">{application.specialties.join(", ")}</p>
                    </div>
                )}
            </div>

            {application.notes && (
                <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm border border-[#D7E2D2]">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Applicant Notes</p>
                    <p className="mt-2 text-[#244233]">{application.notes}</p>
                </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[#D7E2D2] bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[#1F4D2E]">Applicant Account</h3>
            <div className="mt-4">
                <p className="font-semibold text-[#1F4D2E]">{application.applicant.name || application.applicant.username}</p>
                <p className="text-[#6B7C72]">{application.applicant.email}</p>
            </div>
          </div>

        </div>

        {/* Right Column: Action Panel & Shop Status */}
        <div className="space-y-6">
            
            {/* If application is pending */}
            {application.status === "PENDING" && (
                <div className="rounded-[28px] border border-[#D7E2D2] bg-white p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-[#1F4D2E]">Application Actions</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => handleApplicationAction("approve")}
                            disabled={isProcessing}
                            className="w-full rounded-xl bg-[#1F4D2E] px-4 py-3 font-semibold text-white transition hover:bg-[#183D24] disabled:opacity-50"
                        >
                            Approve Application
                        </button>
                        <button
                            onClick={() => handleApplicationAction("request-info")}
                            disabled={isProcessing}
                            className="w-full rounded-xl border border-[#1F4D2E] bg-white px-4 py-3 font-semibold text-[#1F4D2E] transition hover:bg-[#E6F0E2] disabled:opacity-50"
                        >
                            Request More Info
                        </button>
                        <button
                            onClick={() => handleApplicationAction("reject")}
                            disabled={isProcessing}
                            className="w-full rounded-xl bg-[#FDEAEA] px-4 py-3 font-semibold text-[#8A2A2A] transition hover:bg-[#FAD4D4] disabled:opacity-50"
                        >
                            Reject Application
                        </button>
                    </div>
                </div>
            )}

            {/* If shop exists (approved) */}
            {application.shop && (
                <div className="rounded-[28px] border border-[#D7E2D2] bg-[#F2F5EF] p-6 shadow-sm">
                    <h3 className="mb-2 text-lg font-bold text-[#1F4D2E]">Shop Status</h3>
                    
                    <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
                        <p className="text-sm text-[#6B7C72]">Rating: <span className="font-semibold text-[#1F4D2E]">{application.shop.ratingAvg}</span> ({application.shop.reviewCount} reviews)</p>
                        <p className="mt-2 text-sm text-[#6B7C72]">Status: <span className={`font-semibold ${application.shop.isActive ? "text-[#1F4D2E]" : "text-[#8A2A2A]"}`}>{application.shop.isActive ? "Active" : "Suspended"}</span></p>
                    </div>

                    {application.shop.isActive ? (
                        <div>
                            <button
                                onClick={() => handleShopSuspendToggle(false)}
                                disabled={isProcessing}
                                className="w-full rounded-xl bg-[#FDEAEA] px-4 py-3 font-semibold text-[#8A2A2A] transition hover:bg-[#FAD4D4] disabled:opacity-50"
                            >
                                Suspend Shop
                            </button>
                            <p className="mt-2 text-xs text-[#6B7C72]">Suspending the shop will hide it from customers and prevent new repair requests.</p>
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={() => handleShopSuspendToggle(true)}
                                disabled={isProcessing}
                                className="w-full rounded-xl bg-[#1F4D2E] px-4 py-3 font-semibold text-white transition hover:bg-[#183D24] disabled:opacity-50"
                            >
                                Reinstate Shop
                            </button>
                            <p className="mt-2 text-xs text-[#6B7C72]">Reinstating the shop makes it active for customers again.</p>
                        </div>
                    )}
                </div>
            )}

            {application.reviewNotes && (
                <div className="rounded-[28px] border border-[#D7E2D2] bg-white p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[#5E7366]">Reviewer Notes</p>
                    <p className="mt-2 text-[#244233] italic">"{application.reviewNotes}"</p>
                    {application.reviewedBy && (
                        <p className="mt-2 text-xs text-[#6B7C72]">- {application.reviewedBy.name || application.reviewedBy.email}</p>
                    )}
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
