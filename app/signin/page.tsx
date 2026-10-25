'use client';

import { Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInInner() {
  const params = useSearchParams();
  const error = params.get('error');

  return (
    <div className="card center" style={{ marginTop: '22vh' }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'var(--brand)',
          margin: '0 auto 14px',
        }}
      />
      <h1 style={{ margin: 0, fontSize: 22 }}>Fee Tracker</h1>
      <p className="muted" style={{ marginTop: 6 }}>Sign in to continue</p>

      {error && (
        <div className="error" style={{ textAlign: 'left', marginTop: 16 }}>
          Sign-in failed. Please try again.
        </div>
      )}

      <button
        className="btn"
        style={{ marginTop: 18 }}
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        Continue with Google
      </button>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="card center" style={{ marginTop: '22vh' }}>Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}
