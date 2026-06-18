import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/auth";
import AdminMobileShell from "@/components/admin/AdminMobileShell";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  if (!session?.user) {
    redirect("/login");
  }

  if (role !== "ADMIN") {
    redirect("/");
  }

  return <AdminMobileShell>{children}</AdminMobileShell>;
}