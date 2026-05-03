import type { Metadata } from "next";
import { DeliveryAdminAuthGate, DeliveryAdminAuthProvider } from "@/lib/delivery-admin-auth-context";

export const metadata: Metadata = {
  title: "Delivery Operations",
  description: "Approve delivery partners and monitor fleet activity",
};

export default function DeliveryAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DeliveryAdminAuthProvider>
      <DeliveryAdminAuthGate>{children}</DeliveryAdminAuthGate>
    </DeliveryAdminAuthProvider>
  );
}
