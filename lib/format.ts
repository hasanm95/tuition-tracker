/** Format an amount as Bangladeshi Taka. Change the symbol/locale if needed. */
export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}৳${abs.toLocaleString('en-IN')}`;
}

/**
 * Format any date value as dd-mm-yyyy for receipts/tables.
 * Accepts ISO (2026-11-08T18:00:00.000Z), yyyy-mm-dd, or dd/mm/yyyy.
 */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  let s = typeof d === 'string' ? d : d.toISOString();
  s = s.trim().split('T')[0];
  const parts = s.includes('/') ? s.split('/') : s.split('-');
  if (parts.length === 3) {
    let dd: string, mm: string, yyyy: string;
    if (parts[0].length === 4) [yyyy, mm, dd] = parts;        // yyyy-mm-dd
    else if (parts[2].length === 4) [dd, mm, yyyy] = parts;   // dd-mm-yyyy
    else return s;
    return `${dd.padStart(2, '0')}-${mm.padStart(2, '0')}-${yyyy}`;
  }
  return s;
}

/** Today's date as yyyy-mm-dd in the user's LOCAL timezone (not UTC). */
export function todayLocal(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function dueLabel(due: number): string {
  if (due > 0) return 'owed';
  if (due < 0) return 'in advance';
  return 'all clear';
}
