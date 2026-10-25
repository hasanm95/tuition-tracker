'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Student } from '@/lib/types';
import { money } from '@/lib/format';
import ListSkeleton from '@/components/ListSkeleton';

export default function Dashboard() {
  const [students, setStudents] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const totalOutstanding = (students ?? [])
    .filter((s) => s.due > 0)
    .reduce((sum, s) => sum + s.due, 0);
  const owingCount = (students ?? []).filter((s) => s.due > 0).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <div className="sub">Students with the highest dues first</div>
        </div>
        <Link href="/students" className="btn ghost">
          Search
        </Link>
      </div>

      {error && (
        <div className="error">
          {error} <button className="btn ghost" onClick={load}>Retry</button>
        </div>
      )}

      {students === null && !error && <ListSkeleton />}

      {students !== null && (
        <>
          <div className="card center">
            <div className="muted" style={{ fontSize: 13 }}>Total outstanding</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: totalOutstanding > 0 ? 'var(--danger)' : 'var(--ok)' }}>
              {money(totalOutstanding)}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {owingCount} of {students.length} student{students.length === 1 ? '' : 's'} owe fees
            </div>
          </div>

          {students.length === 0 && (
            <div className="card center muted">No students yet. Tap “Add student” to start.</div>
          )}

          {students.map((s) => (
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
        </>
      )}

      <Link href="/students/new" className="btn fab">
        + Add student
      </Link>
    </>
  );
}
