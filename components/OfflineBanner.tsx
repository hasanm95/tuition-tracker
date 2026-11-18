'use client';

import { useOfflineStatus } from '@/lib/useOfflineStatus';

export default function OfflineBanner() {
  const { isOffline, pendingCount } = useOfflineStatus();

  if (!isOffline && pendingCount === 0) return null;

  return (
    <div className={`offline-banner${isOffline ? '' : ' banner-syncing'}`}>
      {isOffline
        ? `📵 অফলাইন${pendingCount > 0 ? ` — ${pendingCount}টি পেমেন্ট পাঠানো বাকি` : ' — ইন্টারনেট নেই'}`
        : `⏳ ${pendingCount}টি পেমেন্ট সিঙ্ক হওয়ার অপেক্ষায়…`}
    </div>
  );
}
