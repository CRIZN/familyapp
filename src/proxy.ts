import { type NextRequest, NextResponse } from "next/server";

import { getAuthCallbackForwardHref } from "@/features/auth/magic-link-params";

export function proxy(request: NextRequest) {
  const destination = getAuthCallbackForwardHref(request.url);

  if (destination) {
    return NextResponse.redirect(destination);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
