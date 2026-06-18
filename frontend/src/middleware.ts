import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";

// Protect admin routes - only admins can access
export const middleware = withAuth(
  function middleware(req: NextRequest & { nextauth: any }) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Check if accessing admin routes
    if (pathname.startsWith("/admin")) {
      // If no token, redirect to login
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      // If token exists but user is not an admin, redirect to home
      if (token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Check if accessing vendor routes
    if (pathname.startsWith("/vendor")) {
      // Allow public access to vendor application and success pages
      if (pathname.startsWith("/vendor/apply")) {
        return NextResponse.next();
      }

      // If no token, redirect to login
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      // If token exists but user is not a vendor, redirect to home
      if (token.role !== "VENDOR") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow public access to vendor application pages
        if (req.nextUrl.pathname.startsWith("/vendor/apply")) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
  ],
};
