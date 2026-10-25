import { withAuth } from 'next-auth/middleware';
import type { NextRequest, NextFetchEvent } from 'next/server';

// next-auth's withAuth returns a request handler. Next.js 16 renamed the
// middleware convention to `proxy` and requires a real exported function, so we
// wrap withAuth in an explicit proxy function.
const authProxy = withAuth({
  pages: { signIn: '/signin' }, // redirect unauthenticated visitors here
});

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  // The default `authorized` check allows the request only when a token exists.
  return (authProxy as unknown as (r: NextRequest, e: NextFetchEvent) => unknown)(req, ev);
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
