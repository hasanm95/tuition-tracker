/** Format an amount as Bangladeshi Taka. Change the symbol/locale if needed. */
export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(Math.round(n));
  return `${sign}৳${abs.toLocaleString('en-IN')}`;
}

export function dueLabel(due: number): string {
  if (due > 0) return 'owed';
  if (due < 0) return 'in advance';
  return 'all clear';
}
