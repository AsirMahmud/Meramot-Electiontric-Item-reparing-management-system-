import VendorApplyForm from "@/components/vendor/VendorApplyForm";

export default function VendorApplyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 dark:from-[#0D1A12] dark:via-[#121F17] dark:to-[#0F1D14] px-3 py-6 md:px-4 md:py-10">
      <div className="mx-auto flex max-w-5xl items-center justify-center">
        <VendorApplyForm />
      </div>
    </main>
  );
}