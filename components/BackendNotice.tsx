'use client';

import Link from 'next/link';
import { isBackendOutdated } from '@/lib/errors';

/**
 * Friendly card for backend setup problems. Distinguishes "not connected yet"
 * from "connected but the Apps Script code is outdated" and tells the user
 * exactly what to do. Falls back to nothing if the error isn't a setup error
 * (callers decide when to render it).
 */
export default function BackendNotice({
  error,
  onRetry,
}: {
  error: string | null | undefined;
  onRetry?: () => void;
}) {
  const outdated = isBackendOutdated(error);

  return (
    <div className="card">
      {outdated ? (
        <>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>
            ব্যাকএন্ড আপডেট প্রয়োজন
          </div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            আপনার Google Apps Script-এ পুরনো কোড চলছে, তাই এই ফিচারটি এখনো কাজ করছে না।
            সেটআপ পেজ থেকে সর্বশেষ কোড কপি করে Apps Script-এ পেস্ট করুন, এরপর{' '}
            <strong>Deploy → Manage deployments → New version</strong> করুন।
          </p>
          <Link href="/setup" className="btn">
            কোড আপডেট করুন
          </Link>
          {onRetry && (
            <button className="btn secondary" style={{ marginTop: 8 }} onClick={onRetry}>
              আপডেট হয়ে গেছে — আবার চেষ্টা করুন
            </button>
          )}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>ডেটা সংযুক্ত নেই</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            এই অ্যাপটি ব্যবহার করতে প্রথমে আপনার Google Sheet সংযুক্ত করুন।
            একবারের সেটআপ — প্রায় ১০ মিনিট।
          </p>
          <Link href="/setup" className="btn">
            ডেটা সেটআপ করুন
          </Link>
          {onRetry && (
            <button className="btn secondary" style={{ marginTop: 8 }} onClick={onRetry}>
              সেটআপ হয়ে গেছে — আবার চেষ্টা করুন
            </button>
          )}
        </>
      )}
    </div>
  );
}
