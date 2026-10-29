export interface Student {
  id: string;
  name: string;
  roll: string;
  class: string;
  section: string;
  status: string;
  guardianPhone: string;
  monthlyFee: number;
  startDate: string;
  createdAt: string;
  monthsBilled: number;
  totalPaid: number;
  due: number;
  academicYear: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName?: string;
  studentClass?: string;
  studentSection?: string;
  amount: number;
  paidOn: string;
  method: string;
  note: string;
}

export interface StudentDetail extends Student {
  payments: Payment[];
}

export interface StudentInput {
  name: string;
  roll?: string;
  class?: string;
  section?: string;
  status?: string;
  guardianPhone?: string;
  monthlyFee: number;
  startDate: string;
  academicYear?: string;
}

export interface PaymentInput {
  studentId: string;
  amount: number;
  paidOn?: string;
  method?: string;
  note?: string;
}
