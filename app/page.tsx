'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Student } from '@/lib/types';
import { money } from '@/lib/format';
import { isNotConnected } from '@/lib/errors';
import { useYear } from './providers';
import ListSkeleton from '@/components/ListSkeleton';
import NotConnectedCard from '@/components/NotConnectedCard';

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
      const cls = s.class || '—';
      map[cls] = (map[cls] || 0) + 1;
    }
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [students]);

  const summary = useMemo(() => {
    const list = students ?? [];
    return {
      count: list.length,
      paid: list.reduce((sum, s) => sum + (s.totalPaid || 0), 0),
      due: list.reduce((sum, s) => sum + Math.max(0, s.due || 0), 0),
    };
  }, [students]);

  const notConnected = isNotConnected(error);

  return (
    <>
      <div style={{ marginTop: 14 }}>
        <div className="page-title">
          <span>শ্রেণীর তালিকা ({year} শিক্ষাবর্ষ)</span>
          <button className="bc-btn" onClick={load} style={{ fontSize: 12 }}>
            ↻ রিফ্রেশ
          </button>
        </div>
        <div className="page-sub">নতুন বছরের জন্য ওপর থেকে সাল পরিবর্তন করুন।</div>
      </div>

      {notConnected && <NotConnectedCard onRetry={load} />}

      {error && !notConnected && (
        <div className="error">
          {error}{' '}
          <button className="btn ghost" onClick={load}>আবার চেষ্টা</button>
        </div>
      )}

      {students === null && !error && <ListSkeleton />}

      {students !== null && classes.length === 0 && (
        <div className="card center muted">
          {year} সালে কোনো শিক্ষার্থী নেই। &quot;ভর্তি&quot; বোতামে ক্লিক করে যোগ করুন।
        </div>
      )}

      {classes.length > 0 && (
        <div className="home-summary">
          <div className="sum-tile students">
            <div className="st-v">{summary.count}</div>
            <div className="st-k">মোট শিক্ষার্থী</div>
          </div>
          <div className="sum-tile paid">
            <div className="st-v">{money(summary.paid)}</div>
            <div className="st-k">মোট জমা</div>
          </div>
          <div className="sum-tile due">
            <div className="st-v">{money(summary.due)}</div>
            <div className="st-k">মোট বেকেয়া</div>
          </div>
        </div>
      )}

      {classes.length > 0 && (
        <div className="class-grid">
          {classes.map(({ name, count }, i) => (
            <Link
              key={name}
              href={`/students?class=${encodeURIComponent(name)}&year=${year}`}
            >
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
