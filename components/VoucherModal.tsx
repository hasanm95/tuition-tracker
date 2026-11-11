'use client';

import { useRef, useState } from 'react';
import type { StudentDetail } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { COACHING_NAME, HOTLINE } from '@/lib/config';
import { useSignature } from '@/lib/useSignature';

export default function VoucherModal({ student, onClose }: { student: StudentDetail; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const signature = useSignature();

  const today = formatDate(new Date());
  const safeName = (student.name || 'student').replace(/[\\/:*?"<>|]/g, '').slice(0, 40);

  async function capture() {
    const html2canvas = (await import('html2canvas')).default;
    const node = ref.current!;
    return html2canvas(node, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  }

  async function downloadJPG() {
    setBusy('jpg');
    try {
      const canvas = await capture();
      const url = canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = url;
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
      const canvas = await capture();
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = 210;
      const margin = 12;
      const imgW = pageW - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, imgH);
      pdf.save(`ভাউচার-${safeName}.pdf`);
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
          <div className="voucher" ref={ref}>
            <div className="vc-head">
              <div className="vc-title">{COACHING_NAME}</div>
              <div className="vc-sub">হটলাইন: {HOTLINE}</div>
              <div className="vc-receipt">ফি রসিদ</div>
            </div>

            <div className="vc-info">
              <div><span>নাম:</span> <b>{student.name}</b></div>
              <div><span>শ্রেণী:</span> <b>{student.class}{student.section ? ` (${student.section})` : ''}</b></div>
              <div><span>রোল:</span> <b>{student.roll || '—'}</b></div>
              <div><span>মূল বেতন:</span> <b>{student.monthlyFee > 0 ? money(student.monthlyFee) : 'বেতন নাই'}</b></div>
              <div><span>মোবাইল:</span> <b>{student.phone || '—'}</b></div>
              <div><span>শিক্ষাবর্ষ:</span> <b>{student.academicYear || '—'}</b></div>
              <div><span>তারিখ:</span> <b>{today}</b></div>
            </div>

            <table className="vc-table">
              <thead>
                <tr>
                  <th>মাসের নাম</th>
                  <th style={{ textAlign: 'right' }}>মাসিক বেতন (৳)</th>
                  <th>আদায়ের তারিখ</th>
                  <th style={{ textAlign: 'right' }}>আদায়কৃত টাকা (৳)</th>
                </tr>
              </thead>
              <tbody>
                {student.payments.map((p, i) => (
                  <tr key={p.id ?? i}>
                    <td>{p.monthName || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{p.targetFee ? money(p.targetFee) : '—'}</td>
                    <td>{formatDate(p.paidOn)}</td>
                    <td style={{ textAlign: 'right' }}>{money(p.amount)}</td>
                  </tr>
                ))}
                {student.payments.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: '#64748b' }}>কোনো জমা নেই</td></tr>
                )}
              </tbody>
            </table>

            <div className="vc-totals">
              <div className="vc-tot ok"><span>মোট জমা</span><b>{money(student.totalPaid)}</b></div>
              <div className="vc-tot due"><span>বকেয়া</span><b>{money(Math.max(0, student.due))}</b></div>
            </div>

            <div className="vc-sign">
              {signature && <img src={signature} alt="স্বাক্ষর" className="sig-img" />}
              <div className="vc-sig-line">স্বাক্ষর</div>
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
