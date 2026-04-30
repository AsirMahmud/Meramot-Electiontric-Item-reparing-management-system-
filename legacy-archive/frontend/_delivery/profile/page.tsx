"use client";

import { Settings, Shield, Bell, HelpCircle, LogOut, ChevronRight, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeliveryAuth } from "@/lib/delivery-auth-context";

export default function ProfilePage() {
  const router = useRouter();
  const { me, logout } = useDeliveryAuth();
  const menuItems = [
    { icon: UserIcon, text: "Personal Details", isAlert: false },
    { icon: Shield, text: "Verification Status", isAlert: true },
    { icon: Bell, text: "Notification Settings", isAlert: false },
    { icon: Settings, text: "App Preferences", isAlert: false },
    { icon: HelpCircle, text: "Partner Support 24/7", isAlert: false },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-neutral-50 px-5 pt-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-extrabold text-neutral-900 mb-6">Profile Settings</h1>

      <div className="bg-white rounded-3xl p-6 border border-neutral-100 shadow-sm flex flex-col items-center mb-6">
        <div className="w-24 h-24 rounded-full border-[3px] border-orange-500 p-1 mb-4">
          <div className="w-full h-full rounded-full bg-[#163625] text-[#E4FCD5] overflow-hidden flex items-center justify-center text-2xl font-bold">
            {(me?.user?.name ?? me?.user?.username ?? "P").slice(0, 1).toUpperCase()}
          </div>
        </div>
        <h2 className="text-xl font-bold text-neutral-900 leading-tight">
          {me?.user?.name ?? me?.user?.username ?? "Delivery Partner"}
        </h2>
        <p className="text-xs text-neutral-500 mb-2">Partner ID: {me?.id ?? "-"}</p>
        <p className="text-xs text-neutral-500 mb-3">{me?.user?.email ?? ""}</p>
        <span className="bg-orange-100 text-orange-700 font-bold text-[10px] uppercase tracking-wider px-2 py-1 rounded">
          {me?.status ?? "UNKNOWN"}
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden mb-6">
        {menuItems.map((item, idx) => (
          <div key={idx} className={`flex items-center justify-between p-4 px-5 hover:bg-neutral-50 cursor-pointer active:bg-neutral-100 transition-colors ${idx !== menuItems.length - 1 ? 'border-b border-neutral-100' : ''}`}>
            <div className="flex items-center gap-4 text-neutral-700">
               <item.icon size={20} className="text-neutral-400" />
               <span className="text-sm font-semibold">{item.text}</span>
            </div>
            <div className="flex items-center gap-2">
               {item.isAlert && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
               <ChevronRight size={18} className="text-neutral-300" />
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          router.push("/delivery/login");
        }}
        className="w-full bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl transition-colors text-sm shadow-sm flex justify-center items-center gap-2 active:scale-95 mb-8"
      >
        <LogOut size={18} /> Sign Out
      </button>

    </div>
  );
}
