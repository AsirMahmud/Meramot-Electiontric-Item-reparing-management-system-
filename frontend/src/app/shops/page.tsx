import { Suspense } from "react";
import ShopsResultsClient from "@/components/shops/shops-results-client";

export default function ShopsPage() {
  return (
    <Suspense fallback={null}>
      <ShopsResultsClient />
    </Suspense>
  );
}
