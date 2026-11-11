export interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
  roll: string;
  startDate: string;
  monthlyFee: number;
  phone: string;
  status: string;        // 'সক্রিয়' | 'অব্যাহতি প্রাপ্ত'
  dischargeDate: string;
  academicYear: string;
  isFree: boolean;
  totalPaid: number;
  due: number;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  studentSection?: string;
  amount: number;
  paidOn: string;
  monthName: string;
  targetFee: number;
  entryTime: string;
}

export interface StudentDetail extends Student {
  payments: Payment[];
  /** Effective fee per month name (override or base). Keyed by Bengali month. */
  monthFees?: Record<string, number>;
}

export interface StudentInput {
  name: string;
  class?: string;
  section?: string;
  roll?: string;
  startDate: string;
  monthlyFee: number;
  phone?: string;
  status?: string;
  academicYear?: string;
}

export interface PaymentInput {
  studentId: string;
  amount: number;
  paidOn?: string;
  monthName?: string;
  targetFee?: number;
}

export interface ExamMark {
  studentId: string;
  roll: string;
  name: string;
  section: string;
  isAbsent: boolean;
  obtainedMarks: number | '';
  totalMarks: number;
}

export interface ClassSummary {
  className: string;
  active: number;
  inactive: number;
}
