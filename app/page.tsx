'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { isSetupError } from '@/lib/errors';
import { useYear } from './providers';
import { HOTLINE } from '@/lib/config';
import { useStudents } from '@/lib/useStudents';
import ListSkeleton from '@/components/ListSkeleton';
import BackendNotice from '@/components/BackendNotice';

export default function Dashboard() {
  const { year } = useYear();
  const { students, error, refreshing, load } = useStudents(year);
  const [q, setQ] = useState('');

  const CLASS_ORDER = ['৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '১০ম', 'পরীক্ষার্থী'];

  const classes = useMemo(() => {
    if (!students) return [];
    const map: Record<string, number> = {};
    for (const s of students) {
      if (s.status === 'অব্যাহতি প্রাপ্ত') continue;
      const cls = (s.class || '—').replace(/ \(HM\)$/, '');
      map[cls] = (map[cls] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => {
        const ia = CLASS_ORDER.indexOf(a.name);
        const ib = CLASS_ORDER.indexOf(b.name);
        if (ia === -1 && ib === -1) return a.name.localeCompare(b.name);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });
  }, [students]);

  const searchResults = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle || !students) return null;
    return students.filter((s) => `${s.name} ${s.roll} ${s.class}`.toLowerCase().includes(needle));
  }, [q, students]);

  const notConnected = isSetupError(error);

  return (
    <>
      <div className="section-head">
        <div>
          <h1>শ্রেণীর তালিকা <span className="accent">({year} সাল)</span></h1>
          <div className="hl">হটলাইন: {HOTLINE}</div>
        </div>
        <button className="pill-btn" onClick={load}>{refreshing ? '↻ আপডেট হচ্ছে…' : '↻ রিফ্রেশ'}</button>
      </div>

      {notConnected && <BackendNotice error={error} onRetry={load} />}

      {error && !notConnected && (
        <div className="error">
          {error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button>
        </div>
      )}

      <input
        className="search"
        placeholder="🔍 নাম, রোল বা ক্লাস দিয়ে খুঁজুন…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 16 }}
      />

      {students === null && !error && <ListSkeleton />}

      {searchResults !== null ? (
        <div className="stack">
          {searchResults.map((s) => (
            <Link key={s.id} href={`/students/${s.id}`}>
              <div className="card student-row">
                <div>
                  <div className="name">{s.name}</div>
                  <div className="meta">{s.class} | রোল: {s.roll} | শাখা: {s.section || '—'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.due > 0 && <span className="badge due">বকেয়া {Math.round(s.due)}</span>}
                  <span className={`badge ${s.status === 'অব্যাহতি প্রাপ্ত' ? 'inactive' : 'active'}`}>
                    {s.status || 'সক্রিয়'}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>›</span>
                </div>
              </div>
            </Link>
          ))}
          {searchResults.length === 0 && (
            <div className="card center muted">কোনো শিক্ষার্থী মিলেনি।</div>
          )}
        </div>
      ) : (
        <>
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
      )}
    </>
  );
}
