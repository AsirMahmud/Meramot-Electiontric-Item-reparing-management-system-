import Link from "next/link";
import { getShopBySlug } from "@/lib/api";
import { fallbackShopDetails } from "@/lib/mock-data";

function formatPrice(basePrice?: number | null, priceMax?: number | null, pricingType?: string | null) {
  if (pricingType === "INSPECTION_REQUIRED") return "Inspection required";
  if (basePrice == null) return "Contact shop";
  if (priceMax != null && priceMax > basePrice) return `৳${basePrice.toLocaleString()} - ৳${priceMax.toLocaleString()}`;
  if (pricingType === "STARTING_FROM") return `From ৳${basePrice.toLocaleString()}`;
  return `৳${basePrice.toLocaleString()}`;
}

function formatDays(min?: number | null, max?: number | null) {
  if (!min && !max) return "Time varies";
  if (min && max && min !== max) return `${min}-${max} days`;
  return `${min ?? max} day${(min ?? max) === 1 ? "" : "s"}`;
}

export default async function ShopDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let shop = fallbackShopDetails[slug];
  try {
    shop = await getShopBySlug(slug);
  } catch (error) {
    console.error("Failed to load shop detail:", error);
  }

  if (!shop) {
    return (
      <main className="min-h-screen bg-[#f7f8f3] px-4 py-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-[#163625]">Shop not found</h1>
          <p className="mt-3 text-[#4c6354]">This shop does not exist in the current dataset.</p>
          <Link href="/shops" className="mt-6 inline-flex rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white">
            Back to shops
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8f3] px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <Link href="/shops" className="inline-flex rounded-full border border-[#214c34] bg-white px-4 py-2 text-sm font-semibold text-[#214c34]">
          Back to shops
        </Link>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#163625]">{shop.name}</h1>
              <p className="mt-2 text-[#4c6354]">{shop.description || shop.address}</p>
              <p className="mt-2 text-sm text-[#2c4637]">⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)</p>
              <p className="mt-1 text-sm text-[#2c4637]">{shop.address}</p>
              {shop.openingHoursText && <p className="mt-1 text-sm text-[#2c4637]">Hours: {shop.openingHoursText}</p>}
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {shop.hasVoucher && <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">Voucher</span>}
              {shop.freeDelivery && <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">Free delivery</span>}
              {shop.hasDeals && <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">Deals</span>}
              {shop.supportsPickup && <span className="rounded-full bg-[#eef5ea] px-3 py-1 text-xs text-[#215235]">Pickup supported</span>}
              {shop.acceptsDirectOrders && <span className="rounded-full bg-[#eef5ea] px-3 py-1 text-xs text-[#215235]">Direct orders</span>}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Service menu</p>
            <h2 className="text-2xl font-bold text-[#163625]">Choose a specific service</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {shop.services.map((service) => (
              <article key={service.id} className="rounded-3xl border border-[#d9e5d5] bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#163625]">{service.name}</h3>
                    <p className="mt-2 text-sm text-[#4c6354]">{service.shortDescription || service.description || "Service details will be confirmed by the shop."}</p>
                  </div>
                  {service.isFeatured && (
                    <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs font-medium text-[#215235]">Popular</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#215235]">
                  {service.deviceType && <span className="rounded-full bg-[#eef5ea] px-3 py-1">{service.deviceType}</span>}
                  {service.issueCategory && <span className="rounded-full bg-[#eef5ea] px-3 py-1">{service.issueCategory}</span>}
                  {service.includesPickup && <span className="rounded-full bg-[#eef5ea] px-3 py-1">Pickup included</span>}
                  {service.includesDelivery && <span className="rounded-full bg-[#eef5ea] px-3 py-1">Return delivery</span>}
                </div>

                <div className="mt-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-[#163625]">
                      {formatPrice(service.basePrice, service.priceMax, service.pricingType)}
                    </p>
                    <p className="text-sm text-[#4c6354]">Estimated time: {formatDays(service.estimatedDaysMin, service.estimatedDaysMax)}</p>
                  </div>

                  <button className="rounded-full bg-[#214c34] px-4 py-2 text-sm font-semibold text-white">
                    Order this service
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
