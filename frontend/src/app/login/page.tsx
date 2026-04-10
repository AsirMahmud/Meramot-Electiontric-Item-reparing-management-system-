import AuthCard from "@/components/auth/AuthCard";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-mint-300 via-mint-200 to-mint-50 px-4 py-10">
      <AuthCard mode="login" />
    </main>
  );
}
