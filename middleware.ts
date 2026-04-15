import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/doctor-dashboard(.*)',
  '/admin(.*)',
  '/onboarding(.*)',
])

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isDoctorRoute = createRouteMatcher(['/doctor-dashboard(.*)'])

export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isProtectedRoute(req)) {
    await auth.protect()

    const session = await auth()
    const role = (session.sessionClaims?.publicMetadata as Record<string, unknown>)?.role as string || 'patient'

    // Admin route protection
    if (isAdminRoute(req) && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Doctor route protection
    if (isDoctorRoute(req) && role !== 'doctor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Auto-redirect doctors to their dashboard
    if (req.nextUrl.pathname === '/dashboard' && role === 'doctor') {
      return NextResponse.redirect(new URL('/doctor-dashboard', req.url))
    }
  }

  // HIPAA-style security headers on all API responses
  const response = NextResponse.next()
  if (req.nextUrl.pathname.startsWith('/api')) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  return response
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
