'use client';

import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useState, useEffect } from 'react';
import { useOnlineSync } from '@/lib/useOnlineSync';
import { onQueueReplayed } from '@/lib/events';
import OfflineBanner from '@/components/OfflineBanner';

const currentYear = new Date().getFullYear();

interface YearCtx {
  year: number;
  setYear: (y: number) => void;
}

export const YearContext = createContext<YearCtx>({
  year: currentYear,
  setYear: () => {},
});

export function useYear() {
  return useContext(YearContext);
}

function YearProvider({ children }: { children: React.ReactNode }) {
  const [year, setYearState] = useState(currentYear);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bnSelectedYear');
      if (stored) setYearState(Number(stored));
    } catch {}
  }, []);

  function setYear(y: number) {
    setYearState(y);
    try { localStorage.setItem('bnSelectedYear', String(y)); } catch {}
  }

  return (
    <YearContext.Provider value={{ year, setYear }}>
      {children}
    </YearContext.Provider>
  );
}

function AppInit() {
  useOnlineSync();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    return onQueueReplayed((count) => {
      setToast(`✅ ${count}টি পেমেন্ট সফলভাবে সিঙ্ক হয়েছে!`);
      setTimeout(() => setToast(null), 3500);
    });
  }, []);

  return (
    <>
      <OfflineBanner />
      {toast && <div className="sync-toast">{toast}</div>}
    </>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <YearProvider>
        <AppInit />
        {children}
      </YearProvider>
    </SessionProvider>
  );
}
