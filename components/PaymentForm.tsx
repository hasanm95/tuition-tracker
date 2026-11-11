'use client';

import { useState } from 'react';

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

interface Props {
  studentId: string;
  monthlyFee?: number;
  /** Effective fee per month name (class/month override, else base fee). */
  monthFees?: Record<string, number>;
  /** Month names already paid — used to default to the next unpaid month. */
  paidMonths?: string[];
  onSuccess?: () => void;
}

export default function PaymentForm({ studentId, monthlyFee, monthFees, paidMonths, onSuccess }: Props) {
  // Effective fee for a given month: override if set, else base monthly fee.
  const feeFor = (m: string) => monthFees?.[m] ?? monthlyFee ?? 0;

  // Default to the month after the latest one already paid, so the box
  // auto-advances (e.g. after November is paid, it shows December).
  function nextUnpaidMonth(): string {
    if (paidMonths && paidMonths.length) {
      let maxIdx = -1;
      for (const pm of paidMonths) {
        const idx = BN_MONTHS.indexOf(pm);
        if (idx > maxIdx) maxIdx = idx;
      }
      if (maxIdx >= 0) return BN_MONTHS[(maxIdx + 1) % 12];
    }
    return BN_MONTHS[new Date().getMonth()];
  }

  const initialMonth = nextUnpaidMonth();
  const initialFee = feeFor(initialMonth);
  const feeStr = (f: number) => (f ? String(f) : '');

  const [amount, setAmount] = useState(feeStr(initialFee));
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
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
      // Advance to the next month so the next deposit is pre-filled.
      const paidIdx = BN_MONTHS.indexOf(monthName);
      onMonthChange(BN_MONTHS[(paidIdx + 1) % 12]);
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
