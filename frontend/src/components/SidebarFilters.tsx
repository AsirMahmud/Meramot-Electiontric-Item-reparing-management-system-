export default function SidebarFilters() {
  return (
    <div className="w-48 space-y-6 bg-white rounded-lg p-4 shadow-md">
      <div>
        <h3 className="font-semibold mb-2">Filters</h3>
        {["Top Rated", "Relevance", "Distance", "Price"].map((f) => (
          <label key={f} className="flex items-center gap-2 text-sm">
            <input type="checkbox" /> {f}
          </label>
        ))}
      </div>

      <div>
        <h3 className="font-semibold mb-2">Offers & Promotions</h3>
        {["Vouchers", "Free Delivery", "Deals"].map((f) => (
          <label key={f} className="flex items-center gap-2 text-sm">
            <input type="checkbox" /> {f}
          </label>
        ))}
      </div>
    </div>
  );
}
