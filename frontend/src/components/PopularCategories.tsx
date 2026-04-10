type Shop = {
  id: number;
  name: string;
  rating: number;
  reviews: number;
  distance: string;
};

export default function FeaturedShops({ shops }: { shops: Shop[] }) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-3">Featured Repair Shops</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shops.map((shop) => (
          <div key={shop.id} className="bg-white rounded-lg shadow-md p-3">
            <div className="w-full h-28 bg-grey/20 rounded mb-2"></div>
            <p className="font-semibold">{shop.name}</p>
            <p className="text-sm text-grey">
              ⭐ {shop.rating} ({shop.reviews}) • {shop.distance} km
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
