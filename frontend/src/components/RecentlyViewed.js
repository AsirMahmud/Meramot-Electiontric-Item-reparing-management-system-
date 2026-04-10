const items = ["MacBook Air M2 Battery", "iPhone 12 Screen", "iPhone 13 Screen"];

export default function RecentlyViewed() {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold mb-3">Recently Viewed Repairs</h2>
      <div className="flex flex-wrap gap-3">
        {items.map((x) => (
          <div
            key={x}
            className="px-4 py-2 bg-white rounded-lg shadow text-sm"
          >
            {x}
          </div>
        ))}
      </div>
    </section>
  );
}
