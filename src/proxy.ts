import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  console.log(request);

  const currentUser = request.cookies.get("refresh-token")?.value;

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    if (currentUser) {
      return NextResponse.redirect(new URL("/homepage", request.url));
    }

    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (
    pathname.startsWith("/homepage") /* ||
    pathname.startsWith("/users") ||
    pathname.startsWith("/account") */
  ) {
    if (!currentUser) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
  }

  if ((pathname === "/auth" || pathname === "/register") && currentUser) {
    return NextResponse.redirect(new URL("/homepage", request.url));
  }

  return NextResponse.next();
}
