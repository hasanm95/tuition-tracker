'use client';

import { useRef, useState } from 'react';
import type { StudentDetail } from '@/lib/types';
import { money, formatDate, formatDateBnSlash } from '@/lib/format';
import { COACHING_NAME, TAGLINE, HOTLINE } from '@/lib/config';
import { useSignature } from '@/lib/useSignature';
import { captureSheet, sheetToPdf } from '@/lib/capture';

export default function VoucherModal({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signature = useSignature();

  const safeName = (student.name || 'student').replace(/[\\/:*?"<>|]/g, '').slice(0, 40);

  // Latest deposit = total collected on the most recent payment date.
  const lastDate = student.payments.reduce((d, p) => (p.paidOn > d ? p.paidOn : d), '');
  const lastDeposit = student.payments
    .filter((p) => p.paidOn === lastDate)
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

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
              <div className="vc-receipt">টাকা আদায় ভাউচার</div>
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

            <table className="vc-table">
              <thead>
                <tr>
                  <th>মাসের নাম</th>
                  <th>মাসিক বেতন (৳)</th>
                  <th>আদায়ের তারিখ</th>
                  <th>আদায়কৃত টাকা (৳)</th>
                </tr>
              </thead>
              <tbody>
                {student.payments.map((p, i) => (
                  <tr key={p.id ?? i}>
                    <td>{p.monthName || '—'}</td>
                    <td>{p.targetFee ? money(p.targetFee) : '—'}</td>
                    <td>{formatDate(p.paidOn)}</td>
                    <td>{money(p.amount)}</td>
                  </tr>
                ))}
                {student.payments.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>কোনো জমা নেই</td></tr>
                )}
              </tbody>
            </table>

            <div className="vc-totals">
              {lastDate && (
                <div className="vc-tot last"><span>সর্বশেষ জমা ({formatDate(lastDate)})</span><b>{money(lastDeposit)}</b></div>
              )}
              <div className="vc-tot ok"><span>মোট আদায়</span><b>{money(student.totalPaid)}</b></div>
              <div className="vc-tot due"><span>বকেয়া</span><b>{money(Math.max(0, student.due))}</b></div>
            </div>

            <div className="vc-foot">
              <div className="vc-foot-meta">
                <div>তারিখ: {formatDateBnSlash(new Date())}</div>
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
