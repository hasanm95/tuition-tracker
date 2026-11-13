'use client';

import { useRef, useState } from 'react';
import type { Payment, StudentDetail } from '@/lib/types';
import { money, formatDate, todayLocal } from '@/lib/format';
import { captureSheet, sheetToPdf } from '@/lib/capture';
import { isSetupError } from '@/lib/errors';
import { useYear } from '@/app/providers';
import { COACHING_NAME, HOTLINE } from '@/lib/config';
import { useSignature } from '@/lib/useSignature';
import VoucherModal from '@/components/VoucherModal';
import BackendNotice from '@/components/BackendNotice';

export default function DailyPage() {
  const { year } = useYear();
  const [date, setDate] = useState(todayLocal());
  const [rows, setRows] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const signature = useSignature();
  const [voucherStudent, setVoucherStudent] = useState<StudentDetail | null>(null);
  const [vcLoading, setVcLoading] = useState<string | null>(null);

  async function openVoucher(studentId: string) {
    setVcLoading(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}`, { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'লোড ব্যর্থ।');
      setVoucherStudent(await res.json());
    } catch (err: any) {
      alert('ভাউচার খোলা যায়নি: ' + err.message);
    } finally {
      setVcLoading(null);
    }
  }

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

  const safeFile = `দৈনিক-আদায়-${formatDate(date)}`;

  async function downloadJPG() {
    setBusy('jpg');
    try {
      const canvas = await captureSheet(printRef.current!);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.95);
      a.download = `${safeFile}.jpg`;
      a.click();
    } catch (e: any) { alert('ছবি তৈরি ব্যর্থ: ' + e.message); } finally { setBusy(null); }
  }

  async function downloadPDF() {
    setBusy('pdf');
    try {
      const canvas = await captureSheet(printRef.current!);
      await sheetToPdf(canvas, `${safeFile}.pdf`);
    } catch (e: any) { alert('PDF তৈরি ব্যর্থ: ' + e.message); } finally { setBusy(null); }
  }

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
              <div className="sheet-actions">
                <button className="pill-btn green" onClick={downloadJPG} disabled={!!busy}>{busy === 'jpg' ? 'তৈরি হচ্ছে…' : '🖼 রসিদ JPG'}</button>
                <button className="pill-btn gray" onClick={downloadPDF} disabled={!!busy}>{busy === 'pdf' ? 'তৈরি হচ্ছে…' : '🖨 প্রিন্ট / PDF'}</button>
              </div>

              <div ref={printRef} className="print-sheet">
                <div className="es-head">
                  <div className="es-title">{COACHING_NAME}</div>
                  <div className="es-sub">হটলাইন: {HOTLINE}</div>
                  <div className="es-meta">
                    <span className="es-badge ok">দৈনিক আদায় রসিদ</span>
                    <span>তারিখ: {formatDate(date)}</span>
                    <span>জমা দিয়েছেন: {rows.length} জন</span>
                  </div>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="es-total"><span>মোট আদায়</span> <b>{money(total)}</b></div>
                <div className="sheet-sign">
                  {signature && <img src={signature} alt="স্বাক্ষর" className="sig-img" />}
                  <div className="sheet-sign-line">পরিচালকের স্বাক্ষর</div>
                </div>
              </div>

              <div className="section-head" style={{ marginTop: 18 }}>
                <h2 style={{ fontSize: 15 }}>প্রত্যেকের ভাউচার / প্রোফাইল:</h2>
              </div>
              <div className="table-wrap" style={{ marginTop: 6 }}>
                <table className="data">
                  <thead>
                    <tr><th>নাম</th><th>শ্রেণী</th><th className="num">জমা (৳)</th><th className="center">ভাউচার</th><th className="center">প্রোফাইল</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.id || i}>
                        <td>{r.studentName}</td>
                        <td>{r.studentClass}{r.studentSection ? ` (${r.studentSection})` : ''}</td>
                        <td className="num">{money(r.amount)}</td>
                        <td className="center">
                          <button className="cell-btn voucher" onClick={() => openVoucher(r.studentId)} disabled={vcLoading === r.studentId}>
                            {vcLoading === r.studentId ? '…' : '🧾 ভাউচার'}
                          </button>
                        </td>
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

      {voucherStudent && <VoucherModal student={voucherStudent} onClose={() => setVoucherStudent(null)} />}
    </>
  );
}
