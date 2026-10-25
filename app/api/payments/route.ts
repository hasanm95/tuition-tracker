import { NextRequest, NextResponse } from 'next/server';
import { mutate } from '@/lib/appsScript';
import type { Payment, PaymentInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PaymentInput;
    if (!body.studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 });
    }
    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    const data = await mutate<{ payment: Payment }>('addPayment', { ...body });
    return NextResponse.json(data.payment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
