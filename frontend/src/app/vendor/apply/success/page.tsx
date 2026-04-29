import Link from "next/link";

export default async function VendorApplySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-[2rem] border border-white/60 bg-white/90 p-8 text-center shadow-2xl backdrop-blur">
        <h1 className="text-3xl font-bold text-accent-dark">
          Application submitted
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Your vendor account has been created successfully.
        </p>

       <p className="mt-2 text-sm text-muted-foreground">
        Your application is now pending admin review. You can use the normal login page later to
        check whether your application is pending, approved, or rejected.
        </p>

        {params.id ? (
          <p className="mt-4 rounded-xl bg-mint-50 px-4 py-3 text-xs text-slate-700">
            Application ID: <span className="font-semibold">{params.id}</span>
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="rounded-2xl bg-accent-dark px-5 py-3 text-sm font-semibold text-white"
          >
            Go to Login
          </Link>

          <Link
            href="/"
            className="rounded-2xl border border-border px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}