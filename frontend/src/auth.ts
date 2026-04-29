import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: credentials.identifier,
            password: credentials.password,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.user || !data?.token) {
          return null;
        }

        return {
        id: data.user.id,
        name: data.user.name || data.user.username || "User",
        email: data.user.email || null,
        username: data.user.username || null,
        phone: data.user.phone || null,
        role: data.user.role || null,
        accessToken: data.token,
      } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      if (account?.provider === "google" && token.email) {
        try {
          const res = await fetch(`${apiBase}/api/auth/google-exchange`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: token.email,
              name: token.name,
              image: token.picture,
            }),
          });

          const data = await res.json().catch(() => null);

          if (res.ok && data?.token && data?.user) {
            token.id = data.user.id;
            token.username = data.user.username ?? null;
            token.phone = data.user.phone ?? null;
            token.role = data.user.role ?? null;
            token.accessToken = data.token;
          }
        } catch (error) {
          console.error("google exchange error:", error);
        }
      }

      if (user) {
        token.id = (user as any).id;
        token.username = (user as any).username ?? null;
        token.phone = (user as any).phone ?? null;
        token.role = (user as any).role ?? token.role ?? null;
        token.accessToken = (user as any).accessToken ?? token.accessToken ?? null;
      }

      return token;
    },

   async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).username = token.username;
      (session.user as any).phone = token.phone;
      (session.user as any).role = token.role ?? null;
      (session.user as any).accessToken = token.accessToken ?? null;
    }
    return session;
  },
  },
};