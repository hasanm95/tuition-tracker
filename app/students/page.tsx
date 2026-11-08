'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { Student } from '@/lib/types';
import { isSetupError } from '@/lib/errors';
import { useYear } from '@/app/providers';
import { BN_MONTHS } from '@/lib/config';
import ListSkeleton from '@/components/ListSkeleton';
import BackendNotice from '@/components/BackendNotice';

function StudentsInner() {
  const { year } = useYear();
  const searchParams = useSearchParams();
  const classFilter = searchParams.get('class') ?? '';
  const yearParam = searchParams.get('year');
  const effYear = yearParam ? Number(yearParam) : year;

  const [all, setAll] = useState<Student[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const tab: 'students' | 'exam' = searchParams.get('tab') === 'exam' ? 'exam' : 'students';
  const setTab = (t: 'students' | 'exam') => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', t);
    if (t !== 'exam') { p.delete('ed'); p.delete('et'); }
    router.replace(`${pathname}?${p.toString()}`);
  };

  // search + filters
  const [q, setQ] = useState('');
  const [section, setSection] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  // modals
  const [feeModal, setFeeModal] = useState(false);
  const [examModal, setExamModal] = useState(false);
  const [examReload, setExamReload] = useState(0);

  async function load() {
    setError(null);
    setAll(null);
    try {
      const res = await fetch(`/api/students?year=${effYear}`, { cache: 'no-store' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'শিক্ষার্থী লোড করা যায়নি।');
      }
      setAll(await res.json());
    } catch (err: any) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, [effYear]);

  // students of this class
  const classStudents = useMemo(
    () => (all ?? []).filter((s) => !classFilter || s.class === classFilter),
    [all, classFilter]
  );

  const sections = useMemo(() => {
    const set = new Set<string>();
    classStudents.forEach((s) => s.section && set.add(s.section));
    return Array.from(set).sort();
  }, [classStudents]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return classStudents.filter((s) => {
      if (section !== 'all' && s.section !== section) return false;
      if (status === 'active' && s.status === 'অব্যাহতি প্রাপ্ত') return false;
      if (status === 'inactive' && s.status !== 'অব্যাহতি প্রাপ্ত') return false;
      if (needle) {
        const hay = `${s.name} ${s.roll}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [classStudents, q, section, status]);

  const notConnected = isSetupError(error);

  return (
    <>
      <div className="breadcrumbs">
        <Link href="/" className="bc-btn">🏠 হোম</Link>
      </div>

      <div className="section-head">
        <h1>{classFilter || 'শিক্ষার্থী'} <span className="accent">({effYear} সাল)</span></h1>
        <button className="pill-btn amber" onClick={() => setFeeModal(true)}>
          🗓 নির্দিষ্ট মাসের বেতন পরিবর্তন / ছুটি
        </button>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'students' ? 'active' : ''}`} onClick={() => setTab('students')}>
          👥 শিক্ষার্থী তালিকা
        </button>
        <button className={`tab-btn ${tab === 'exam' ? 'active' : ''}`} onClick={() => setTab('exam')}>
          📋 পরীক্ষার রেকর্ড
        </button>
      </div>

      {notConnected && <BackendNotice error={error} onRetry={load} />}
      {error && !notConnected && (
        <div className="error">{error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button></div>
      )}

      {tab === 'students' && !error && (
        <>
          <div className="filter-bar">
            <input
              className="search"
              placeholder="🔍 নাম বা রোল দিয়ে খুঁজুন…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ margin: 0 }}
            />
            <select value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="all">সব শাখা</option>
              {sections.map((s) => <option key={s} value={s}>শাখা: {s}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="all">সব স্ট্যাটাস</option>
              <option value="active">সক্রিয়</option>
              <option value="inactive">অব্যাহতি প্রাপ্ত</option>
            </select>
          </div>

          {all === null && <ListSkeleton />}

          {all !== null && (
            <div className="hl" style={{ margin: '0 0 10px' }}>{shown.length} জন শিক্ষার্থী</div>
          )}

          <div className="stack">
            {shown.map((s) => (
              <Link key={s.id} href={`/students/${s.id}`}>
                <div className="card student-row">
                  <div>
                    <div className="name">
                      {s.name}{' '}
                      {s.isFree && <span className="badge free" style={{ fontSize: 11 }}>বিনা বেতনে</span>}
                    </div>
                    <div className="meta">রোল: {s.roll} | শাখা: {s.section || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {s.due > 0 && <span className="badge due">বকেয়া {Math.round(s.due)}</span>}
                    <span className={`badge ${s.status === 'অব্যাহতি প্রাপ্ত' ? 'inactive' : 'active'}`}>
                      {s.status || 'সক্রিয়'}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>›</span>
                  </div>
                </div>
              </Link>
            ))}
            {all !== null && shown.length === 0 && (
              <div className="card center muted">কোনো শিক্ষার্থী মিলেনি।</div>
            )}
          </div>
        </>
      )}

      {tab === 'exam' && (
        <ExamTab year={effYear} cls={classFilter} onNew={() => setExamModal(true)} reload={examReload} />
      )}

      {feeModal && (
        <FeeModal year={effYear} cls={classFilter} onClose={() => setFeeModal(false)} />
      )}

      {examModal && (
        <ExamModal
          year={effYear}
          cls={classFilter}
          students={classStudents}
          onClose={() => { setExamModal(false); setExamReload((x) => x + 1); }}
        />
      )}
    </>
  );
}

/* ── Exam tab (pick an exam by name/date) ─────────────────────── */
interface ExamItem { date: string; title: string; totalMarks: number }
function ExamTab({ year, cls, onNew, reload }: { year: number; cls: string; onNew: () => void; reload: number }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const edParam = searchParams.get('ed') || '';
  const etParam = searchParams.get('et') || '';

  const [exams, setExams] = useState<ExamItem[] | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Load the exam list for this class/year.
  useEffect(() => {
    let active = true;
    setExams(null); setErr(null);
    fetch(`/api/exam?list=1&year=${year}&class=${encodeURIComponent(cls)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'লোড ব্যর্থ');
        return res.json();
      })
      .then((list) => { if (active) setExams(list); })
      .catch((e) => { if (active) setErr(e.message); });
    return () => { active = false; };
  }, [year, cls, reload]);

  // Selected exam comes from the URL (?ed=date&et=title) — shareable/bookmarkable.
  const sel = exams ? exams.findIndex((ex) => ex.date === edParam && ex.title === etParam) : -1;

  useEffect(() => {
    if (!exams || !edParam || !etParam) { setResult(null); return; }
    let active = true;
    setLoading(true); setErr(null); setResult(null);
    fetch(`/api/exam?year=${year}&class=${encodeURIComponent(cls)}&date=${encodeURIComponent(edParam)}&title=${encodeURIComponent(etParam)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'লোড ব্যর্থ');
        return res.json();
      })
      .then((r) => { if (active) setResult(r); })
      .catch((e) => { if (active) setErr(e.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [exams, edParam, etParam, year, cls]);

  function onSelect(idx: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set('tab', 'exam');
    if (idx === '' || !exams) { p.delete('ed'); p.delete('et'); }
    else { const ex = exams[Number(idx)]; p.set('ed', ex.date); p.set('et', ex.title); }
    router.replace(`${pathname}?${p.toString()}`);
  }

  const rows = result ? [...(result.sectionA || []), ...(result.sectionB || [])] : [];

  return (
    <>
      <div className="date-bar">
        <label>পরীক্ষা:</label>
        <select value={sel >= 0 ? String(sel) : ''} onChange={(e) => onSelect(e.target.value)} disabled={!exams || exams.length === 0}>
          <option value="">{exams ? (exams.length ? 'পরীক্ষা নির্বাচন করুন' : 'কোনো পরীক্ষা নেই') : 'লোড হচ্ছে…'}</option>
          {exams?.map((ex, i) => (
            <option key={i} value={i}>{ex.date} — {ex.title} (পূর্ণমান: {ex.totalMarks})</option>
          ))}
        </select>
        <button className="btn" style={{ width: 'auto' }} onClick={onNew}>➕ নতুন পরীক্ষার নম্বর এন্ট্রি</button>
      </div>
      {loading && <div className="hl">লোড হচ্ছে…</div>}
      {err && <div className="error">{err}</div>}
      {result && (
        <>
          <div className="section-head">
            <h2 style={{ fontSize: 16 }}>{result.examTitle} <span className="muted">({result.examDate})</span></h2>
          </div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th className="center">শাখা</th><th className="num">রোল</th><th>নাম</th><th className="num">প্রাপ্ত</th><th className="num">পূর্ণমান</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <td className="center">{r.section}</td>
                    <td className="num">{r.roll}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.isAbsent ? 'অনুপস্থিত' : r.obtainedMarks}</td>
                    <td className="num">{r.totalMarks}</td>
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={5} className="center muted">কোনো রেকর্ড নেই।</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

/* ── Fee-change modal ─────────────────────────────────────────── */
function FeeModal({ year, cls, onClose }: { year: number; cls: string; onClose: () => void }) {
  const [month, setMonth] = useState(BN_MONTHS[new Date().getMonth()]);
  const [holiday, setHoliday] = useState(false);
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      const res = await fetch('/api/class-fee', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, class: cls, monthName: month, fee: holiday ? 0 : Number(fee || 0) }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'সংরক্ষণ ব্যর্থ');
      setMsg('✅ সংরক্ষিত হয়েছে!');
      setTimeout(onClose, 700);
    } catch (e: any) { setMsg('⚠ ' + e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head amber">
          মাসের বেতন পরিবর্তন / ছুটি
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="hl" style={{ marginBottom: 10 }}>ক্লাস: <span className="accent">{cls} ({year} সাল)</span></div>
          <label>কোন মাসের বেতন পরিবর্তন?</label>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {BN_MONTHS.map((m) => <option key={m}>{m}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={holiday} onChange={(e) => setHoliday(e.target.checked)} />
            এই মাস পড়ানো হয় নাই (বেতন ০)
          </label>
          {!holiday && (
            <>
              <label>ঐ মাসের ধার্য বেতন (৳):</label>
              <input type="number" placeholder="যেমন: ২০০" value={fee} onChange={(e) => setFee(e.target.value)} />
            </>
          )}
          {msg && <div className="hl" style={{ marginTop: 10 }}>{msg}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : 'ধার্য করুন'}</button>
        </div>
      </div>
    </div>
  );
}

/* ── Exam-entry modal ─────────────────────────────────────────── */
function ExamModal({ year, cls, students, onClose }: { year: number; cls: string; students: Student[]; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const sorted = [...students].sort((a, b) => Number(a.roll) - Number(b.roll));

  async function save() {
    if (!title.trim() || !total) { setMsg('⚠ পরীক্ষার নাম ও মোট নম্বর দিন।'); return; }
    setBusy(true); setMsg(null);
    try {
      const marksList = sorted.map((s) => ({
        studentId: s.id, roll: s.roll, name: s.name, section: s.section,
        obtainedMarks: marks[s.id] === undefined || marks[s.id] === '' ? '' : Number(marks[s.id]),
      }));
      const res = await fetch('/api/exam', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academicYear: String(year), class: cls,
          examDate: date,
          examTitle: title.trim(), totalMarks: Number(total), marksList,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'সংরক্ষণ ব্যর্থ');
      setMsg('✅ সংরক্ষিত হয়েছে!');
      setTimeout(onClose, 700);
    } catch (e: any) { setMsg('⚠ ' + e.message); } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head brand">
          নতুন পরীক্ষার নম্বর এন্ট্রি
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="inline-fields">
            <div><label>তারিখ *</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><label>পরীক্ষার নাম *</label><input placeholder="যেমন: মডেল টেস্ট-৩" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label>মোট নম্বর *</label><input type="number" placeholder="৫০" value={total} onChange={(e) => setTotal(e.target.value)} /></div>
          </div>
          <p style={{ color: 'var(--danger)', fontSize: 13, margin: '14px 0 10px' }}>
            * যে শিক্ষার্থী পরীক্ষা দেয়নি তার নম্বর দেওয়ার ঘরটি ফাঁকা রাখুন।
          </p>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th className="center">শাখা</th><th className="num">রোল</th><th>নাম</th><th className="center">প্রাপ্ত নম্বর</th></tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr key={s.id}>
                    <td className="center"><span className="badge active">{s.section || '—'}</span></td>
                    <td className="num">{s.roll}</td>
                    <td>{s.name}</td>
                    <td className="center">
                      <input type="number" placeholder="ফাঁকা = দেয়নি" style={{ maxWidth: 160, margin: '0 auto' }}
                        value={marks[s.id] ?? ''} onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))} />
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && <tr><td colSpan={4} className="center muted">এই ক্লাসে শিক্ষার্থী নেই।</td></tr>}
              </tbody>
            </table>
          </div>
          {msg && <div className="hl" style={{ marginTop: 8 }}>{msg}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={save} disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : 'ফলাফল সংরক্ষণ করুন'}</button>
        </div>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="card center muted">লোড হচ্ছে…</div>}>
      <StudentsInner />
    </Suspense>
  );
}
