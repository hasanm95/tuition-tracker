'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { StudentDetail, Payment } from '@/lib/types';
import { money } from '@/lib/format';
import { isNotConnected } from '@/lib/errors';
import PaymentForm from '@/components/PaymentForm';
import NotConnectedCard from '@/components/NotConnectedCard';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch(`/api/students/${id}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      setStudent(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function deletePayment(p: Payment) {
    if (!confirm(`${p.paidOn} তারিখের ${money(p.amount)} পেমেন্ট মুছে ফেলবেন?`)) return;
    setDeletingPayment(p.id);
    try {
      const res = await fetch(`/api/payments/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('মুছতে ব্যর্থ হয়েছে।');
      await load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingPayment(null);
    }
  }

  return (
    <>
      <div className="breadcrumbs" style={{ marginTop: 14 }}>
        <Link href="/" className="bc-btn">🏠 হোম</Link>
        <span style={{ color: 'var(--muted)', fontSize: 14 }}>›</span>
        <Link href="/students" className="bc-btn">← তালিকা</Link>
      </div>

      {error && (isNotConnected(error)
        ? <NotConnectedCard onRetry={load} />
        : (
          <div className="error">
            {error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button>
          </div>
        )
      )}

      {!student && !error && (
        <div className="card">
          <div className="skeleton" style={{ height: 28, width: '50%' }} />
          <div className="skeleton" style={{ height: 14, width: '70%', marginTop: 10 }} />
          <div className="skeleton" style={{ height: 14, width: '40%', marginTop: 8 }} />
        </div>
      )}

      {student && (
        <>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Link href={`/students/${id}/edit`} className="bc-btn" style={{ flex: 1, justifyContent: 'center' }}>
              ✏️ তথ্য এডিট
            </Link>
            <button className="bc-btn" style={{ flex: 1, justifyContent: 'center', color: 'var(--muted)' }}>
              অব্যাহতি দিন
            </button>
            <button
              className="bc-btn"
              style={{ flex: 1, justifyContent: 'center', color: 'var(--danger)', borderColor: 'var(--danger-bg)' }}
              onClick={() => {
                if (confirm(`"${student.name}" কে মুছে ফেলবেন? এটি পূর্বাবস্থায় ফেরানো যাবে না।`)) {
                  alert('শিক্ষার্থী মুছার ফিচার শীঘ্রই আসছে।');
                }
              }}
            >
              🗑️ ডিলিট
            </button>
          </div>

          {/* Student Header */}
          <div className="student-header-card">
            <div className="student-name">{student.name}</div>
            <div className="student-tags">
              <span className="student-tag">
                {student.class}
                {student.section ? ` | শাখা: ${student.section}` : ''}
                {student.roll ? ` | রোল: ${student.roll}` : ''}
                {student.monthlyFee ? ` | ফি: ৳${student.monthlyFee}` : ''}
              </span>
              <span className={`badge ${student.status === 'active' ? 'active' : 'inactive'}`}>
                {student.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
              </span>
              {student.academicYear && (
                <span className="badge year">{student.academicYear} শিক্ষাবর্ষ</span>
              )}
            </div>

            {student.guardianPhone && (
              <>
                <a href={`tel:${student.guardianPhone}`} className="phone-btn">
                  📞 {student.guardianPhone}
                </a>
                <div className="phone-hint">ℹ️ নাম্বারে ট্যাপ করলে সরাসরি কল যাবে।</div>
              </>
            )}

            <div className="stat-grid">
              <div className="stat-box">
                <div className="sk">প্রাইভেট শুরু</div>
                <div className="sv" style={{ fontSize: 14 }}>{student.startDate || '—'}</div>
              </div>
              <div className={`stat-box ${student.totalPaid > 0 ? 'ok' : ''}`}>
                <div className="sk">মোট জমা দিয়েছে</div>
                <div className="sv">{money(student.totalPaid)}</div>
              </div>
              <div className={`stat-box ${student.due > 0 ? 'bad' : 'ok'}`}>
                <div className="sk">মোট বেকেয়া আছে</div>
                <div className="sv">{money(Math.max(0, student.due))}</div>
              </div>
            </div>
          </div>

          {/* Payment form */}
          <PaymentForm studentId={student.id} onSuccess={load} />

          {/* Payment history */}
          <div className="card" style={{ marginTop: 10 }}>
            <div className="pay-section-title">
              💵 পূর্বে টাকা জমার হিস্ট্রি (ভুল হলে এডিট/ডিলিট করুন):
            </div>
            {student.payments.length === 0 && (
              <div className="muted" style={{ fontSize: 14 }}>এখনো কোনো পেমেন্ট নেই।</div>
            )}
            {student.payments.map((p, i) => (
              <div key={p.id ?? i} className="pay-row">
                <div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>#{i + 1} &nbsp; {p.paidOn}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="amt" style={{ color: 'var(--ok)' }}>{money(p.amount)}</span>
                  <div className="pay-actions">
                    <button
                      className="icon-btn del"
                      disabled={deletingPayment === p.id}
                      onClick={() => deletePayment(p)}
                      title="মুছুন"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
