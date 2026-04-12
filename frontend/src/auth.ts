import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const providers = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      identifier: { label: "Username or email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.identifier || !credentials?.password) {
        return null;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const res = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.user) {
        return null;
      }

      return {
        id: data.user.id,
        name: data.user.name || data.user.username || "User",
        email: data.user.email || null,
        username: data.user.username || null,
        phone: data.user.phone || null,
        role: data.user.role || null,
      } as never;
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.username = (user as { username?: string | null }).username ?? null;
        token.phone = (user as { phone?: string | null }).phone ?? null;
        token.role = (user as { role?: string | null }).role ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string | undefined;
        (session.user as { username?: string | null }).username = token.username as string | null | undefined;
        (session.user as { phone?: string | null }).phone = token.phone as string | null | undefined;
        (session.user as { role?: string | null }).role = token.role as string | null | undefined;
      }
      return session;
    },
  },
};
