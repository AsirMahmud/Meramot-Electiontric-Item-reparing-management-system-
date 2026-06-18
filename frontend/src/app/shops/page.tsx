import { Suspense } from "react";
import ShopsResultsClient from "./shops-results-client";

export default function ShopsPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full animate-pulse bg-[var(--background)]" />}>
      <ShopsResultsClient />
    </Suspense>
  );
}
