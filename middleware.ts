import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { hasValidJwtExpiry } from "@/lib/jwt"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only protect dashboard routes
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next()
  }

  // Get access token from cookies
  const accessToken =
    req.cookies.get('sb-access-token')?.value ||
    req.cookies.get('accessToken')?.value

  // Validate token
  if (!hasValidJwtExpiry(accessToken)) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", pathname)

    // Clear invalid cookies
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.delete('sb-access-token')
    response.cookies.delete('sb-refresh-token')
    response.cookies.delete('accessToken')

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|login|register).*)",
  ],
}

