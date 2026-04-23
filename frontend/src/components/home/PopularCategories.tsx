import Link from "next/link";
import { popularCategories } from "@/lib/mock-data";

export default function PopularCategories() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Popular parts category
        </p>
        <h2 className="text-2xl font-bold text-[var(--foreground)] md:text-3xl">
          What devices need repair the most right now
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {popularCategories.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-4 rounded-[1.75rem] border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--mint-200)] text-3xl shadow-inner">
              {item.sprite}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                {item.label}
              </h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {item.trend}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}