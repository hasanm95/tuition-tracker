'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(Number(amount) > 0)) {
      setError('Enter an amount greater than 0.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, amount: Number(amount), paidOn, method, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not record payment.');
      }
      setAmount('');
      setNote('');
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        + Add payment
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      {error && <div className="error">{error}</div>}
      <div className="row-gap">
        <div>
          <label htmlFor="amount">Amount (৳)</label>
          <input
            id="amount"
            inputMode="numeric"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
        <div>
          <label htmlFor="paidOn">Paid on</label>
          <input id="paidOn" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
        </div>
      </div>
      <label htmlFor="method">Method</label>
      <select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
        <option value="cash">Cash</option>
        <option value="bkash">bKash</option>
        <option value="nagad">Nagad</option>
        <option value="rocket">Rocket</option>
        <option value="bank">Bank</option>
        <option value="other">Other</option>
      </select>
      <label htmlFor="note">Note (optional)</label>
      <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
      <div style={{ marginTop: 16 }} className="stack">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Record payment'}
        </button>
        <button type="button" className="btn secondary" onClick={() => setOpen(false)} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
