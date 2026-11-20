'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import type { Payment, StudentDetail } from '@/lib/types';
import { money, formatDate } from '@/lib/format';
import { isSetupError } from '@/lib/errors';
import { useStudentDetail } from '@/lib/useStudentDetail';
import { invalidateStudents } from '@/lib/useStudents';
import { onQueueReplayed } from '@/lib/events';
import PaymentForm from '@/components/PaymentForm';
import BackendNotice from '@/components/BackendNotice';
import VoucherModal from '@/components/VoucherModal';

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { student, error, refreshing, load } = useStudentDetail(id);
  const [deletingPayment, setDeletingPayment] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [voucher, setVoucher] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<Payment[]>([]);

  const refresh = useCallback(async () => {
    await load();
    setPendingPayments([]);
  }, [load]);

  const addOptimistic = useCallback((p: Payment) => {
    setPendingPayments((prev) => [...prev, p]);
  }, []);

  const rollback = useCallback(() => {
    setPendingPayments((prev) => prev.slice(0, -1));
  }, []);

  // When an offline queue is replayed globally, reload this student's data.
  useEffect(() => onQueueReplayed(refresh), [refresh]);

  async function toggleStatus() {
    if (!student) return;
    const discharged = student.status === 'অব্যাহতি প্রাপ্ত';
    const next = discharged ? 'সক্রিয়' : 'অব্যাহতি প্রাপ্ত';
    if (!confirm(discharged ? 'আবার সক্রিয় করবেন?' : `"${student.name}" কে অব্যাহতি দেবেন?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'ব্যর্থ হয়েছে।');
      await load();
      await invalidateStudents(student!.academicYear ? Number(student!.academicYear) : new Date().getFullYear());
    } catch (err: any) { alert(err.message); } finally { setBusy(false); }
  }

  async function deleteStudent() {
    if (!student) return;
    if (!confirm(`"${student.name}" কে স্থায়ীভাবে মুছে ফেলবেন? এটি ফেরানো যাবে না।`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'মুছতে ব্যর্থ।');
      await invalidateStudents(student!.academicYear ? Number(student!.academicYear) : new Date().getFullYear());
      router.push('/');
    } catch (err: any) { alert(err.message); setBusy(false); }
  }

  async function deletePayment(p: Payment) {
    if (!confirm(`${p.paidOn} তারিখের ${money(p.amount)} পেমেন্ট মুছে ফেলবেন?`)) return;
    setDeletingPayment(p.id);
    try {
      const res = await fetch(`/api/payments/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('মুছতে ব্যর্থ হয়েছে।');
      await load();
    } catch (err: any) { alert(err.message); } finally { setDeletingPayment(null); }
  }

  const discharged = student?.status === 'অব্যাহতি প্রাপ্ত';

  return (
    <>
      <div className="breadcrumbs" style={{ marginTop: 14 }}>
        <Link href="/" className="bc-btn">🏠 হোম</Link>
        {/* Go to the class list directly — router.back() could land on the edit page we came through. */}
        <button
          className="bc-btn"
          onClick={() =>
            router.push(
              student
                ? `/students?class=${encodeURIComponent(student.class.replace(/ \(HM\)$/, ''))}&year=${student.academicYear || new Date().getFullYear()}`
                : '/students'
            )
          }
        >← তালিকা</button>
      </div>

      {error && (isSetupError(error)
        ? <BackendNotice error={error} onRetry={load} />
        : <div className="error">{error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button></div>
      )}

      {!student && !error && (
        <div className="card">
          <div className="skeleton" style={{ height: 28, width: '50%' }} />
          <div className="skeleton" style={{ height: 14, width: '70%', marginTop: 10 }} />
        </div>
      )}

      {student && (
        <>
          <div className="detail-actions">
            {refreshing && <span className="refresh-dot" title="আপডেট হচ্ছে…" />}
            <button className="pill-btn brand" onClick={() => setVoucher(true)}>📄 ভাউচার (JPG/PDF)</button>
            <Link href={`/students/${id}/edit`} className="pill-btn amber">✏️ এডিট</Link>
            <button className="pill-btn gray" onClick={toggleStatus} disabled={busy}>
              {discharged ? '↩ পুনরায় সক্রিয়' : 'অব্যাহতি'}
            </button>
            <button className="pill-btn red" onClick={deleteStudent} disabled={busy}>🗑 ডিলিট</button>
          </div>

          <div className="detail-head">
            <div>
              <div className="dh-name">{student.name}</div>
              <div className="dh-tags">
                <span className="tag-pill">
                  {student.class}{student.section ? ` | শাখা: ${student.section}` : ''}{student.roll ? ` | রোল: ${student.roll}` : ''}
                </span>
                <span className={`badge ${discharged ? 'inactive' : 'active'}`}>{student.status || 'সক্রিয়'}</span>
                {student.academicYear && <span className="tag-dark">{student.academicYear} সাল</span>}
              </div>
              <div className="dh-subjects">বিষয়: {student.subjects || 'সাধারণ গণিত'}</div>
            </div>
            {student.phone && (
              <a href={`tel:${student.phone}`} className="pill-btn green">📞 {student.phone}</a>
            )}
          </div>

          <div className="stat-card plain wide">
            <div className="sc-k">শুরু</div>
            <div className="sc-v">{formatDate(student.startDate)}</div>
          </div>
          <div className="stat-duo">
            <div className="stat-card mint">
              <div className="sc-k">মোট আদায়</div>
              <div className="sc-v">{money(student.totalPaid)}</div>
            </div>
            <div className="stat-card rose">
              <div className="sc-k">বকেয়া</div>
              <div className="sc-v">{money(Math.max(0, student.due))}</div>
            </div>
          </div>

          <PaymentForm
            studentId={student.id}
            monthlyFee={student.monthlyFee}
            monthFees={student.monthFees}
            paidMonths={student.payments.map((p) => p.monthName).filter(Boolean)}
            startDate={student.startDate}
            onSuccess={refresh}
            onOptimistic={addOptimistic}
            onRollback={rollback}
          />

          <div className="section-head"><h2 style={{ fontSize: 17 }}>পূর্বে টাকা জমার বিস্তারিত তালিকা:</h2></div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th className="center">#</th>
                  <th>মাসের নাম</th>
                  <th className="num">মাসিক বেতন (৳)</th>
                  <th>আদায়ের তারিখ</th>
                  <th className="num">আদায়কৃত টাকা (৳)</th>
                  <th className="center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {[...student.payments, ...pendingPayments].map((p, i) => {
                  const isPending = p.id.startsWith('pending-');
                  return (
                    <tr key={p.id ?? i} className={isPending ? 'row-pending' : ''}>
                      <td className="center">{i + 1}</td>
                      <td>{p.monthName || '—'}{isPending && <span className="saving-badge">সংরক্ষণ হচ্ছে…</span>}</td>
                      <td className="num">{p.targetFee ? money(p.targetFee) : '—'}</td>
                      <td>{formatDate(p.paidOn)}</td>
                      <td className="num">{money(p.amount)}</td>
                      <td className="center">
                        {!isPending && (
                          <button className="cell-btn" style={{ background: '#ef4444' }} disabled={deletingPayment === p.id} onClick={() => deletePayment(p)}>🗑</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {student.payments.length === 0 && pendingPayments.length === 0 && (
                  <tr><td colSpan={6} className="center muted">কোনো ডাটা নেই</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {voucher && <VoucherModal student={student} onClose={() => setVoucher(false)} />}
        </>
      )}
    </>
  );
}
