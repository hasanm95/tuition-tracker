/** Format an amount as Bangladeshi Taka. Change the symbol/locale if needed. */
export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}৳${abs.toLocaleString('en-IN')}`;
}

function parseDateParts(d: string | Date | null | undefined): { yyyy: string; mm: string; dd: string } | null {
  if (!d) return null;
  if (d instanceof Date) {
    if (isNaN(d.getTime())) return null;
    return {
      yyyy: String(d.getFullYear()),
      mm: String(d.getMonth() + 1).padStart(2, '0'),
      dd: String(d.getDate()).padStart(2, '0'),
    };
  }
  const s = d.trim();
  if (!s) return null;
  // ISO timestamps from Google Sheets Dates (e.g. 2026-09-30T18:00:00.000Z for Oct 1 +06:00)
  // must be converted to local time rather than slicing the UTC date prefix.
  if (s.includes('T')) {
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parseDateParts(parsed);
  }
  const datePart = s.split('T')[0];
  const parts = datePart.includes('/') ? datePart.split('/') : datePart.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return { yyyy: parts[0], mm: parts[1].padStart(2, '0'), dd: parts[2].padStart(2, '0') };
    if (parts[2].length === 4) return { yyyy: parts[2], mm: parts[1].padStart(2, '0'), dd: parts[0].padStart(2, '0') };
  }
  return null;
}

/** Format any date value as dd-mm-yyyy in local time for receipts/tables. */
export function formatDate(d: string | Date | null | undefined): string {
  const p = parseDateParts(d);
  if (p) return `${p.dd}-${p.mm}-${p.yyyy}`;
  return typeof d === 'string' && d.trim() ? d.trim() : '—';
}

/** Normalize any date value as yyyy-mm-dd in local time for date inputs and math. */
export function toYmd(d: string | Date | null | undefined): string {
  const p = parseDateParts(d);
  return p ? `${p.yyyy}-${p.mm}-${p.dd}` : '';
}

/** Convert ASCII digits in a string to Bengali numerals (০-৯). */
export function toBnDigits(s: string | number): string {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(s).replace(/[0-9]/g, (d) => bn[+d]);
}

/** Date as Bengali-numeral d/m/yyyy (e.g. ৮/১১/২০২৬) for sheet footers. */
export function formatDateBnSlash(d: string | Date | null | undefined): string {
  const s = formatDate(d); // dd-mm-yyyy
  if (!s || s === '—' || !s.includes('-')) return s;
  const [dd, mm, yyyy] = s.split('-');
  return toBnDigits(`${Number(dd)}/${Number(mm)}/${yyyy}`);
}

/** Today's date as yyyy-mm-dd in the user's LOCAL timezone (not UTC). */
export function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

const HM_RE = / \(HM\)$/;
/** Class name without the legacy " (HM)" higher-math suffix. */
export function baseClass(cls: string): string {
  return (cls || '').replace(HM_RE, '').trim();
}
/** A student's subject: the subjects field, else inferred from a legacy (HM) class. */
export function subjectOf(s: { class?: string; subjects?: string }): string {
  const sub = (s.subjects || '').trim();
  if (sub) return sub;
  return HM_RE.test(s.class || '') ? 'উচ্চতর গণিত' : 'সাধারণ গণিত';
}

export function dueLabel(due: number): string {
  if (due > 0) return 'owed';
  if (due < 0) return 'in advance';
  return 'all clear';
}
