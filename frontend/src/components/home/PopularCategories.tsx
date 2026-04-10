import { popularCategories } from "@/lib/mock-data";

export default function PopularCategories() {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-mint-700">Popular parts category</p>
        <h2 className="text-2xl font-bold text-accent-dark md:text-3xl">What devices need repair the most right now</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {popularCategories.map((item) => (
          <article key={item.label} className="flex items-center gap-4 rounded-[1.75rem] border border-border bg-card p-4 shadow-sm">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-mint-200 text-3xl shadow-inner">
              {item.sprite}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-accent-dark">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.trend}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
