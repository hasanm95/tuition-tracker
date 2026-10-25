import { withAuth } from 'next-auth/middleware';
import type { NextRequest, NextFetchEvent } from 'next/server';

// next-auth's withAuth returns a middleware function. Next.js 16 requires this
// file to export a real function (a bare `export { default } from ...` re-export
// is no longer accepted), so we wrap it in an explicit function.
const authMiddleware = withAuth({
  pages: { signIn: '/signin' }, // redirect unauthenticated visitors here
});

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  // The default `authorized` check allows the request only when a token exists.
  return (authMiddleware as unknown as (r: NextRequest, e: NextFetchEvent) => unknown)(req, ev);
}

/**
 * Protect every route except:
 *  - NextAuth's own endpoints (/api/auth/*)
 *  - the sign-in page (/signin)
 *  - Next.js internals and PWA/static assets
 */
export const config = {
  matcher: [
    '/((?!api/auth|signin|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon-192.png|icon-512.png).*)',
  ],
};
