'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Student } from '@/lib/types';
import { isSetupError } from '@/lib/errors';
import { todayLocal } from '@/lib/format';
import BackendNotice from '@/components/BackendNotice';

interface Props {
  student?: Student;
}

const CLASS_OPTIONS = ['৬ষ্ঠ', '৭ম', '৮ম', '৯ম', '৯ম বিজ্ঞান', '১০ম', '১০ম বিজ্ঞান', 'পরীক্ষার্থী', 'পরীক্ষার্থী বিজ্ঞান'];
const SECTION_OPTIONS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ'];
const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function StudentForm({ student }: Props) {
  const router = useRouter();
  const editing = !!student;
  const defaultYear = student?.academicYear
    ? Number(student.academicYear)
    : new Date().getFullYear();

  const [form, setForm] = useState({
    name: student?.name ?? '',
    class: student?.class ?? '',
    section: student?.section ?? '',
    roll: student?.roll ?? '',
    startDate: student?.startDate ?? todayLocal(),
    monthlyFee: student?.monthlyFee != null ? String(student.monthlyFee) : '',
    phone: student?.phone ?? '',
    status: student?.status ?? 'সক্রিয়',
    academicYear: String(defaultYear),
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
      setError('নাম আবশ্যক।');
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
        throw new Error(data.error || 'সেভ করা যায়নি। আবার চেষ্টা করুন।');
      }
      const saved = await res.json();
      router.push(editing ? `/students/${student!.id}` : `/students/${saved.id}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (isSetupError(error)) {
    return <BackendNotice error={error} />;
  }

  return (
    <form onSubmit={submit} className="card">
      {error && <div className="error">{error}</div>}

      <label htmlFor="name">নাম *</label>
      <input
        id="name"
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder="শিক্ষার্থীর পুরো নাম"
        autoFocus
      />

      <div className="row-gap">
        <div>
          <label htmlFor="class">শ্রেণী</label>
          <select
            id="class"
            value={form.class}
            onChange={(e) => set('class', e.target.value)}
          >
            <option value="">-- শ্রেণী বেছে নিন --</option>
            {CLASS_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="section">শাখা</label>
          <select
            id="section"
            value={form.section}
            onChange={(e) => set('section', e.target.value)}
          >
            <option value="">-- শাখা --</option>
            {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="row-gap">
        <div>
          <label htmlFor="roll">রোল</label>
          <input
            id="roll"
            inputMode="numeric"
            value={form.roll}
            onChange={(e) => set('roll', e.target.value)}
            placeholder="যেমন: 5"
          />
        </div>
        <div>
          <label htmlFor="academicYear">শিক্ষাবর্ষ</label>
          <select
            id="academicYear"
            value={form.academicYear}
            onChange={(e) => set('academicYear', e.target.value)}
          >
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <label htmlFor="phone">মোবাইল নম্বর</label>
      <input
        id="phone"
        type="tel"
        inputMode="tel"
        value={form.phone}
        onChange={(e) => set('phone', e.target.value)}
        placeholder="+8801XXXXXXXXX"
      />

      <div className="row-gap">
        <div>
          <label htmlFor="fee">মাসিক ফি (৳)</label>
          <input
            id="fee"
            inputMode="numeric"
            value={form.monthlyFee}
            onChange={(e) => set('monthlyFee', e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="যেমন: 600"
          />
        </div>
        <div>
          <label htmlFor="start">শুরুর তারিখ</label>
          <input
            id="start"
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
      </div>

      <label htmlFor="status">অবস্থা</label>
      <select id="status" value={form.status} onChange={(e) => set('status', e.target.value)}>
        <option value="সক্রিয়">সক্রিয়</option>
        <option value="অব্যাহতি প্রাপ্ত">অব্যাহতি প্রাপ্ত</option>
      </select>

      <div style={{ marginTop: 20 }} className="stack">
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'সেভ হচ্ছে…' : editing ? 'পরিবর্তন সেভ করুন' : 'ভর্তি নিশ্চিত করুন'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => router.back()}
          disabled={saving}
        >
          বাতিল
        </button>
      </div>
    </form>
  );
}
