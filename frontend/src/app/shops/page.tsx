import { Suspense } from "react";
import ShopsResultsClient from "@/components/shops/shops-results-client";

export default function ShopsPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f7f8f3]" />}>
      <ShopsResultsClient />
    </Suspense>
  );
}
