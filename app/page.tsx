'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { Student } from '@/lib/types';
import { useYear } from './providers';
import ListSkeleton from '@/components/ListSkeleton';

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

  const notConnected =
    !!error && /APPS_SCRIPT|not return JSON|deployment URL/i.test(error);

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

      {notConnected && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>ডেটা সংযুক্ত নেই</div>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--muted)' }}>
            এই অ্যাপটি ব্যবহার করতে প্রথমে আপনার Google Sheet সংযুক্ত করুন।
            একবারের সেটআপ — প্রায় ১০ মিনিট।
          </p>
          <Link href="/setup" className="btn">
            ডেটা সেটআপ করুন
          </Link>
          <button className="btn" style={{ marginTop: 8, background: 'transparent', color: 'var(--brand)', border: '1px solid var(--border)' }} onClick={load}>
            সেটআপ হয়ে গেছে — আবার চেষ্টা করুন
          </button>
        </div>
      )}

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
        <div className="class-grid">
          {classes.map(({ name, count }) => (
            <Link
              key={name}
              href={`/students?class=${encodeURIComponent(name)}&year=${year}`}
            >
              <div className="class-card">
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
