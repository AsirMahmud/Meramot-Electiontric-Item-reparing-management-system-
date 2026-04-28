import { Suspense } from "react";
import ShopsResultsClient from "./shops-results-client";

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#E4FCD5] p-8">Loading shops...</div>}>
      <ShopsResultsClient />
    </Suspense>
  );
}
