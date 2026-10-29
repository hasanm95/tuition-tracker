'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useYear } from '@/app/providers';

const YEARS = [2024, 2025, 2026, 2027, 2028];

export default function BnNavBar() {
  const { year, setYear } = useYear();
  const pathname = usePathname();

  // The dashboard chrome is for signed-in app pages only. The sign-in and
  // setup screens are shown to unauthenticated visitors and have their own
  // standalone layout, so the nav must not render there.
  if (pathname === '/signin' || pathname === '/setup') return null;

  const isHome = pathname === '/';
  const isDaily = pathname === '/daily';

  return (
    <header className="bn-header">
      <div className="bn-title">🎓 ড্যাশবোর্ড</div>
      <div className="bn-nav-row">
        <label className="bn-year-wrap">
          <span className="bn-year-icon">📅</span>
          <select
            className="bn-year-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>
                সাল: {y}
              </option>
            ))}
          </select>
          <span className="bn-year-arrow">▾</span>
        </label>
        <Link href="/" className={`bn-btn ${isHome ? 'bn-btn-active' : 'bn-btn-white'}`}>
          🏠 হোম
        </Link>
        <Link href="/daily" className={`bn-btn ${isDaily ? 'bn-btn-yellow' : 'bn-btn-yellow-out'}`}>
          📅 দৈনিক
        </Link>
      </div>
      <div className="bn-nav-row">
        <Link href="/students" className="bn-btn bn-btn-cyan">
          📈 রিপোর্ট
        </Link>
        <a href={`/api/export?year=${year}`} className="bn-btn bn-btn-dark" download>
          📊 এক্সেল
        </a>
        <Link href="/students/new" className="bn-btn bn-btn-green">
          👤+ ভর্তি
        </Link>
      </div>
    </header>
  );
}
