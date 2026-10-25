'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { Student } from '@/lib/types';
import { money } from '@/lib/format';
import ListSkeleton from '@/components/ListSkeleton';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cls, setCls] = useState<string>('all');

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/students', { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not load students.');
      }
      setStudents(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      String(s.roll).toLowerCase().includes(needle) ||
      String(s.class).toLowerCase().includes(needle);
    return matchesClass && matchesQuery;
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Students</h1>
          <div className="sub">Search and filter</div>
        </div>
        <Link href="/" className="btn ghost">
          Dashboard
        </Link>
      </div>

      <input
        className="search"
        placeholder="Search by name, roll, or class"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {classes.length > 0 && (
        <div className="chips">
          <button className={`chip ${cls === 'all' ? 'active' : ''}`} onClick={() => setCls('all')}>
            All
          </button>
          {classes.map((c) => (
            <button key={c} className={`chip ${cls === c ? 'active' : ''}`} onClick={() => setCls(c)}>
              Class {c}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="error">
          {error} <button className="btn ghost" onClick={load}>Retry</button>
        </div>
      )}

      {students === null && !error && <ListSkeleton />}

      {students !== null && filtered.length === 0 && (
        <div className="card center muted">No matching students.</div>
      )}

      {filtered.map((s) => (
        <Link href={`/students/${s.id}`} key={s.id}>
          <div className="card student-row">
            <div>
              <div className="name">{s.name}</div>
              <div className="meta">
                {[s.class && `Class ${s.class}`, s.roll && `Roll ${s.roll}`].filter(Boolean).join(' · ') ||
                  'No class info'}
              </div>
            </div>
            <span className={`badge ${s.due > 0 ? 'due' : 'clear'}`}>
              {s.due > 0 ? money(s.due) : 'Clear'}
            </span>
          </div>
        </Link>
      ))}

      <Link href="/students/new" className="btn fab">
        + Add student
      </Link>
    </>
  );
}
