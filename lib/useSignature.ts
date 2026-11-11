'use client';

import { useEffect, useState } from 'react';

/** Load the saved director signature (data-URL) once. Empty string if none. */
export function useSignature(): string {
  const [sig, setSig] = useState('');
  useEffect(() => {
    let active = true;
    fetch('/api/signature', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { signature: '' }))
      .then((d) => { if (active) setSig(d.signature || ''); })
      .catch(() => {});
    return () => { active = false; };
  }, []);
  return sig;
}
