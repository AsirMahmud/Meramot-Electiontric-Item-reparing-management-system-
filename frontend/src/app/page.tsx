import { getShops } from "@/lib/api";
import FeaturedShops from "@/components/FeaturedShops";

export default async function Home() {
  const shops = await getShops();
  return (
    <div className="p-6">
      <FeaturedShops shops={shops} />
    </div>
  );
}
