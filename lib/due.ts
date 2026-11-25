// Per-month dues for a student, for the due voucher and the class due list.
// Mirrors the backend withDue()/PaymentForm logic: dues run from the enrolment
// month to the current month of the academic year; a not-taught month (effective
// fee 0 for a fee-paying student) is skipped; a payment counts against the month
// it is FOR (monthName).
import { BN_MONTHS } from '@/lib/config';
import type { StudentDetail } from '@/lib/types';

export interface MonthDue {
  month: string;
  fee: number;
  paid: number;
  due: number;
}

export function duePerMonth(student: StudentDetail): MonthDue[] {
  const fee = Number(student.monthlyFee || 0);
  if (fee <= 0) return []; // free student — no dues

  const monthFees = student.monthFees || {};
  const feeFor = (m: string) => monthFees[m] ?? fee;

  const paidByMonth: Record<string, number> = {};
  student.payments.forEach((p) => {
    if (p.monthName) paidByMonth[p.monthName] = (paidByMonth[p.monthName] || 0) + Number(p.amount || 0);
  });

  const now = new Date();
  const ay = Number(student.academicYear) || now.getFullYear();
  const sd = student.startDate ? new Date(student.startDate) : null;
  // Continuing students (joined a previous year) are owed from January.
  const startIdx = sd && !isNaN(sd.getTime()) && sd.getFullYear() >= ay ? sd.getMonth() : 0;
  // Only charge up to the current month for the running year; a past year is full.
  const endIdx = ay < now.getFullYear() ? 11 : ay > now.getFullYear() ? startIdx : now.getMonth();

  const out: MonthDue[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const m = BN_MONTHS[i];
    const f = feeFor(m);
    if (f <= 0) continue; // not-taught / holiday month
    const paid = paidByMonth[m] || 0;
    if (f - paid > 0) out.push({ month: m, fee: f, paid, due: f - paid });
  }
  return out;
}
