import { offerCards } from "@/lib/mock-data";

export default function OfferCarousel() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {offerCards.map((offer) => (
        <article
          key={offer.title}
          className="rounded-[2rem] bg-gradient-to-r from-mint-300 via-mint-200 to-mint-100 p-6 shadow-sm"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-accent-dark">Offer available</p>
          <h2 className="text-2xl font-bold text-accent-dark md:text-3xl">{offer.title}</h2>
          <p className="mt-2 max-w-xl text-sm text-accent-dark/80">{offer.subtitle}</p>
          <button className="mt-4 rounded-full bg-accent-dark px-4 py-2 text-sm font-semibold text-white">
            Explore shops
          </button>
        </article>
      ))}
    </section>
  );
}
