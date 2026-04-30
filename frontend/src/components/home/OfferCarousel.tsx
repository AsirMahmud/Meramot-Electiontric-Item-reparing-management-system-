import Link from "next/link";
import { offerCards } from "@/lib/mock-data";

export default function OfferCarousel() {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {offerCards.map((offer) => (
        <article
          key={offer.title}
          className="rounded-[1.25rem] bg-[var(--mint-100)] p-4 shadow-sm md:rounded-[2rem] md:p-6"
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[var(--foreground)]">
            Offer available
          </p>
          <h2 className="text-lg font-bold text-[var(--foreground)] md:text-2xl lg:text-3xl">
            {offer.title}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--muted-foreground)]">
            {offer.subtitle}
          </p>
          <Link
            href={offer.href}
            className="mt-4 inline-flex rounded-full bg-[var(--accent-dark)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)]"
          >
            Explore shops
          </Link>
        </article>
      ))}
    </section>
  );
}