"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Navbar from "@/components/home/Navbar";
import {
  getVendorShopProfile,
  addVendorService,
  removeVendorService,
  addVendorSparePart,
  updateVendorSparePart,
  removeVendorSparePart,
  generateAiServiceSuggestions,
  updateAiPreferences,
  acceptAiServiceSuggestion,
  rejectAiServiceSuggestion,
  type VendorShopProfileData,
  type ShopServiceItem,
  type SparePartItem,
  type AiServiceSuggestionItem,
} from "@/lib/api";

type FlashMessage = { type: "success" | "error"; text: string };

function formatMoney(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", maximumFractionDigits: 0 }).format(amount);
}

export default function VendorShopProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const token = (session?.user as { accessToken?: string } | undefined)?.accessToken;
  const role = (session?.user as { role?: string } | undefined)?.role;

  const [profile, setProfile] = useState<VendorShopProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<FlashMessage | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Service Form
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServiceDeviceType, setNewServiceDeviceType] = useState("");
  const [newServiceIssueCategory, setNewServiceIssueCategory] = useState("");
  const [newServicePricingType, setNewServicePricingType] = useState("INSPECTION_REQUIRED");
  const [newServiceBasePrice, setNewServiceBasePrice] = useState("");
  const [newServiceEstimatedDaysMin, setNewServiceEstimatedDaysMin] = useState("");
  const [newServiceEstimatedDaysMax, setNewServiceEstimatedDaysMax] = useState("");

  // New Spare Part Form
  const [newPartName, setNewPartName] = useState("");
  const [newPartDesc, setNewPartDesc] = useState("");
  const [newPartDeviceType, setNewPartDeviceType] = useState("");
  const [newPartBrand, setNewPartBrand] = useState("");
  const [newPartPrice, setNewPartPrice] = useState("");

  const loadProfile = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await getVendorShopProfile(token);
      setProfile(data);
    } catch (e) {
      setFlash({ type: "error", text: "Failed to load shop profile." });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) {
      router.replace("/login");
      return;
    }
    if (role !== "VENDOR") {
      router.replace("/");
      return;
    }
    void loadProfile();
  }, [loadProfile, role, router, session, status]);

  // Redirect to setup-shop if shop setup is not complete
  useEffect(() => {
    if (profile && !profile.shop?.setupComplete) {
      router.replace("/vendor/setup-shop");
    }
  }, [profile, router]);

  async function handleAddService(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setActionLoading("add-service");
    try {
      await addVendorService(token, {
        name: newServiceName,
        shortDescription: newServiceDesc,
        deviceType: newServiceDeviceType,
        issueCategory: newServiceIssueCategory,
        pricingType: newServicePricingType,
        basePrice: newServiceBasePrice ? Number(newServiceBasePrice) : null,
        estimatedDaysMin: newServiceEstimatedDaysMin ? Number(newServiceEstimatedDaysMin) : null,
        estimatedDaysMax: newServiceEstimatedDaysMax ? Number(newServiceEstimatedDaysMax) : null,
      });
      setFlash({ type: "success", text: "Service added successfully." });
      setNewServiceName(""); setNewServiceDesc(""); setNewServiceDeviceType(""); setNewServiceIssueCategory(""); setNewServiceBasePrice(""); setNewServiceEstimatedDaysMin(""); setNewServiceEstimatedDaysMax("");
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to add service." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveService(id: string) {
    if (!token || !confirm("Are you sure you want to remove this service?")) return;
    setActionLoading(`remove-service-${id}`);
    try {
      await removeVendorService(token, id);
      setFlash({ type: "success", text: "Service removed." });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to remove service." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddPart(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setActionLoading("add-part");
    try {
      await addVendorSparePart(token, {
        name: newPartName,
        description: newPartDesc,
        deviceType: newPartDeviceType,
        brand: newPartBrand,
        basePrice: newPartPrice ? Number(newPartPrice) : null,
      });
      setFlash({ type: "success", text: "Spare part added." });
      setNewPartName(""); setNewPartDesc(""); setNewPartDeviceType(""); setNewPartBrand(""); setNewPartPrice("");
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to add spare part." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemovePart(id: string) {
    if (!token || !confirm("Are you sure you want to remove this spare part?")) return;
    setActionLoading(`remove-part-${id}`);
    try {
      await removeVendorSparePart(token, id);
      setFlash({ type: "success", text: "Spare part removed." });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to remove spare part." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateAi() {
    if (!token) return;
    setActionLoading("ai-generate");
    try {
      const res = await generateAiServiceSuggestions(token);
      setFlash({ type: "success", text: res.message });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to generate AI suggestions." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAiPreference(enabled: boolean) {
    if (!token) return;
    setActionLoading("ai-pref");
    try {
      await updateAiPreferences(token, { aiSuggestionsEnabled: enabled });
      setFlash({ type: "success", text: "AI preferences updated." });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to update AI preferences." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAiAccept(id: string) {
    if (!token) return;
    setActionLoading(`ai-accept-${id}`);
    try {
      await acceptAiServiceSuggestion(token, id);
      setFlash({ type: "success", text: "Suggestion accepted!" });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to accept suggestion." });
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAiReject(id: string) {
    if (!token) return;
    setActionLoading(`ai-reject-${id}`);
    try {
      await rejectAiServiceSuggestion(token, id);
      setFlash({ type: "success", text: "Suggestion dismissed." });
      await loadProfile();
    } catch (e) {
      setFlash({ type: "error", text: "Failed to dismiss suggestion." });
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-[#f0f6f0]">
        <Navbar />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#214c34] border-t-transparent" />
        </main>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="flex min-h-screen flex-col bg-[#f0f6f0]">
      <Navbar />
      <main className="flex-1 px-4 py-8 md:px-8 xl:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Manage</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-[#173726] md:text-5xl">Shop Profile</h1>
          </div>
          <Link href="/vendor/dashboard" className="text-sm font-semibold text-[#214c34] underline">
            Back to Dashboard
          </Link>
        </div>

        {flash && (
          <div className={`mb-6 rounded-3xl px-5 py-4 text-sm font-medium ${flash.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {flash.text}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
          <div className="space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#173726] mb-4">My Services</h2>
              <div className="space-y-4">
                {profile.services.length === 0 ? (
                  <p className="text-sm text-[#5b7262]">No services listed yet.</p>
                ) : (
                  profile.services.map(s => (
                    <div key={s.id} className="flex justify-between items-center bg-[#f6faf4] p-4 rounded-2xl border border-[#cfe0c6]">
                      <div>
                        <h3 className="font-semibold text-[#173726]">{s.name}</h3>
                        {s.shortDescription && <p className="text-sm text-[#5b7262] mt-1">{s.shortDescription}</p>}
                        <div className="text-xs text-[#58725f] mt-2 font-medium">
                          {s.deviceType} • {s.issueCategory} • {s.pricingType} • {formatMoney(s.basePrice)}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveService(s.id)}
                        disabled={actionLoading === `remove-service-${s.id}`}
                        className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddService} className="mt-6 border-t border-[#e2e8f0] pt-6 grid gap-4">
                <h3 className="font-bold text-[#173726]">Add a Service</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required type="text" placeholder="Service Name (e.g. Screen Replacement)" value={newServiceName} onChange={e => setNewServiceName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Device Type (e.g. Mobile Phone)" value={newServiceDeviceType} onChange={e => setNewServiceDeviceType(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Issue Category (e.g. Screen or display)" value={newServiceIssueCategory} onChange={e => setNewServiceIssueCategory(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="number" placeholder="Base Price (BDT)" value={newServiceBasePrice} onChange={e => setNewServiceBasePrice(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="number" placeholder="Min ETA (Days)" value={newServiceEstimatedDaysMin} onChange={e => setNewServiceEstimatedDaysMin(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="number" placeholder="Max ETA (Days)" value={newServiceEstimatedDaysMax} onChange={e => setNewServiceEstimatedDaysMax(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Short Description" value={newServiceDesc} onChange={e => setNewServiceDesc(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 sm:col-span-2" />
                </div>
                <button type="submit" disabled={!!actionLoading} className="w-fit rounded-full bg-[#173726] text-white px-6 py-2 font-semibold hover:bg-[#214c34]">Add Service</button>
              </form>
            </section>

            <section className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-[#173726] mb-4">My Spare Parts</h2>
              <div className="space-y-4">
                {profile.spareParts.length === 0 ? (
                  <p className="text-sm text-[#5b7262]">No spare parts listed yet.</p>
                ) : (
                  profile.spareParts.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-[#f6faf4] p-4 rounded-2xl border border-[#cfe0c6]">
                      <div>
                        <h3 className="font-semibold text-[#173726]">{p.name} {p.brand && `(${p.brand})`}</h3>
                        {p.description && <p className="text-sm text-[#5b7262] mt-1">{p.description}</p>}
                        <div className="text-xs text-[#58725f] mt-2 font-medium">
                          {p.deviceType} • {formatMoney(p.basePrice)} • {p.inStock ? "In Stock" : "Out of Stock"}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemovePart(p.id)}
                        disabled={actionLoading === `remove-part-${p.id}`}
                        className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleAddPart} className="mt-6 border-t border-[#e2e8f0] pt-6 grid gap-4">
                <h3 className="font-bold text-[#173726]">Add a Spare Part</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required type="text" placeholder="Part Name (e.g. iPhone X Battery)" value={newPartName} onChange={e => setNewPartName(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Device Type (e.g. Mobile Phone)" value={newPartDeviceType} onChange={e => setNewPartDeviceType(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Brand" value={newPartBrand} onChange={e => setNewPartBrand(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="number" placeholder="Price (BDT)" value={newPartPrice} onChange={e => setNewPartPrice(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2" />
                  <input type="text" placeholder="Short Description" value={newPartDesc} onChange={e => setNewPartDesc(e.target.value)} className="w-full rounded-xl border border-gray-200 px-4 py-2 sm:col-span-2" />
                </div>
                <button type="submit" disabled={!!actionLoading} className="w-fit rounded-full bg-[#173726] text-white px-6 py-2 font-semibold hover:bg-[#214c34]">Add Spare Part</button>
              </form>
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-gradient-to-b from-[#e8f3e5] to-[#f6faf4] rounded-3xl p-6 border border-[#cfe0c6]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-[#173726]">AI Assistant</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <div className="relative inline-block w-10 h-6">
                    <input type="checkbox" className="absolute opacity-0 w-0 h-0" checked={profile.shop.aiSuggestionsEnabled} onChange={e => handleAiPreference(e.target.checked)} disabled={actionLoading === "ai-pref"} />
                    <div className={`block overflow-hidden h-6 rounded-full transition-colors ${profile.shop.aiSuggestionsEnabled ? "bg-[#214c34]" : "bg-gray-300"}`}></div>
                    <div className={`absolute top-[2px] left-[2px] w-5 h-5 bg-white rounded-full transition-transform ${profile.shop.aiSuggestionsEnabled ? "translate-x-4" : ""}`}></div>
                  </div>
                </label>
              </div>
              <p className="text-sm text-[#355541] mb-6">Let AI suggest new services you could offer based on your specialties and inventory.</p>
              
              <button onClick={handleGenerateAi} disabled={!profile.shop.aiSuggestionsEnabled || actionLoading === "ai-generate"} className="w-full py-3 bg-[#214c34] text-white rounded-xl font-semibold disabled:opacity-50">
                {actionLoading === "ai-generate" ? "Thinking..." : "Get AI Suggestions"}
              </button>

              <div className="mt-6 space-y-4">
                {profile.aiSuggestions.map(sug => (
                  <div key={sug.id} className="bg-white p-4 rounded-2xl border border-[#cfe0c6] shadow-sm">
                    <h3 className="font-bold text-[#173726]">{sug.suggestedName}</h3>
                    <p className="text-xs text-[#5b7262] mt-1 mb-3">{sug.suggestedDesc}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleAiAccept(sug.id)} disabled={!!actionLoading} className="flex-1 py-1.5 bg-[#dff0dc] text-[#173726] rounded-lg text-sm font-semibold">Add Service</button>
                      <button onClick={() => handleAiReject(sug.id)} disabled={!!actionLoading} className="px-3 py-1.5 text-[#5b7262] hover:text-red-600 font-medium text-sm">Dismiss</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
