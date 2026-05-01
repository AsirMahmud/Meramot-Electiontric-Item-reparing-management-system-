"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loading, setLoading] = useState(true);

  // Action Panel State
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/vendors/${id}`, {
          credentials: "include",
          headers: getAuthHeaders(token),
        });
        const data = await res.json();
        if (res.ok) {
          const app = data.application || data.data;
          // API returns `user` but frontend type expects `applicant`
          if (app && app.user && !app.applicant) {
            app.applicant = app.user;
          }
          if (app && app.createdAt && !app.submittedAt) {
            app.submittedAt = app.createdAt;
          }
          setApplication(app);
        } else {
          alert(data.message || "Failed to load vendor application");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (id && token) fetchVendor();
  }, [id, token]);

  const handleApplicationAction = async (action: "approve" | "reject" | "request-info") => {
    try {
      setIsProcessing(true);
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

  const handleDeleteApplication = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this application? The vendor will have to apply again from scratch.")) {
      return;
    }

    const passkey = window.prompt("SECURITY CHECK:\nPlease enter your 1-hour Admin Passkey (sent to your email) to confirm this deletion:");
    if (!passkey) {
      alert("Deletion cancelled. Passkey is required.");
      return;
    }

    try {
      setIsProcessing(true);
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
        alert("Application deleted successfully.");
        router.push("/admin/vendors");
      } else {
        alert(data.message || "Failed to delete application");
      }
    } catch (error) {
      console.error(error);
      alert("Error deleting application.");
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
                  ...getAuthHeaders(token),
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

  const handleShopFeaturedToggle = async (isFeatured: boolean) => {
      if (!application?.shop) return;
      if (!window.confirm(`Are you sure you want to ${isFeatured ? 'feature' : 'un-feature'} this shop?`)) {
          return;
      }

      try {
          setIsProcessing(true);
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/shops/${application.shop.id}/featured`, {
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
              setApplication(prev => {
                  if (!prev || !prev.shop) return prev;
                  return {
                      ...prev,
                      shop: {
                          ...prev.shop,
                          isFeatured: data.data.isFeatured
                      }
                  }
              });
              alert(data.message || "Shop featured status updated.");
          } else {
              alert(data.message || "Failed to update shop featured status.");
          }
      } catch (error) {
          console.error(error);
          alert("Error updating shop featured status.");
      } finally {
          setIsProcessing(false);
      }
  };

  if (loading) {
    return <div className="p-8 text-[var(--muted-foreground)]">Loading vendor details...</div>;
  }

  if (!application) {
    return (
      <div className="p-8 text-[var(--muted-foreground)]">
        Vendor application not found. <Link href="/admin/vendors" className="underline">Go back</Link>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-col items-start gap-4 shrink-0 md:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:w-auto">
          <Link 
            href="/admin/vendors" 
            className="mb-3 -ml-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white dark:bg-[#1C251F] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] transition-all hover:bg-[var(--mint-50)] hover:text-[var(--accent-dark)] hover:shadow-md active:scale-95 md:mb-4 md:-ml-3 md:px-4 md:py-2 md:text-xs"
          >
            <span>←</span> Back to Vendors
          </Link>
          <h2 className="text-xl font-bold text-[var(--accent-dark)] break-words md:text-3xl">{application.shopName}</h2>
          <p className="mt-1 text-xs text-[var(--muted-foreground)] md:text-sm">Application ID: {application.id}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <span className="rounded-full bg-[var(--mint-100)] px-3 py-1.5 text-xs font-semibold tracking-wide text-[var(--accent-dark)] md:px-4 md:py-2 md:text-sm">
            {application.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)] p-6 md:p-8">
            <h3 className="text-xl font-bold text-[var(--accent-dark)]">Business Information</h3>
            
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Owner Name</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">{application.ownerName}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Contact</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">{application.businessEmail}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{application.phone}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Address</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">{application.address}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{application.city}{application.area ? `, ${application.area}` : ""}</p>
                </div>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Documents</p>
                    <p className="mt-1 font-medium text-[var(--accent-dark)]">Trade License: {application.tradeLicenseNo || "N/A"}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">National ID: {application.nationalIdNo || "N/A"}</p>
                </div>
            </div>

            <div className="mt-6 border-t border-[var(--border)] pt-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Services Offered</p>
                <div className="mt-3 flex flex-wrap gap-3">
                    {application.inShopRepair && <span className="rounded-full bg-white dark:bg-[#1C251F] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">In-Shop Repair</span>}
                    {application.courierPickup && <span className="rounded-full bg-white dark:bg-[#1C251F] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">Courier Pickup</span>}
                    {application.spareParts && <span className="rounded-full bg-white dark:bg-[#1C251F] px-4 py-2 text-sm text-[var(--foreground)] shadow-sm">Spare Parts</span>}
                </div>
                {application.specialties.length > 0 && (
                    <div className="mt-4">
                        <p className="text-sm font-semibold text-[var(--muted-foreground)]">Specialties:</p>
                        <p className="mt-1 text-[var(--foreground)]">{application.specialties.join(", ")}</p>
                    </div>
                )}
            </div>

            {application.notes && (
                <div className="mt-6 rounded-2xl bg-white dark:bg-[#1C251F] p-5 shadow-sm border border-[var(--border)]">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Applicant Notes</p>
                    <p className="mt-2 text-[var(--foreground)]">{application.notes}</p>
                </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--accent-dark)]">Applicant Account</h3>
            <div className="mt-4">
                <p className="font-semibold text-[var(--accent-dark)]">{application.applicant?.name || application.applicant?.username}</p>
                <p className="text-[var(--muted-foreground)]">{application.applicant.email}</p>
            </div>
          </div>

        </div>

        {/* Right Column: Action Panel & Shop Status */}
        <div className="space-y-6">
            
            {/* If application is pending */}
            {application.status === "PENDING" && (
                <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-[var(--accent-dark)]">Application Actions</h3>
                    <div className="space-y-3">
                        <button
                            onClick={() => handleApplicationAction("approve")}
                            disabled={isProcessing}
                            className="w-full rounded-xl bg-[var(--accent-dark)] px-4 py-3 font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
                        >
                            Approve Application
                        </button>
                        <button
                            onClick={() => handleApplicationAction("request-info")}
                            disabled={isProcessing}
                            className="w-full rounded-xl border border-[var(--accent-dark)] bg-white dark:bg-[#1C251F] px-4 py-3 font-semibold text-[var(--accent-dark)] transition hover:bg-[var(--mint-100)] disabled:opacity-50"
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

            {/* If application is REJECTED, show delete option */}
            {application.status === "REJECTED" && (
                <div className="rounded-[28px] border border-[#8A2A2A]/20 bg-[#FDEAEA] p-6 shadow-sm">
                    <h3 className="mb-4 text-lg font-bold text-[#8A2A2A]">Danger Zone</h3>
                    <p className="mb-4 text-sm text-[#8A2A2A]">The vendor can update their information and resubmit this rejected application. If you delete it completely, they will have to apply again from scratch.</p>
                    <button
                        onClick={handleDeleteApplication}
                        disabled={isProcessing}
                        className="w-full rounded-xl bg-[#8A2A2A] px-4 py-3 font-semibold text-white transition hover:bg-[#6b2020] disabled:opacity-50"
                    >
                        Delete Request Entirely
                    </button>
                </div>
            )}

            {/* If shop exists (approved) */}
            {application.shop && (
                <div className="rounded-[28px] border border-[var(--border)] bg-[var(--mint-50)] p-6 shadow-sm">
                    <h3 className="mb-2 text-lg font-bold text-[var(--accent-dark)]">Shop Status</h3>
                    
                    <div className="mb-6 rounded-2xl bg-white dark:bg-[#1C251F] p-4 shadow-sm">
                        <p className="text-sm text-[var(--muted-foreground)]">Rating: <span className="font-semibold text-[var(--accent-dark)]">{application.shop.ratingAvg}</span> ({application.shop.reviewCount} reviews)</p>
                        <p className="mt-2 text-sm text-[var(--muted-foreground)]">Status: <span className={`font-semibold ${application.shop.isActive ? "text-[var(--accent-dark)]" : "text-[#8A2A2A]"}`}>{application.shop.isActive ? "Active" : "Suspended"}</span></p>
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
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Suspending the shop will hide it from customers and prevent new repair requests.</p>
                        </div>
                    ) : (
                        <div>
                            <button
                                onClick={() => handleShopSuspendToggle(true)}
                                disabled={isProcessing}
                                className="w-full rounded-xl bg-[var(--accent-dark)] px-4 py-3 font-semibold text-[var(--accent-foreground)] transition hover:opacity-90 disabled:opacity-50"
                            >
                                Reinstate Shop
                            </button>
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">Reinstating the shop makes it active for customers again.</p>
                        </div>
                    )}

                    <div className="mt-6 border-t border-[var(--border)] pt-6">
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <p className="font-semibold text-[var(--accent-dark)]">Featured Shop</p>
                                <p className="text-xs text-[var(--muted-foreground)]">Highlight this shop on the homepage</p>
                            </div>
                            <button
                                onClick={() => handleShopFeaturedToggle(!application.shop?.isFeatured)}
                                disabled={isProcessing}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                    application.shop?.isFeatured ? "bg-[var(--accent-dark)]" : "bg-gray-300 dark:bg-gray-700"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        application.shop?.isFeatured ? "translate-x-6" : "translate-x-1"
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {application.reviewNotes && (
                <div className="rounded-[28px] border border-[var(--border)] bg-white dark:bg-[#1C251F] p-6 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Reviewer Notes</p>
                    <p className="mt-2 text-[var(--foreground)] italic">"{application.reviewNotes}"</p>
                    {application.reviewedBy && (
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">- {application.reviewedBy.name || application.reviewedBy.email}</p>
                    )}
                </div>
            )}
        </div>
      </div>
    </section>
  );
}
