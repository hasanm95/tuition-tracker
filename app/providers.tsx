'use client';

import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useState, useEffect } from 'react';

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

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <YearProvider>{children}</YearProvider>
    </SessionProvider>
  );
}
