import { NextRequest, NextResponse } from 'next/server';
import { query, mutate } from '@/lib/appsScript';
import type { Payment, PaymentInput } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get('date') ?? undefined;
    const year = req.nextUrl.searchParams.get('year') ?? undefined;
    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (year) params.year = year;
    const data = await query<{ payments: Payment[] }>('listPayments', params);
    return NextResponse.json(data.payments);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PaymentInput;
    if (!body.studentId) {
      return NextResponse.json({ error: 'studentId আবশ্যক' }, { status: 400 });
    }
    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'পরিমাণ ০-এর বেশি হতে হবে' }, { status: 400 });
    }
    const data = await mutate<{ payment: Payment }>('addPayment', { ...body });
    return NextResponse.json(data.payment, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
