'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Payment } from '@/lib/types';
import { money } from '@/lib/format';
import { isSetupError } from '@/lib/errors';
import { useYear } from '@/app/providers';
import BackendNotice from '@/components/BackendNotice';

export default function DailyPage() {
  const { year } = useYear();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(d: string) {
    setError(null);
    setLoading(true);
    setPayments(null);
    try {
      const res = await fetch(`/api/payments?date=${d}&year=${year}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'পেমেন্ট লোড করা যায়নি।');
      }
      setPayments(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(date); }, [date, year]);

  const total = (payments ?? []).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>দৈনিক পেমেন্ট</h1>
          <div className="sub">{year} শিক্ষাবর্ষ — তারিখ অনুযায়ী</div>
        </div>
      </div>

      <div className="daily-date-wrap">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {error && (isSetupError(error)
        ? <BackendNotice error={error} onRetry={() => load(date)} />
        : <div className="error">{error}</div>
      )}

      {loading && (
        <div className="card">
          <div className="skeleton" style={{ height: 18, width: '60%' }} />
          <div className="skeleton" style={{ height: 18, width: '80%' }} />
          <div className="skeleton" style={{ height: 18, width: '50%' }} />
        </div>
      )}

      {!loading && payments !== null && payments.length === 0 && (
        <div className="card center muted">এই তারিখে কোনো পেমেন্ট নেই।</div>
      )}

      {!loading && payments !== null && payments.length > 0 && (
        <>
          <div className="daily-total">
            মোট জমা: {money(total)} ({payments.length} জন)
          </div>
          <div className="card">
            {payments.map((p, i) => (
              <div key={p.id ?? i} className="pay-row">
                <div>
                  <div className="name" style={{ fontSize: 15 }}>
                    {p.studentName || 'অজ্ঞাত'}
                  </div>
                  <div className="date">
                    {p.studentClass}
                    {p.studentSection ? ` | শাখা: ${p.studentSection}` : ''}
                    {p.method ? ` | ${p.method}` : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="amt">{money(p.amount)}</div>
                  <Link
                    href={`/students/${p.studentId}`}
                    style={{ fontSize: 12, color: 'var(--brand)' }}
                  >
                    বিস্তারিত ›
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
