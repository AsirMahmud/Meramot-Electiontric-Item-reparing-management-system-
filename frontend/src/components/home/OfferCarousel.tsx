import Link from "next/link";
import { offerCards } from "@/lib/mock-data";

export default function OfferCarousel() {
  return (
    <section className="grid grid-cols-2 gap-3 md:gap-4">
      {offerCards.map((offer) => (
        <article
          key={offer.title}
          className="flex flex-col rounded-[1.4rem] bg-[var(--mint-100)] p-4 shadow-sm md:min-h-[260px] md:justify-center md:rounded-[2rem] md:p-10 lg:min-h-[280px]"
        >
          <div className="flex flex-1 flex-col">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--foreground)] md:mb-2 md:text-sm md:tracking-[0.2em] lg:text-base">
            Offer available
          </p>

          <h2 className="text-lg font-bold leading-tight text-[var(--foreground)] md:text-3xl lg:text-4xl">
            {offer.title}
          </h2>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--muted-foreground)] md:mt-3 md:max-w-xl md:text-sm lg:text-base lg:leading-relaxed">
            {offer.subtitle}
          </p>

            <div className="mt-auto pt-4 md:pt-5 lg:pt-6">
              <Link
                href={offer.href}
                className="self-start inline-flex items-center justify-center rounded-full bg-[var(--accent-dark)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-foreground)] md:px-5 md:py-2 md:text-sm lg:px-6 lg:py-2.5 lg:text-base"
              >
                Explore
                <span className="hidden md:inline">&nbsp;shops</span>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
