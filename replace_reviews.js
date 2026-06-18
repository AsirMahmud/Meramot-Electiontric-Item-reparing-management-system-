const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/shops/[slug]/page.tsx', 'utf8');

c = c.replace(/\r\n/g, '\n');

if (!c.includes('const [showAllReviews, setShowAllReviews] = useState(false);')) {
  c = c.replace(
    'const [pendingCartItem, setPendingCartItem] = useState<PendingCartItem | null>(null);',
    'const [pendingCartItem, setPendingCartItem] = useState<PendingCartItem | null>(null);\n  const [showAllReviews, setShowAllReviews] = useState(false);'
  );
}

// Ensure the tab reset resets showAllReviews too
c = c.replace(
  'onClick={() => setActiveTab("services")}',
  'onClick={() => { setActiveTab("services"); setShowAllReviews(false); }}'
);
c = c.replace(
  'onClick={() => setActiveTab("reviews")}',
  'onClick={() => { setActiveTab("reviews"); setShowAllReviews(false); }}'
);

const targetBlock = `<section className="space-y-6">
              <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)]">Customer reviews</h2>
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex shrink-0 flex-col items-center justify-center md:w-32">
                    <div className="text-5xl font-extrabold tracking-tighter text-[var(--foreground)]">
                      {ratingSummary.average.toFixed(1)}
                    </div>
                    <StarDisplay value={Math.round(ratingSummary.average)} />
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {shop?.reviewCount ?? 0} review{(shop?.reviewCount ?? 0) === 1 ? "" : "s"}
                    </p>
                  </div>

                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star, idx) => {
                      const count = ratingSummary.counts[4 - idx] || 0;
                      const total = reviews.length || 1;
                      const percentage = (count / total) * 100;

                      return (
                        <div key={star} className="flex items-center gap-3">
                          <span className="w-12 text-sm font-semibold text-[var(--muted-foreground)]">{star} stars</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                            <div
                              className="h-full bg-yellow-500"
                              style={{ width: \`\${percentage}%\` }}
                            />
                          </div>
                          <span className="w-6 text-right text-xs text-[var(--muted-foreground)]">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="xl:hidden">
                {WriteReviewForm}
              </div>

              <div className="space-y-4">
                {reviews.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                    No written reviews.
                  </p>
                )}

                {reviews.map((item) => {`;

const newBlock = `<section className="space-y-6">
              {showAllReviews ? (
                <div className="mb-6 flex items-center justify-between border-b border-[var(--border)] pb-4">
                  <button onClick={() => setShowAllReviews(false)} className="inline-flex items-center gap-2 text-sm font-bold text-[var(--accent-dark)] hover:opacity-80">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to shop profile
                  </button>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">All Reviews</h2>
                </div>
              ) : (
                <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
                  <h2 className="mb-4 text-3xl font-bold text-[var(--foreground)]">Customer reviews</h2>
                  <div className="flex flex-col gap-6 md:flex-row md:items-center">
                    <div className="flex shrink-0 flex-col items-center justify-center md:w-32">
                      <div className="text-5xl font-extrabold tracking-tighter text-[var(--foreground)]">
                        {ratingSummary.average.toFixed(1)}
                      </div>
                      <StarDisplay value={Math.round(ratingSummary.average)} />
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {shop?.reviewCount ?? 0} review{(shop?.reviewCount ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((star, idx) => {
                        const count = ratingSummary.counts[4 - idx] || 0;
                        const total = reviews.length || 1;
                        const percentage = (count / total) * 100;

                        return (
                          <div key={star} className="flex items-center gap-3">
                            <span className="w-12 text-sm font-semibold text-[var(--muted-foreground)]">{star} stars</span>
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border)]">
                              <div
                                className="h-full bg-yellow-500"
                                style={{ width: \`\${percentage}%\` }}
                              />
                            </div>
                            <span className="w-6 text-right text-xs text-[var(--muted-foreground)]">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {reviews.length === 0 && !showAllReviews && (
                  <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-8 text-center text-sm text-[var(--muted-foreground)]">
                    No written reviews.
                  </p>
                )}

                {(showAllReviews ? reviews : reviews.slice(0, 3)).map((item) => {`;

// We also need to add the "See all reviews" button and the WriteReviewForm to the bottom.
const regexBottom = /<\/article>\s*\);\s*}\)}\s*<\/div>\s*<\/section>/;
const replacementBottom = `</article>
                  );
                })}

                {!showAllReviews && reviews.length > 3 && (
                  <button
                    onClick={() => setShowAllReviews(true)}
                    className="mt-2 w-full rounded-[1.5rem] border-2 border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm font-bold text-[var(--foreground)] transition hover:bg-[var(--mint-50)]"
                  >
                    See all {reviews.length} written reviews
                  </button>
                )}
              </div>

              {!showAllReviews && (
                <div className="xl:hidden pt-2">
                  {WriteReviewForm}
                </div>
              )}
            </section>`;

if (c.indexOf(targetBlock) !== -1 && regexBottom.test(c)) {
  c = c.replace(targetBlock, newBlock);
  c = c.replace(regexBottom, replacementBottom);
  fs.writeFileSync('frontend/src/app/shops/[slug]/page.tsx', c);
  console.log("Replaced successfully!");
} else {
  console.log("Target block or bottom regex not found!");
  if (c.indexOf(targetBlock) === -1) console.log("Missing targetBlock");
  if (!regexBottom.test(c)) console.log("Missing regexBottom");
}
