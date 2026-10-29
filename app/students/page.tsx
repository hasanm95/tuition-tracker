'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Student } from '@/lib/types';
import { money } from '@/lib/format';
import { isSetupError } from '@/lib/errors';
import ListSkeleton from '@/components/ListSkeleton';
import BackendNotice from '@/components/BackendNotice';
import { useYear } from '@/app/providers';

function StudentsInner() {
  const { year } = useYear();
  const searchParams = useSearchParams();
  const classFilter = searchParams.get('class') ?? '';
  const yearParam = searchParams.get('year');
  const effectiveYear = yearParam ? Number(yearParam) : year;

  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cls, setCls] = useState<string>(classFilter || 'all');

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/students?year=${effectiveYear}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      setStudents(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, [effectiveYear]);

  useEffect(() => {
    if (classFilter) setCls(classFilter);
  }, [classFilter]);

  const classes = useMemo(() => {
    const set = new Set((students ?? []).map((s) => s.class).filter(Boolean));
    return Array.from(set).sort();
  }, [students]);

  const filtered = (students ?? []).filter((s) => {
    const matchesClass = cls === 'all' || s.class === cls;
    const needle = q.trim().toLowerCase();
    const matchesQuery =
      !needle ||
      s.name.toLowerCase().includes(needle) ||
      String(s.roll).toLowerCase().includes(needle);
    return matchesClass && matchesQuery;
  });

  const title = classFilter
    ? `${classFilter} (${effectiveYear} সাল) — শিক্ষার্থী তালিকা`
    : `সব শিক্ষার্থী (${effectiveYear})`;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 style={{ fontSize: 16 }}>{title}</h1>
        </div>
        <Link href="/" className="btn ghost">🏠 হোম</Link>
      </div>

      <input
        className="search"
        placeholder="নাম বা রোল দিয়ে খুঁজুন"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {classes.length > 1 && (
        <div className="chips">
          <button className={`chip ${cls === 'all' ? 'active' : ''}`} onClick={() => setCls('all')}>
            সব
          </button>
          {classes.map((c) => (
            <button key={c} className={`chip ${cls === c ? 'active' : ''}`} onClick={() => setCls(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      {error && (isSetupError(error)
        ? <BackendNotice error={error} onRetry={load} />
        : (
          <div className="error">
            {error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button>
          </div>
        )
      )}

      {students === null && !error && <ListSkeleton />}

      {students !== null && filtered.length === 0 && (
        <div className="card center muted">কোনো শিক্ষার্থী পাওয়া যায়নি।</div>
      )}

      {filtered.map((s) => (
        <Link href={`/students/${s.id}`} key={s.id}>
          <div className="card student-row">
            <div>
              <div className="name">{s.name}</div>
              <div className="meta">
                {[
                  s.class,
                  s.section ? `শাখা: ${s.section}` : null,
                  s.roll ? `রোল: ${s.roll}` : null,
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
              <span className={`badge ${s.due > 0 ? 'due' : 'clear'}`}>
                {s.due > 0 ? money(s.due) : 'পরিষ্কার'}
              </span>
              <span className={`badge ${s.status === 'active' ? 'active' : 'inactive'}`} style={{ fontSize: 11, padding: '3px 8px' }}>
                {s.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
              </span>
            </div>
          </div>
        </Link>
      ))}
    </>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <StudentsInner />
    </Suspense>
  );
}
