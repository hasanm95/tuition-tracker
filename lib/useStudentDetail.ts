'use client';

import { useEffect, useRef, useState } from 'react';
import type { StudentDetail } from './types';
import { getCache, setCache, deleteCache } from './db';

function cacheKey(id: string) {
  return `student-${id}`;
}

interface UseStudentDetailResult {
  student: StudentDetail | null;
  error: string | null;
  /** true while a background refresh is in-flight */
  refreshing: boolean;
  load: () => Promise<void>;
}

export function useStudentDetail(id: string): UseStudentDetailResult {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  async function load() {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);

    try {
      // 1. Serve cache immediately
      const cached = await getCache<StudentDetail>(cacheKey(id));
      if (cached) {
        setStudent(cached);
        setRefreshing(true);
      } else {
        setStudent(null);
      }

      // 2. Fetch fresh
      const res = await fetch(`/api/students/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      const fresh: StudentDetail = await res.json();
      setStudent(fresh);
      setError(null);
      await setCache(cacheKey(id), fresh);
    } catch (err: any) {
      setStudent((prev) => prev);
      setError(err.message);
    } finally {
      setRefreshing(false);
      inFlight.current = false;
    }
  }

  useEffect(() => {
    if (id) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { student, error, refreshing, load };
}

/** Call after any mutation that changes this student (payments, edits, status). */
export async function invalidateStudentDetail(id: string) {
  await deleteCache(cacheKey(id));
}
