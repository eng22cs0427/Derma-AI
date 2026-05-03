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

    // We now rely exclusively on the Server Component Layouts 
    // (app/admin/layout.tsx and app/doctor-dashboard/layout.tsx)
    // for secure, database-driven role verification. This prevents
    // JWT caching issues when an admin upgrades a user's role.

    // Auto-redirect logic has also been moved to app/dashboard/layout.tsx
    // to ensure it uses the fresh database role.
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
