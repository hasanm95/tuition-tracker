'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { StudentDetail } from '@/lib/types';
import { money, dueLabel } from '@/lib/format';
import PaymentForm from '@/components/PaymentForm';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/students/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not load student.');
      }
      setStudent(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // Re-fetch when a payment is recorded (router.refresh re-runs this on focus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <>
      <div className="topbar">
        <Link href="/" className="btn ghost">
          ‹ Back
        </Link>
        {student && (
          <Link href={`/students/${id}/edit`} className="btn ghost">
            Edit
          </Link>
        )}
      </div>

      {error && (
        <div className="error">
          {error} <button className="btn ghost" onClick={load}>Retry</button>
        </div>
      )}

      {!student && !error && (
        <div className="card">
          <div className="skeleton" style={{ height: 34, width: '50%', margin: '0 auto' }} />
          <div className="skeleton" style={{ height: 14, width: '30%', margin: '12px auto 0' }} />
        </div>
      )}

      {student && (
        <>
          <div className="card">
            <h1 style={{ margin: 0, fontSize: 22 }}>{student.name}</h1>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {[student.class && `Class ${student.class}`, student.roll && `Roll ${student.roll}`]
                .filter(Boolean)
                .join(' · ') || 'No class info'}
            </div>

            <div className="due-hero">
              <div className={`amount ${student.due > 0 ? 'owed' : 'clear'}`}>{money(student.due)}</div>
              <div className="label">{dueLabel(student.due)}</div>
            </div>

            <div className="detail-grid">
              <div>
                <div className="k">Monthly fee</div>
                <div className="v">{money(student.monthlyFee)}</div>
              </div>
              <div>
                <div className="k">Months billed</div>
                <div className="v">{student.monthsBilled}</div>
              </div>
              <div>
                <div className="k">Total paid</div>
                <div className="v">{money(student.totalPaid)}</div>
              </div>
              <div>
                <div className="k">Start date</div>
                <div className="v">{student.startDate || '—'}</div>
              </div>
              {student.guardianPhone && (
                <div>
                  <div className="k">Guardian</div>
                  <div className="v">
                    <a href={`tel:${student.guardianPhone}`}>{student.guardianPhone}</a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <PaymentForm studentId={student.id} />

          <div className="card">
            <h2 style={{ fontSize: 16, margin: '0 0 6px' }}>Payment history</h2>
            {student.payments.length === 0 && <div className="muted">No payments recorded yet.</div>}
            {student.payments.map((p) => (
              <div className="pay-row" key={p.id}>
                <div>
                  <div className="amt">{money(p.amount)}</div>
                  {(p.method || p.note) && (
                    <div className="date">{[p.method, p.note].filter(Boolean).join(' · ')}</div>
                  )}
                </div>
                <div className="date">{p.paidOn}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
