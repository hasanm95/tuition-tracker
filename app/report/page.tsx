'use client';

import { useEffect, useState } from 'react';
import { money } from '@/lib/format';
import { isSetupError } from '@/lib/errors';
import { useYear } from '@/app/providers';
import type { MonthlyReport } from '@/app/api/report/route';
import BackendNotice from '@/components/BackendNotice';
import ListSkeleton from '@/components/ListSkeleton';

export default function ReportPage() {
  const { year } = useYear();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null); setReport(null);
    try {
      const res = await fetch(`/api/report?year=${year}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'রিপোর্ট লোড ব্যর্থ হয়েছে।');
      }
      setReport(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, [year]);

  const notConnected = isSetupError(error);

  return (
    <>
      <div className="section-head">
        <h1>💵 আয় বিবরণী <span className="accent">({year} সাল)</span></h1>
        <button className="pill-btn" onClick={load}>↻ রিফ্রেশ</button>
      </div>

      {notConnected && <BackendNotice error={error} onRetry={load} />}
      {error && !notConnected && <div className="error">{error}</div>}
      {report === null && !error && <ListSkeleton />}

      {report && (
        <>
          <div className="stat-cards">
            <div className="stat-card green">
              <div className="sc-k">বাৎসরিক মোট আদায়কৃত আয়</div>
              <div className="sc-v">{money(report.totalCollected)}</div>
            </div>
            <div className="stat-card blue">
              <div className="sc-k">বাৎসরিক লক্ষ্য</div>
              <div className="sc-v">{money(report.totalExpected)}</div>
            </div>
            <div className="stat-card red">
              <div className="sc-k">বাৎসরিক বকেয়া</div>
              <div className="sc-v">{money(report.totalDue)}</div>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>মাস</th>
                  <th className="num">ছাত্র</th>
                  <th className="num">আদায়কৃত আয়</th>
                  <th className="num">লক্ষ্যমাত্রা</th>
                  <th className="num">বকেয়া</th>
                  <th className="center">অবস্থা</th>
                </tr>
              </thead>
              <tbody>
                {report.monthlyStats.map((m) => (
                  <tr key={m.monthName}>
                    <td>{m.monthName}</td>
                    <td className="num">{m.studentCount} জন</td>
                    <td className="num">{money(m.collectedAmount)}</td>
                    <td className="num">{money(m.expectedAmount)}</td>
                    <td className="num">{money(m.dueAmount)}</td>
                    <td className="center">
                      {m.dueAmount > 0
                        ? <span className="badge due">বকেয়া আছে</span>
                        : <span className="badge inactive">নেই</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
