import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/attendee(.*)',
  '/api/observations(.*)',
  '/api/partner/(.*)',
  '/api/recommendations/(.*)',
  '/__clerk(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // Authentication and public routes are accessible
  if (isPublicRoute(req)) {
    return
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
}
