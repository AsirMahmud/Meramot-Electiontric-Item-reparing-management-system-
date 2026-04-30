import Link from "next/link";
import { popularCategories } from "@/lib/mock-data";

export default function PopularCategories() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          Popular parts category
        </p>
        <h2 className="text-lg font-bold text-[var(--foreground)] md:text-2xl lg:text-3xl">
          What devices need repair the most right now
        </h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {popularCategories.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:gap-4 md:rounded-[1.75rem] md:p-4"
          >
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--mint-200)] text-2xl shadow-inner md:h-16 md:w-16 md:rounded-2xl md:text-3xl">
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