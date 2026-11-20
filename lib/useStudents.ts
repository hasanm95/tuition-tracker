'use client';

import { useEffect, useRef, useState } from 'react';
import type { Student } from './types';
import { getCache, setCache } from './db';

function cacheKey(year: number) {
  return `students-${year}`;
}

interface UseStudentsResult {
  students: Student[] | null;
  error: string | null;
  /** true while a background refresh is in-flight (stale data showing) */
  refreshing: boolean;
  load: () => Promise<void>;
}

export function useStudents(year: number): UseStudentsResult {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Prevent double-fetch on StrictMode double-effect
  const inFlight = useRef(false);

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    try {
      // 1. Serve cache immediately — user sees data with no spinner
      const cached = await getCache<Student[]>(cacheKey(year));
      if (cached) {
        setStudents(cached);
        setRefreshing(true); // signal that a background refresh follows
      } else {
        setStudents(null); // show skeleton
      }

      // 2. Fetch fresh data in the background (or foreground if no cache)
      const res = await fetch(`/api/students?year=${year}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      const fresh: Student[] = await res.json();
      setStudents(fresh);
      setError(null);
      await setCache(cacheKey(year), fresh);
    } catch (err: any) {
      // If we already have cached data, keep showing it and don't wipe it
      setStudents((prev) => prev);
      setError(err.message);
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return { students, error, refreshing, load };
}

/**
 * Call after any mutation that modifies a student list. Clears every year's
 * cached list (not just one), so a deleted/changed student can't survive in a
 * list cached under a different academic year. `year` is kept for call sites
 * but no longer needed.
 */
export async function invalidateStudents(_year?: number) {
  const { deleteCacheByPrefix } = await import('./db');
  await deleteCacheByPrefix('students-');
}
