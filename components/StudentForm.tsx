'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Student } from '@/lib/types';

interface Props {
  student?: Student; // present => edit mode
}

export default function StudentForm({ student }: Props) {
  const router = useRouter();
  const editing = !!student;
  const [form, setForm] = useState({
    name: student?.name ?? '',
    roll: student?.roll ?? '',
    class: student?.class ?? '',
    guardianPhone: student?.guardianPhone ?? '',
    monthlyFee: student?.monthlyFee != null ? String(student.monthlyFee) : '',
    startDate: student?.startDate ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, monthlyFee: Number(form.monthlyFee || 0) };
      const res = await fetch(
        editing ? `/api/students/${student!.id}` : '/api/students',
        {
          method: editing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not save. Please try again.');
      }
      const saved = await res.json();
      router.push(editing ? `/students/${student!.id}` : `/students/${saved.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      {error && <div className="error">{error}</div>}

      <label htmlFor="name">Name *</label>
      <input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />

      <div className="row-gap">
        <div>
          <label htmlFor="roll">Roll</label>
          <input id="roll" value={form.roll} onChange={(e) => set('roll', e.target.value)} />
        </div>
        <div>
          <label htmlFor="class">Class</label>
          <input id="class" value={form.class} onChange={(e) => set('class', e.target.value)} />
        </div>
      </div>

      <label htmlFor="phone">Guardian phone</label>
      <input
        id="phone"
        inputMode="tel"
        value={form.guardianPhone}
        onChange={(e) => set('guardianPhone', e.target.value)}
      />

      <div className="row-gap">
        <div>
          <label htmlFor="fee">Monthly fee (৳)</label>
          <input
            id="fee"
            inputMode="numeric"
            value={form.monthlyFee}
            onChange={(e) => set('monthlyFee', e.target.value.replace(/[^0-9]/g, ''))}
          />
        </div>
        <div>
          <label htmlFor="start">Start date</label>
          <input id="start" type="date" value={form.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </div>
      </div>

      <div style={{ marginTop: 20 }} className="stack">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : editing ? 'Save changes' : 'Add student'}
        </button>
        <button type="button" className="btn secondary" onClick={() => router.back()} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
