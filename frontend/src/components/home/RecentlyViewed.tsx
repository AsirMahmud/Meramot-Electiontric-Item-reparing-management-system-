import Link from "next/link";
import { recentlyViewed } from "@/lib/mock-data";

export default function RecentlyViewed() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint-700">Recently viewed</p>
        <h2 className="text-2xl font-bold text-accent-dark md:text-3xl">Jump back into previous repair searches</h2>
      </div>
      <div className="flex flex-wrap gap-3">
        {recentlyViewed.map((item) => (
          <Link key={item.label} href={item.href} className="rounded-full border border-border bg-card px-4 py-2 text-sm text-foreground shadow-sm transition hover:bg-[#eef5ea]">
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
