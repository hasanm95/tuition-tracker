'use client';

import Link from 'next/link';

export default function NotConnectedCard({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="card">
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
    </div>
  );
}
