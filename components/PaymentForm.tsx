'use client';

import { useState } from 'react';

interface Props {
  studentId: string;
  onSuccess?: () => void;
}

export default function PaymentForm({ studentId, onSuccess }: Props) {
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
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
        body: JSON.stringify({ studentId, amount: Number(amount), paidOn }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'পেমেন্ট রেকর্ড করা যায়নি।');
      }
      setAmount('');
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
        <div className="row-gap">
          <div>
            <label htmlFor="pf-date">জমার তারিখ</label>
            <input
              id="pf-date"
              type="date"
              value={paidOn}
              onChange={(e) => setPaidOn(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="pf-amount">টাকার পরিমাণ (৳)</label>
            <input
              id="pf-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="যেমন: ১০০০"
            />
          </div>
        </div>
        <button
          className="btn"
          type="submit"
          disabled={saving}
          style={{ marginTop: 14, background: 'var(--ok)' }}
        >
          {saving ? 'সেভ হচ্ছে…' : 'জমা নিশ্চিত করুন'}
        </button>
      </form>
    </div>
  );
}
