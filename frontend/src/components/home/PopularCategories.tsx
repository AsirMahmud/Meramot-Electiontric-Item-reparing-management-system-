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

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
        {popularCategories.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md min-h-[120px] md:min-h-0 md:flex-row md:justify-start md:gap-4 md:rounded-[1.75rem] md:p-4 md:text-left"
          >
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--mint-200)] text-2xl shadow-inner md:h-16 md:w-16 md:rounded-2xl md:text-3xl">
              {item.sprite}
            </div>
            <div>
              <h3 className="text-xs font-bold leading-tight text-[var(--foreground)] md:text-lg md:font-semibold">
                {item.label}
              </h3>
              <p className="mt-1 line-clamp-2 text-[10px] leading-[1.3] text-[var(--muted-foreground)] md:mt-1 md:text-sm md:leading-tight">
                {item.trend}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}