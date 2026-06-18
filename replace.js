const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/shops/[slug]/page.tsx', 'utf8');

const replacement = `<div className="grid gap-4 sm:grid-cols-2 lg:block lg:space-y-4">
                {serviceItems.map((item) => (
                  <article
                    key={item.name}
                    className="group flex flex-col justify-between rounded-xl md:rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:-translate-y-0.5 hover:shadow-md lg:flex-row lg:items-start lg:justify-between lg:hover:shadow-sm lg:hover:-translate-y-0 lg:p-5"
                  >
                    <div className="lg:flex lg:flex-1 lg:items-start lg:justify-between lg:gap-4">
                      <div className="lg:min-w-0">
                        <h3 className="font-bold text-[var(--foreground)] lg:text-xl lg:font-semibold">{item.name}</h3>
                        <p className="mt-1 text-xs md:text-sm text-[var(--muted-foreground)] lg:mt-2 lg:leading-6">
                          {item.summary}
                        </p>
                        {/* Price on mobile: */}
                        <p className="mt-3 text-lg md:text-xl font-extrabold text-[var(--accent-dark)] lg:hidden">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </p>
                      </div>
                      
                      {/* Price on desktop: */}
                      <div className="hidden lg:block lg:shrink-0 lg:text-right">
                        <div className="text-lg font-bold text-[var(--foreground)]">
                          ৳{item.estimate.toLocaleString("en-BD")}
                        </div>
                        <div className="text-xs text-[var(--muted-foreground)]">starting estimate</div>
                      </div>
                    </div>
                    
                    <div className="lg:flex lg:items-center lg:gap-3 lg:pl-6 lg:mt-0 lg:self-center">
                      <button
                        type="button"
                        onClick={() => handleAddService(item)}
                        className="mt-4 w-full rounded-full bg-[var(--mint-100)] px-4 py-2 text-sm font-bold text-[var(--accent-dark)] transition hover:bg-[var(--accent-dark)] hover:text-white lg:mt-0 lg:h-11 lg:w-auto lg:inline-flex lg:items-center lg:px-6"
                      >
                        Add to cart
                      </button>
                    </div>
                  </article>
                ))}
              </div>`;

const regex = /<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">[\s\S]*?<\/button>\s*<\/div>\s*\)\)}\s*<\/div>/;

if (regex.test(c)) {
  c = c.replace(regex, replacement);
  fs.writeFileSync('frontend/src/app/shops/[slug]/page.tsx', c);
  console.log("Replaced successfully!");
} else {
  console.log("Regex did not match!");
}
