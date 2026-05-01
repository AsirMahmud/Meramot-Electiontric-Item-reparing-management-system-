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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-3">
        {popularCategories.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-[1.25rem] border border-[var(--border)] bg-[var(--card)] p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:gap-3 md:rounded-[1.75rem] md:p-4"
          >
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[1rem] bg-[var(--mint-200)] text-3xl shadow-inner md:h-20 md:w-20 md:rounded-[1.25rem] md:text-4xl lg:h-24 lg:w-24 lg:text-5xl">
              {item.sprite}
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight text-[var(--foreground)] md:text-base">
                {item.label}
              </h3>
              <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-[var(--muted-foreground)] md:text-xs">
                {item.trend}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}