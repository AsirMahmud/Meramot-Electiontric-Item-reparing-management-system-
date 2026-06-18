import { Suspense } from "react";
import DeliveryLoginForm from "@/components/delivery/DeliveryLoginForm";

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#163625] border-t-transparent" />
    </div>
  );
}

export default function DeliveryLoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <DeliveryLoginForm />
    </Suspense>
  );
}
