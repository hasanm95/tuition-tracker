export interface Student {
  id: string;
  name: string;
  roll: string;
  class: string;
  guardianPhone: string;
  monthlyFee: number;
  startDate: string;
  createdAt: string;
  monthsBilled: number;
  totalPaid: number;
  due: number;
}

export interface Payment {
  id: string;
  studentId: string;
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
  guardianPhone?: string;
  monthlyFee: number;
  startDate: string;
}

export interface PaymentInput {
  studentId: string;
  amount: number;
  paidOn?: string;
  method?: string;
  note?: string;
}
