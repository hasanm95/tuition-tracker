'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useYear } from '@/app/providers';

const YEARS = [2024, 2025, 2026, 2027, 2028];

const TABS = [
  { href: '/', label: 'হোম', icon: '🏠', match: (p: string) => p === '/' },
  { href: '/daily', label: 'দৈনিক', icon: '📅', match: (p: string) => p === '/daily' },
  {
    href: '/students',
    label: 'রিপোর্ট',
    icon: '📋',
    match: (p: string) => p.startsWith('/students') && p !== '/students/new',
  },
  { href: '/students/new', label: 'ভর্তি', icon: '➕', match: (p: string) => p === '/students/new' },
];

export default function BnNavBar() {
  const { year, setYear } = useYear();
  const pathname = usePathname();

  // Standalone pages for unauthenticated visitors keep their own layout.
  if (pathname === '/signin' || pathname === '/setup') return null;

  return (
    <>
      <header className="bn-header">
        <div className="bn-head-row">
          <div className="bn-brand">
            <span className="bn-brand-logo">🎓</span>
            <span className="bn-brand-name">টিউশন ট্র্যাকার</span>
          </div>
          <div className="bn-head-actions">
            <label className="bn-year-wrap">
              <span className="bn-year-icon">📅</span>
              <select
                className="bn-year-select"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                aria-label="শিক্ষাবর্ষ"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <span className="bn-year-arrow">▾</span>
            </label>
            <a
              href={`/api/export?year=${year}`}
              className="bn-icon-btn"
              download
              title="এক্সেলে ডাউনলোড করুন"
              aria-label="এক্সেলে ডাউনলোড করুন"
            >
              ⬇
            </a>
          </div>
        </div>
      </header>

      <nav className="bn-tabbar">
        {TABS.map((t) => {
          const active = t.match(pathname);
          return (
            <Link key={t.href} href={t.href} className={`bn-tab ${active ? 'active' : ''}`}>
              <span className="bn-tab-icon">{t.icon}</span>
              <span className="bn-tab-label">{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
