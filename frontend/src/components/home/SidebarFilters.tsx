const sortFilters = ["Top rated", "On the rise", "Nearest to me", "Lower price"];
const offerFilters = ["Vouchers", "Free delivery", "Deals"];

function FilterGroup({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-accent-dark">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <label key={item} className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
            <input type="checkbox" className="h-4 w-4 rounded border-border accent-[var(--mint-500)]" />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SidebarFilters() {
  return (
    <aside className="space-y-4 lg:sticky lg:top-28">
      <FilterGroup title="Sort shops" items={sortFilters} />
      <FilterGroup title="Offers & savings" items={offerFilters} />
    </aside>
  );
}
