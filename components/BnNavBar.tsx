'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useYear } from '@/app/providers';
import { COACHING_NAME } from '@/lib/config';

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function BnNavBar() {
  const { year, setYear } = useYear();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route changes.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Standalone pages for unauthenticated visitors keep their own layout.
  if (pathname === '/signin' || pathname === '/setup') return null;

  const is = (p: string) => (p === '/' ? pathname === '/' : pathname.startsWith(p));
  const sheetUrl = process.env.NEXT_PUBLIC_SHEET_URL;
  const close = () => setOpen(false);

  return (
    <header className="bn-header">
      <div className="bn-head-row">
        <div className="bn-brand">
          <span className="bn-brand-logo">🎓</span>
          <span className="bn-brand-name">{COACHING_NAME}</span>
        </div>
        <div className="bn-head-actions">
          <label className="bn-year-wrap">
            <span className="bn-year-icon">📅</span>
            <span style={{ fontSize: 12, color: 'var(--brand-dark)' }}>সাল:</span>
            <select
              className="bn-year-select"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              aria-label="শিক্ষাবর্ষ"
            >
              {YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <span className="bn-year-arrow">▾</span>
          </label>
          <button
            type="button"
            className="bn-hamburger"
            aria-label="মেনু"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>

      <nav className={`bn-navbtns ${open ? 'open' : ''}`}>
        <Link href="/" onClick={close} className={`bn-btn c-home ${is('/') ? 'active' : ''}`}>
          <span className="bn-btn-ic">🏠</span> হোম
        </Link>
        <Link href="/daily" onClick={close} className={`bn-btn c-daily ${is('/daily') ? 'active' : ''}`}>
          <span className="bn-btn-ic">📅</span> দৈনিক
        </Link>
        <Link href="/report" onClick={close} className={`bn-btn c-report ${is('/report') ? 'active' : ''}`}>
          <span className="bn-btn-ic">📈</span> রিপোর্ট
        </Link>
        <a href={`/api/export?year=${year}`} onClick={close} className="bn-btn c-excel" download>
          <span className="bn-btn-ic">📊</span> এক্সেল
        </a>
        {sheetUrl ? (
          <a href={sheetUrl} onClick={close} className="bn-btn c-sheet" target="_blank" rel="noreferrer">
            <span className="bn-btn-ic">📗</span> শীট
          </a>
        ) : (
          <button
            type="button"
            className="bn-btn c-sheet"
            onClick={() => alert('Google Sheet লিংক সেট করা নেই। .env ও Vercel-এ NEXT_PUBLIC_SHEET_URL যোগ করুন।')}
          >
            <span className="bn-btn-ic">📗</span> শীট
          </button>
        )}
        <Link href="/students/new" onClick={close} className={`bn-btn c-admit ${is('/students/new') ? 'active' : ''}`}>
          <span className="bn-btn-ic">➕</span> ভর্তি
        </Link>
        <Link href="/settings" onClick={close} className={`bn-btn c-settings ${is('/settings') ? 'active' : ''}`}>
          <span className="bn-btn-ic">⚙️</span> সেটিংস
        </Link>
        <button
          type="button"
          className="bn-btn c-out"
          onClick={() => signOut({ callbackUrl: '/signin' })}
          title="লগ আউট"
        >
          <span className="bn-btn-ic">⏻</span> <span className="bn-out-label">লগ আউট</span>
        </button>
      </nav>
    </header>
  );
}
