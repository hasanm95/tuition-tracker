'use client';

import { useState } from 'react';

const BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

interface Props {
  studentId: string;
  monthlyFee?: number;
  onSuccess?: () => void;
}

export default function PaymentForm({ studentId, monthlyFee, onSuccess }: Props) {
  const defaultMonth = BN_MONTHS[new Date().getMonth()];
  const [amount, setAmount] = useState(monthlyFee ? String(monthlyFee) : '');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [monthName, setMonthName] = useState(defaultMonth);
  const [targetFee, setTargetFee] = useState(monthlyFee ? String(monthlyFee) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setAmount(monthlyFee ? String(monthlyFee) : '');
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
            <select id="pf-month" value={monthName} onChange={(e) => setMonthName(e.target.value)}>
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
