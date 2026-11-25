'use client';

import { useRef, useState } from 'react';
import type { StudentDetail } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { COACHING_NAME, TAGLINE, HOTLINE } from '@/lib/config';
import { duePerMonth } from '@/lib/due';
import { useSignature } from '@/lib/useSignature';
import { captureSheet, sheetToPdf } from '@/lib/capture';

export default function VoucherModal({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signature = useSignature();

  const safeName = (student.name || 'student').replace(/[\\/:*?"<>|]/g, '').slice(0, 40);

  // Which months are still owed — the point of this slip for the guardian.
  const pending = duePerMonth(student);
  const dueTotal = pending.reduce((sum, m) => sum + m.due, 0);

  async function downloadJPG() {
    setBusy('jpg');
    try {
      const canvas = await captureSheet(ref.current!);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.95);
      a.download = `ভাউচার-${safeName}.jpg`;
      a.click();
    } catch (e: any) {
      alert('ছবি তৈরি ব্যর্থ: ' + e.message);
    } finally {
      setBusy(null);
    }
  }

  async function downloadPDF() {
    setBusy('pdf');
    try {
      const canvas = await captureSheet(ref.current!);
      await sheetToPdf(canvas, `ভাউচার-${safeName}.pdf`);
    } catch (e: any) {
      alert('PDF তৈরি ব্যর্থ: ' + e.message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head brand">
          ভাউচার
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {/* Captured area */}
          <div className="voucher framed" ref={ref}>
            <div className="vc-head">
              <div className="vc-title">{COACHING_NAME}</div>
              <div className="vc-sub">{TAGLINE} | মোবাইল: {HOTLINE}</div>
              <div className="vc-receipt">বকেয়া বেতন বিবরণী</div>
            </div>

            <div className="vc-info">
              <div><span>নাম:</span> <b>{student.name}</b></div>
              <div><span>মোবাইল:</span> <b>{student.phone || '—'}</b></div>
              <div><span>শ্রেণী:</span> <b>{student.class}{student.section ? ` (${student.section})` : ''}</b></div>
              <div><span>রোল:</span> <b>{student.roll || '—'}</b></div>
              <div><span>মূল বেতন:</span> <b>{student.monthlyFee > 0 ? money(student.monthlyFee) : 'বেতন নাই'}</b></div>
              <div><span>শুরুর তারিখ:</span> <b>{student.startDate ? formatDate(student.startDate) : '—'}</b></div>
              {student.subjects && (
                <div style={{ gridColumn: '1 / -1' }}><span>বিষয়:</span> <b>{student.subjects}</b></div>
              )}
            </div>

            <div className="vc-receipt-sub" style={{ textAlign: 'center', fontWeight: 700, margin: '4px 0 10px', color: '#b91c1c' }}>
              যে মাসগুলোর বেতন বাকি আছে
            </div>
            <table className="vc-table">
              <thead>
                <tr>
                  <th>মাসের নাম</th>
                  <th>ধার্য বেতন (৳)</th>
                  <th>পরিশোধিত (৳)</th>
                  <th>বকেয়া (৳)</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.month}>
                    <td>{m.month}</td>
                    <td>{money(m.fee)}</td>
                    <td>{money(m.paid)}</td>
                    <td>{money(m.due)}</td>
                  </tr>
                ))}
                {pending.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#16a34a' }}>সব মাসের বেতন পরিশোধিত আছে ✅</td></tr>
                )}
              </tbody>
            </table>

            <div className="vc-totals">
              <div className="vc-tot ok"><span>মোট আদায়</span><b>{money(student.totalPaid)}</b></div>
              <div className="vc-tot due"><span>মোট বকেয়া</span><b>{money(dueTotal)}</b></div>
            </div>

            <div className="vc-foot">
              <div className="vc-foot-meta">
                <div>তারিখ: {formatDate(new Date())}</div>
                <div>মোবাইল: {HOTLINE}</div>
              </div>
              <div className="vc-sign">
                {signature && <img src={signature} alt="স্বাক্ষর" className="sig-img" />}
                <div className="vc-sig-line">পরিচালকের স্বাক্ষর</div>
              </div>
            </div>
          </div>
        </div>
        <div className="modal-foot" style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={downloadPDF} disabled={!!busy} style={{ background: '#dc2626' }}>
            {busy === 'pdf' ? 'তৈরি হচ্ছে…' : '📄 PDF ডাউনলোড'}
          </button>
          <button className="btn" onClick={downloadJPG} disabled={!!busy} style={{ background: '#16a34a' }}>
            {busy === 'jpg' ? 'তৈরি হচ্ছে…' : '🖼 JPG ডাউনলোড'}
          </button>
        </div>
      </div>
    </div>
  );
}
