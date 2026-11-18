'use client';

import { useEffect, useState } from 'react';
import { listMutations } from './db';
import { onQueueReplayed } from './events';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    async function refreshCount() {
      const q = await listMutations();
      setPendingCount(q.length);
    }

    function goOffline() { setIsOffline(true); }
    function goOnline() { setIsOffline(false); refreshCount(); }

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    const unsub = onQueueReplayed(refreshCount);
    refreshCount();

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      unsub();
    };
  }, []);

  return { isOffline, pendingCount };
}
