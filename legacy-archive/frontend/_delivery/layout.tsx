import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { DeliveryAuthGate, DeliveryAuthProvider } from "@/lib/delivery-auth-context";
import { DeliveryLayoutChrome } from "@/components/delivery/DeliveryLayoutChrome";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Delivery Partner Portal",
  description: "Partner pickups and returns",
};

export default function DeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${inter.variable}`}>
      <DeliveryAuthProvider>
        <DeliveryAuthGate>
          <DeliveryLayoutChrome>{children}</DeliveryLayoutChrome>
        </DeliveryAuthGate>
      </DeliveryAuthProvider>
    </div>
  );
}
