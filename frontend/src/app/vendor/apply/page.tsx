import VendorApplyForm from "@/components/vendor/VendorApplyForm";

export default function VendorApplyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <VendorApplyForm />
      </div>
    </main>
  );
}