import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Comma-separated allowlist from the ALLOWED_EMAILS env var, e.g.
 *   ALLOWED_EMAILS=tutor@gmail.com,you@gmail.com
 * Only these Google accounts can sign in. Empty list = nobody (fail closed).
 */
const allowedEmails = (process.env.ALLOWED_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/signin',
    error: '/signin', // surface AccessDenied etc. on our own page
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      // Returning false here produces ?error=AccessDenied on /signin.
      return allowedEmails.includes(email);
    },
  },
};
