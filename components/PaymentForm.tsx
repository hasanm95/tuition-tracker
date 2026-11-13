'use client';

import { useState } from 'react';
import { todayLocal } from '@/lib/format';

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

interface Props {
  studentId: string;
  monthlyFee?: number;
  /** Effective fee per month name (class/month override, else base fee). */
  monthFees?: Record<string, number>;
  /** Month names already paid — used to default to the first unpaid month. */
  paidMonths?: string[];
  /** Student's enrolment date (yyyy-mm-dd); dues start from this month. */
  startDate?: string;
  onSuccess?: () => void;
}

export default function PaymentForm({ studentId, monthlyFee, monthFees, paidMonths, startDate, onSuccess }: Props) {
  // Effective fee for a given month: override if set, else base monthly fee.
  const feeFor = (m: string) => monthFees?.[m] ?? monthlyFee ?? 0;

  // A month the class was not taught (fee set to 0 for a fee-paying student) is
  // a holiday — skip it when choosing the default month.
  const isHoliday = (m: string) => (monthlyFee ?? 0) > 0 && feeFor(m) === 0;

  // Default to the FIRST unpaid, non-holiday month counting from the enrolment
  // month — dues begin at the start month, so e.g. a student who joined in
  // August and has paid nothing should see আগস্ট, not the current calendar
  // month, and any "না পড়ানো" month in between is skipped.
  function nextUnpaidMonth(): string {
    const paid = new Set(paidMonths || []);
    const startIdx = startDate ? new Date(startDate).getMonth() : 0;
    for (let i = startIdx; i < 12; i++) {
      const m = BN_MONTHS[i];
      if (!paid.has(m) && !isHoliday(m)) return m;
    }
    // Fallback: first unpaid month ignoring holidays, else the last month.
    for (let i = startIdx; i < 12; i++) {
      if (!paid.has(BN_MONTHS[i])) return BN_MONTHS[i];
    }
    return BN_MONTHS[11];
  }

  const initialMonth = nextUnpaidMonth();
  const initialFee = feeFor(initialMonth);
  const feeStr = (f: number) => (f ? String(f) : '');

  const [amount, setAmount] = useState(feeStr(initialFee));
  const [paidOn, setPaidOn] = useState(todayLocal());
  const [monthName, setMonthName] = useState(initialMonth);
  const [targetFee, setTargetFee] = useState(feeStr(initialFee));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // When the month changes, refill the fee + amount from that month's rate.
  function onMonthChange(m: string) {
    setMonthName(m);
    const f = feeStr(feeFor(m));
    setTargetFee(f);
    setAmount(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!(Number(amount) > 0)) {
      setError('পরিমাণ ০-এর বেশি দিন।');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          amount: Number(amount),
          paidOn,
          monthName,
          targetFee: Number(targetFee || amount),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'পেমেন্ট রেকর্ড করা যায়নি।');
      }
      // Advance to the next non-holiday month so the next deposit is pre-filled.
      const paidIdx = BN_MONTHS.indexOf(monthName);
      let next = (paidIdx + 1) % 12;
      while (next !== paidIdx && isHoliday(BN_MONTHS[next])) next = (next + 1) % 12;
      onMonthChange(BN_MONTHS[next]);
      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div className="pay-section-title">💵 নতুন ফি জমা নিন</div>
      {error && <div className="error">{error}</div>}
      {success && (
        <div style={{ color: 'var(--ok)', background: 'var(--ok-bg)', padding: '10px 14px', borderRadius: 10, marginBottom: 12, fontSize: 14 }}>
          ✅ পেমেন্ট সফলভাবে রেকর্ড হয়েছে!
        </div>
      )}
      <form onSubmit={submit}>
        <div className="inline-fields">
          <div>
            <label htmlFor="pf-month">মাসের নাম</label>
            <select id="pf-month" value={monthName} onChange={(e) => onMonthChange(e.target.value)}>
              {BN_MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="pf-target">মাসিক বেতন (৳)</label>
            <input
              id="pf-target"
              inputMode="numeric"
              value={targetFee}
              onChange={(e) => setTargetFee(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="যেমন: ৬০০"
            />
          </div>
          <div>
            <label htmlFor="pf-date">আদায়ের তারিখ</label>
            <input id="pf-date" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pf-amount">আদায়কৃত টাকা (৳)</label>
            <input
              id="pf-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="যেমন: ৬০০"
            />
          </div>
        </div>
        <button
          className="btn"
          type="submit"
          disabled={saving}
          style={{ marginTop: 16, background: 'var(--ok)', boxShadow: '0 8px 20px rgba(16,185,129,.26)' }}
        >
          {saving ? 'সেভ হচ্ছে…' : 'জমা নিশ্চিত করুন'}
        </button>
      </form>
    </div>
  );
}
