'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { isSetupError } from '@/lib/errors';
import BackendNotice from '@/components/BackendNotice';

// Resize an uploaded image to a small transparent-friendly PNG data-URL so it
// fits comfortably under the backend's cell-size limit.
function resizeToDataUrl(file: File, maxW = 420, maxH = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width, maxH / img.height);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('ক্যানভাস তৈরি ব্যর্থ।'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('ছবিটি পড়া যায়নি।'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('ফাইল পড়া যায়নি।'));
    reader.readAsDataURL(file);
  });
}

export default function SettingsPage() {
  const [sig, setSig] = useState<string>('');
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // password change
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [confirmPhone, setConfirmPhone] = useState('');
  const [pBusy, setPBusy] = useState(false);
  const [pMsg, setPMsg] = useState<string | null>(null);
  const [pErr, setPErr] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/signature', { cache: 'no-store' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'লোড ব্যর্থ।');
      setSig((await res.json()).signature || '');
    } catch (err: any) { setError(err.message); }
  }
  useEffect(() => { load(); }, []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg(null); setError(null);
    try {
      const dataUrl = await resizeToDataUrl(file);
      setPreview(dataUrl);
    } catch (err: any) { setError(err.message); }
  }

  async function save() {
    if (!preview) return;
    setBusy(true); setMsg(null); setError(null);
    try {
      const res = await fetch('/api/signature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: preview }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'সংরক্ষণ ব্যর্থ।');
      setSig(preview); setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      setMsg('✅ স্বাক্ষর সংরক্ষিত হয়েছে!');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm('সংরক্ষিত স্বাক্ষর মুছে ফেলবেন?')) return;
    setBusy(true); setMsg(null); setError(null);
    try {
      const res = await fetch('/api/signature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: '' }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'মুছতে ব্যর্থ।');
      setSig(''); setPreview(null);
      setMsg('স্বাক্ষর মুছে ফেলা হয়েছে।');
    } catch (err: any) { setError(err.message); } finally { setBusy(false); }
  }

  async function changePass() {
    setPMsg(null); setPErr(null);
    if (newPass.trim().length < 4) { setPErr('পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন।'); return; }
    if (newPass.trim() !== newPass2.trim()) { setPErr('দুটি পাসওয়ার্ড মিলছে না।'); return; }
    if (!confirmPhone.trim()) { setPErr('পরিচালকের মোবাইল নম্বর (কনফারমেশন) দিন।'); return; }
    setPBusy(true);
    try {
      const res = await fetch('/api/password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: confirmPhone.trim(), newPass: newPass.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'পরিবর্তন ব্যর্থ।');
      setPMsg('✅ ' + (data.message || 'পাসওয়ার্ড পরিবর্তিত হয়েছে!'));
      setNewPass(''); setNewPass2(''); setConfirmPhone('');
    } catch (err: any) { setPErr(err.message); } finally { setPBusy(false); }
  }

  return (
    <>
      <div className="breadcrumbs" style={{ marginTop: 14 }}>
        <Link href="/" className="bc-btn">🏠 হোম</Link>
      </div>

      <div className="section-head">
        <h1>⚙️ সেটিংস</h1>
      </div>

      {isSetupError(error)
        ? <BackendNotice error={error!} onRetry={load} />
        : error && <div className="error">{error} <button className="btn ghost" onClick={load}>আবার চেষ্টা</button></div>}

      <div className="card">
        <div className="pay-section-title">✍️ পরিচালকের স্বাক্ষর</div>
        <p className="hl" style={{ margin: '0 0 12px', fontSize: 13 }}>
          স্বাক্ষরের ছবি আপলোড করুন — এটি ভাউচার ও পরীক্ষার ফলাফলে দেখা যাবে।
          স্বচ্ছ ব্যাকগ্রাউন্ডের (PNG) ছবি সবচেয়ে ভালো দেখায়।
        </p>

        {sig && !preview && (
          <div className="sig-current">
            <span className="hl" style={{ fontSize: 13 }}>বর্তমান স্বাক্ষর:</span>
            <img src={sig} alt="বর্তমান স্বাক্ষর" className="sig-img" />
          </div>
        )}

        {preview && (
          <div className="sig-current">
            <span className="hl" style={{ fontSize: 13 }}>নতুন (প্রিভিউ):</span>
            <img src={preview} alt="নতুন স্বাক্ষর প্রিভিউ" className="sig-img" />
          </div>
        )}

        <label className="hl" style={{ display: 'block', margin: '14px 0 6px', fontSize: 13 }}>ছবি নির্বাচন করুন:</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} />

        {msg && <div style={{ color: 'var(--ok)', background: 'var(--ok-bg)', padding: '10px 14px', borderRadius: 10, margin: '12px 0', fontSize: 14 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn" onClick={save} disabled={busy || !preview} style={{ width: 'auto', background: 'var(--ok)' }}>
            {busy ? 'সেভ হচ্ছে…' : 'স্বাক্ষর সংরক্ষণ করুন'}
          </button>
          {sig && (
            <button className="btn" onClick={remove} disabled={busy} style={{ width: 'auto', background: '#ef4444' }}>
              🗑 স্বাক্ষর মুছুন
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="pay-section-title">🔒 পাসওয়ার্ড পরিবর্তন</div>
        <p className="hl" style={{ margin: '0 0 12px', fontSize: 13 }}>
          পাসওয়ার্ড পরিবর্তন করতে পরিচালকের মোবাইল নম্বর (কনফারমেশন) দিতে হবে।
          সঠিক নম্বর না হলে পরিবর্তন হবে না।
        </p>

        {pErr && <div className="error">{pErr}</div>}
        {pMsg && <div style={{ color: 'var(--ok)', background: 'var(--ok-bg)', padding: '10px 14px', borderRadius: 10, margin: '0 0 12px', fontSize: 14 }}>{pMsg}</div>}

        <label className="hl" style={{ display: 'block', margin: '4px 0 6px', fontSize: 13 }}>নতুন পাসওয়ার্ড</label>
        <input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="কমপক্ষে ৪ অক্ষর" autoComplete="new-password" />

        <label className="hl" style={{ display: 'block', margin: '12px 0 6px', fontSize: 13 }}>নতুন পাসওয়ার্ড (আবার)</label>
        <input type="password" value={newPass2} onChange={(e) => setNewPass2(e.target.value)} placeholder="আবার লিখুন" autoComplete="new-password" />

        <label className="hl" style={{ display: 'block', margin: '12px 0 6px', fontSize: 13 }}>পরিচালকের মোবাইল নম্বর (কনফারমেশন)</label>
        <input inputMode="tel" value={confirmPhone} onChange={(e) => setConfirmPhone(e.target.value)} placeholder="যেমন: 01812665475" autoComplete="off" />

        <button className="btn" onClick={changePass} disabled={pBusy} style={{ marginTop: 16, width: 'auto' }}>
          {pBusy ? 'পরিবর্তন হচ্ছে…' : 'পাসওয়ার্ড পরিবর্তন করুন'}
        </button>
      </div>
    </>
  );
}
