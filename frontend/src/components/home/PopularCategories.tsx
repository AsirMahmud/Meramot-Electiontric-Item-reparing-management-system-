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

      <div className="grid grid-cols-3 gap-2 md:gap-4 lg:grid-cols-3">
        {popularCategories.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md md:aspect-auto md:flex-row md:justify-start md:gap-4 md:rounded-[1.75rem] md:p-4 md:text-left"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--mint-200)] text-xl shadow-inner md:h-16 md:w-16 md:rounded-2xl md:text-3xl">
              {item.sprite}
            </div>
            <div>
              <h3 className="text-[11px] font-bold leading-tight text-[var(--foreground)] md:text-lg md:font-semibold">
                {item.label}
              </h3>
              <p className="mt-0.5 line-clamp-2 text-[8px] leading-[1.2] text-[var(--muted-foreground)] md:mt-1 md:text-sm md:leading-tight">
                {item.trend}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}