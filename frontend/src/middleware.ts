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

    // Check if accessing delivery-admin routes
    if (pathname.startsWith("/delivery-admin")) {
      // If no token, redirect to login
      if (!token) {
        return NextResponse.redirect(new URL("/delivery-admin/login", req.url));
      }

      // If token exists but user is not a delivery admin, redirect to home
      if (token.role !== "DELIVERY_ADMIN" && token.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Check if accessing vendor routes
    if (pathname.startsWith("/vendor")) {
      // If no token, redirect to login
      if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
      }

      // If token exists but user is not a vendor, redirect to home
      if (token.role !== "VENDOR") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    // Check if accessing delivery routes
    if (pathname.startsWith("/delivery")) {
      // If no token, redirect to delivery login
      if (!token) {
        return NextResponse.redirect(new URL("/delivery/login", req.url));
      }

      // If token exists but user is not a delivery partner, redirect to home
      if (token.role !== "DELIVERY") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/vendor/:path*",
    "/delivery/:path*",
    "/delivery-admin/:path*",
  ],
};
