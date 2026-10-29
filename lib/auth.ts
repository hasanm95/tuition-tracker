import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

/**
 * Comma-separated allow-list of Google emails permitted to sign in.
 * Configured via the ALLOWED_EMAILS env var. If it's empty, every Google
 * account is allowed (open mode) — set it to lock the app to your account(s).
 */
function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

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
    error: '/signin',
  },
  callbacks: {
    // Gate who may sign in. This is the actual access guard — the whole app
    // shares one Google Sheet, so only listed accounts should get in.
    async signIn({ user }) {
      const allowed = allowedEmails();
      if (allowed.length === 0) return true; // no list set => open mode
      const email = user.email?.toLowerCase();
      return !!email && allowed.includes(email);
    },
  },
};
