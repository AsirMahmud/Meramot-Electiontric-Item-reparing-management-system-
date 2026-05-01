import ShopsResultsClient from "../shops/shops-results-client";

export const metadata = {
  title: "Featured Repair Shops | Meramot",
  description: "Browse the top featured electronics and appliance repair shops in your area.",
};

export default function FeaturedShopsPage() {
  return <ShopsResultsClient forceFeatured={true} />;
}
