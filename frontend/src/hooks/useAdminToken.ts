"use client";

import { useSession } from "next-auth/react";

/**
 * Extracts the admin access token from the NextAuth session.
 *
 * Replaces the copy-pasted pattern:
 * ```
 * const { data: session } = useSession();
 * const token = (session?.user as any)?.accessToken;
 * ```
 */
export function useAdminToken(): string | undefined {
  const { data: session } = useSession();
  return (session?.user as any)?.accessToken as string | undefined;
}
