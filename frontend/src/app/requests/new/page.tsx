import Link from "next/link";

export default function NewRequestPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f3] px-4 py-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#58725f]">Request builder</p>
        <h1 className="mt-2 text-3xl font-bold text-[#163625]">New repair request</h1>
        <p className="mt-3 text-[#4c6354]">
          This placeholder route is ready for the next step: turning a selected shop service into a direct request form.
        </p>
        <Link href="/shops" className="mt-6 inline-flex rounded-full bg-[#214c34] px-5 py-3 text-sm font-semibold text-white">
          Browse shops first
        </Link>
      </div>
    </main>
  );
}
