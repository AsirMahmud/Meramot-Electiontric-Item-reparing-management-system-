type Shop = {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    address: string;
    ratingAvg: number;
    reviewCount: number;
    priceLevel: number;
    hasVoucher: boolean;
    freeDelivery: boolean;
    hasDeals: boolean;
  };
  
  export default function ShopCard({ shop }: { shop: Shop }) {
    return (
      <div className="rounded-2xl border border-[#d9e5d5] bg-white p-4 shadow-sm hover:shadow-md transition">
  
        <div className="flex items-start justify-between gap-4">
  
          <div>
            <h3 className="text-lg font-bold text-[#163625]">
              {shop.name}
            </h3>
  
            <p className="mt-1 text-sm text-[#4c6354]">
              {shop.description || shop.address}
            </p>
  
            <p className="mt-2 text-sm text-[#2c4637]">
              ⭐ {shop.ratingAvg.toFixed(1)} ({shop.reviewCount} reviews)
            </p>
          </div>
  
          <div className="rounded-full bg-[#e8f1e4] px-3 py-1 text-sm font-semibold text-[#234733]">
            {"$".repeat(shop.priceLevel)}
          </div>
        </div>
  
        <div className="mt-3 flex flex-wrap gap-2">
          {shop.hasVoucher && (
            <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">
              Voucher
            </span>
          )}
  
          {shop.freeDelivery && (
            <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">
              Free delivery
            </span>
          )}
  
          {shop.hasDeals && (
            <span className="rounded-full bg-[#dff3d7] px-3 py-1 text-xs text-[#215235]">
              Deal
            </span>
          )}
        </div>
      </div>
    );
  }