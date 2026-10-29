'use client';

import { Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function SignInInner() {
  const params = useSearchParams();
  // Read the error only after mount so the server-rendered HTML (which has no
  // query string during static prerender) matches the first client render.
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setError(params.get('error'));
  }, [params]);

  return (
    <div className="card center" style={{ marginTop: '22vh' }}>
      <div style={{ fontSize: 46, lineHeight: 1, marginBottom: 8 }}>🎓</div>
      <h1 style={{ margin: 0, fontSize: 22, fontFamily: 'var(--font-display)' }}>টিউশন ট্র্যাকার</h1>
      <p className="muted" style={{ marginTop: 6 }}>চালিয়ে যেতে সাইন ইন করুন</p>

      {error && (
        <div className="error" style={{ textAlign: 'left', marginTop: 16 }}>
          {error === 'AccessDenied'
            ? 'এই Google অ্যাকাউন্টটির অ্যাক্সেস নেই। অনুমোদিত অ্যাকাউন্ট দিয়ে সাইন ইন করুন।'
            : 'সাইন ইন ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'}
        </div>
      )}

      <button
        className="btn"
        style={{ marginTop: 18 }}
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        Google দিয়ে সাইন ইন করুন
      </button>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="card center" style={{ marginTop: '22vh' }}>লোড হচ্ছে…</div>}>
      <SignInInner />
    </Suspense>
  );
}
