'use client';

import { useState } from 'react';
import type { Payment } from '@/lib/types';
import { money } from '@/lib/format';
import { isSetupError } from '@/lib/errors';
import { useYear } from '@/app/providers';
import BackendNotice from '@/components/BackendNotice';

export default function DailyPage() {
  const { year } = useYear();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true); setError(null); setRows(null);
    try {
      const res = await fetch(`/api/payments?date=${date}&year=${year}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'লোড ব্যর্থ হয়েছে।');
      }
      setRows(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const total = (rows ?? []).reduce((s, r) => s + (r.amount || 0), 0);
  const notConnected = isSetupError(error);

  return (
    <>
      <div className="section-head">
        <h1>📅 তারিখ অনুযায়ী জমার হিসাব</h1>
      </div>

      <div className="date-bar">
        <label>তারিখ নির্বাচন করুন:</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? 'লোড হচ্ছে…' : '🔍 হিসাব দেখুন'}
        </button>
      </div>

      {notConnected && <div style={{ marginTop: 16 }}><BackendNotice error={error} onRetry={load} /></div>}
      {error && !notConnected && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

      {rows !== null && !error && (
        <>
          <div className="daily-cards">
            <div className="daily-card people">
              <div className="dc-k">জমা দিয়েছেন</div>
              <div className="dc-v">{rows.length} জন</div>
            </div>
            <div className="daily-card total">
              <div className="dc-k">মোট আদায়</div>
              <div className="dc-v">{money(total)}</div>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="card center muted">এই তারিখে কোনো জমা নেই।</div>
          ) : (
            <>
              <div className="section-head">
                <h2 style={{ fontSize: 17 }}>{date} তারিখে জমাকৃত তালিকা:</h2>
              </div>
              <div className="table-wrap">
                <table className="data">
                  <thead>
                    <tr>
                      <th className="center">#</th>
                      <th>নাম</th>
                      <th>শ্রেণী</th>
                      <th>শাখা</th>
                      <th className="num">জমা (৳)</th>
                      <th className="center">প্রোফাইল</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id || i}>
                        <td className="center">{i + 1}</td>
                        <td>{r.studentName}</td>
                        <td>{r.studentClass}</td>
                        <td>{r.studentSection || '—'}</td>
                        <td className="num">{money(r.amount)}</td>
                        <td className="center">
                          <a className="cell-btn profile" href={`/students/${r.studentId}`}>প্রোফাইল</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
