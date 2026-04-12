import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      phone?: string | null;
      role?: string | null;
    };
  }

  interface User {
    username?: string | null;
    phone?: string | null;
    role?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    username?: string | null;
    phone?: string | null;
    role?: string | null;
  }
}
