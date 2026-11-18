'use client';

import { useEffect } from 'react';
import { replayQueue } from './syncQueue';

export function useOnlineSync(onReplayed?: (count: number) => void): void {
  useEffect(() => {
    async function tryReplay() {
      if (!navigator.onLine) return;
      const count = await replayQueue();
      if (count > 0) onReplayed?.(count);
    }
    window.addEventListener('online', tryReplay);
    tryReplay(); // also replay any queue that built up before this mount
    return () => window.removeEventListener('online', tryReplay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
