'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Student } from '@/lib/types';
import { isSetupError } from '@/lib/errors';
import { useYear } from './providers';
import { HOTLINE } from '@/lib/config';
import ListSkeleton from '@/components/ListSkeleton';
import BackendNotice from '@/components/BackendNotice';

export default function Dashboard() {
  const { year } = useYear();
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    setStudents(null);
    try {
      const res = await fetch(`/api/students?year=${year}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      setStudents(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [year]);

  const classes = useMemo(() => {
    if (!students) return [];
    const map: Record<string, number> = {};
    for (const s of students) {
      if (s.status === 'অব্যাহতি প্রাপ্ত') continue;
      const cls = s.class || '—';
      map[cls] = (map[cls] || 0) + 1;
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [students]);

  const notConnected = isSetupError(error);

  return (
    <>
      <div className="section-head">
        <div>
          <h1>শ্রেণীর তালিকা <span className="accent">({year} সাল)</span></h1>
          <div className="hl">হটলাইন: {HOTLINE}</div>
        </div>
        <button className="pill-btn" onClick={load}>↻ রিফ্রেশ</button>
      </div>

      {notConnected && <BackendNotice error={error} onRetry={load} />}

      {error && !notConnected && (
        <div className="error">
          {error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button>
        </div>
      )}

      {students === null && !error && <ListSkeleton />}

      {students !== null && classes.length === 0 && !error && (
        <div className="card center muted">
          {year} সালে কোনো শিক্ষার্থী নেই। &quot;ভর্তি&quot; বোতামে ক্লিক করে যোগ করুন।
        </div>
      )}

      {classes.length > 0 && (
        <div className="class-grid">
          {classes.map(({ name, count }, i) => (
            <Link key={name} href={`/students?class=${encodeURIComponent(name)}&year=${year}`}>
              <div className={`class-card accent-${i % 6}`}>
                <div className="class-avatar">🎓</div>
                <div className="cn">{name}</div>
                <div className="cc">{count} জন পড়ছে</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
