import { NextRequest, NextResponse } from 'next/server';
import { mutate } from '@/lib/appsScript';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = await mutate<{ message: string }>('setClassMonthFee', body);
    return NextResponse.json({ message: data.message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
