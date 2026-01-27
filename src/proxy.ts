import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const currentUser = request.cookies.get("currentUser")?.value;

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/products") ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/account")
  ) {
    if (!currentUser) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  if ((pathname === "/auth" || pathname === "/register") && currentUser) {
    return NextResponse.redirect(new URL("/products", request.url));
  }

  return NextResponse.next();
}
